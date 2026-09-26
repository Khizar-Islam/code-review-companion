import { Router } from "express";
import { prisma } from "../lib/prisma";
import { parsePrUrl, fetchPullRequest, normalizeFileStatus, GitHubApiError } from "../lib/github";
import { reviewDiff, GeminiReviewError } from "../lib/gemini";

export const reviewsRouter = Router();

// Maps an AI-pass failure to the message saved as a failed review's summary.
// Gemini's raw error bodies are JSON dumps, so they're logged server-side
// instead of being shown to the user.
function toUserFacingMessage(err: unknown): string {
  const status = err instanceof GeminiReviewError ? err.status : undefined;
  const message = err instanceof Error ? err.message : "";

  if (status === 429) {
    return "Gemini daily quota exceeded — please try again after the quota resets.";
  }
  if (err instanceof GeminiReviewError && err.timedOut) {
    return "Gemini took too long to respond — please try again in a few minutes.";
  }
  if (status === 503 || /overloaded/i.test(message)) {
    return "Gemini is temporarily overloaded — please try again in a few minutes.";
  }
  return "Review failed due to an unexpected error. Please retry.";
}

// Runs the AI pass over a review's saved diff and records the outcome in
// place — "completed" with findings, or "failed" with the reason as its
// summary. Shared by create and retry so both save results the same way.
async function runAiReview(reviewId: string, files: { filePath: string; patch: string | null }[]) {
  try {
    const { overallSummary, findings } = await reviewDiff(files);

    return await prisma.review.update({
      where: { id: reviewId },
      data: {
        status: "completed",
        overallSummary,
        findings: { create: findings },
      },
      include: { findings: true, files: true },
    });
  } catch (err) {
    const status = err instanceof GeminiReviewError ? err.status : undefined;
    console.error(`AI review failed for review ${reviewId} (status: ${status ?? "none"}):`, err);

    return await prisma.review.update({
      where: { id: reviewId },
      data: { status: "failed", overallSummary: toUserFacingMessage(err) },
      include: { findings: true, files: true },
    });
  }
}

// Every route here sits behind requireUser, so req.userId is the verified
// owner. Lookups are scoped to it, and another user's review gets the same
// 404 as a nonexistent one, so ids can't be probed for existence.

// POST /api/reviews - { prUrl } -> fetches the real diff from GitHub,
// saves it, then runs the AI review over it. If the GitHub fetch fails, no
// review is created at all. If the AI pass fails, the review still exists
// with its real diff — just marked "failed" instead of "completed".
// Any userId in the body is ignored in favor of the token's.
reviewsRouter.post("/", async (req, res) => {
  const { prUrl } = req.body;
  const userId = req.userId!;

  if (!prUrl) {
    return res.status(400).json({ error: "prUrl is required" });
  }

  const parsed = parsePrUrl(prUrl);
  if (!parsed) {
    return res.status(400).json({ error: "That doesn't look like a github.com PR URL" });
  }

  let review;
  try {
    const { title, files } = await fetchPullRequest(parsed.owner, parsed.repo, parsed.pullNumber);

    review = await prisma.review.create({
      data: {
        userId,
        prUrl,
        prTitle: title,
        repoName: `${parsed.owner}/${parsed.repo}`,
        status: "pending",
        files: {
          create: files.map((f) => ({
            filePath: f.filename,
            status: normalizeFileStatus(f.status),
            additions: f.additions,
            deletions: f.deletions,
            patch: f.patch ?? null,
          })),
        },
      },
      include: { files: true },
    });
  } catch (err) {
    if (err instanceof GitHubApiError) {
      return res.status(err.status === 403 ? 502 : err.status).json({ error: err.message });
    }
    throw err;
  }

  const result = await runAiReview(review.id, review.files);
  return res.status(201).json(result);
});

// POST /api/reviews/:id/retry - re-runs the AI pass on a failed review's
// already-saved diff (no GitHub re-fetch) and updates the review in place.
// Only "failed" reviews can be retried. The status flip to "pending" is a
// single conditional update, so two simultaneous clicks can't both start a
// Gemini call — the loser matches zero rows and gets a 409.
reviewsRouter.post("/:id/retry", async (req, res) => {
  const { id } = req.params;
  const userId = req.userId!;

  const claimed = await prisma.review.updateMany({
    where: { id, userId, status: "failed" },
    data: { status: "pending" },
  });

  if (claimed.count === 0) {
    const exists = await prisma.review.findFirst({ where: { id, userId }, select: { id: true } });
    if (!exists) return res.status(404).json({ error: "Review not found" });
    return res.status(409).json({ error: "Only a failed review can be retried" });
  }

  const files = await prisma.reviewFile.findMany({
    where: { reviewId: id },
    select: { filePath: true, patch: true },
  });

  const result = await runAiReview(id, files);
  return res.status(200).json(result);
});

// GET /api/reviews/user/:userId - history list, newest first
// Declared before /:id so "user" isn't swallowed as a review id.
// The URL param must match the token's user — no reading others' history.
reviewsRouter.get("/user/:userId", async (req, res) => {
  if (req.params.userId !== req.userId) {
    return res.status(404).json({ error: "User not found" });
  }

  const reviews = await prisma.review.findMany({
    where: { userId: req.userId },
    include: { findings: true },
    orderBy: { createdAt: "desc" },
  });

  res.json(reviews);
});

// GET /api/reviews/:id - one review with all findings and diffed files
reviewsRouter.get("/:id", async (req, res) => {
  const review = await prisma.review.findFirst({
    where: { id: req.params.id, userId: req.userId },
    include: { findings: true, files: true },
  });

  if (!review) {
    return res.status(404).json({ error: "Review not found" });
  }

  res.json(review);
});

// DELETE /api/reviews/:id
reviewsRouter.delete("/:id", async (req, res) => {
  const deleted = await prisma.review.deleteMany({
    where: { id: req.params.id, userId: req.userId },
  });

  if (deleted.count === 0) {
    return res.status(404).json({ error: "Review not found" });
  }

  res.status(204).send();
});
