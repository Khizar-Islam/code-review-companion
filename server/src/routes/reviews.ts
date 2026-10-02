import { Router } from "express";
import { prisma } from "../lib/prisma";
import { parsePrUrl, fetchPullRequest, normalizeFileStatus, GitHubApiError } from "../lib/github";
import { reviewDiff, GeminiReviewError } from "../lib/gemini";

export const reviewsRouter = Router();

// POST /api/reviews - { prUrl, userId } -> fetches the real diff from GitHub,
// saves it, then runs the AI review over it. If the GitHub fetch fails, no
// review is created at all. If the AI pass fails, the review still exists
// with its real diff — just marked "failed" instead of "completed".
reviewsRouter.post("/", async (req, res) => {
  const { prUrl, userId } = req.body;

  if (!prUrl || !userId) {
    return res.status(400).json({ error: "prUrl and userId are required" });
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

  try {
    const { overallSummary, findings } = await reviewDiff(review.files);

    const completed = await prisma.review.update({
      where: { id: review.id },
      data: {
        status: "completed",
        overallSummary,
        findings: { create: findings },
      },
      include: { findings: true, files: true },
    });

    return res.status(201).json(completed);
  } catch (err) {
    const message = err instanceof GeminiReviewError ? err.message : "AI review failed";

    const failed = await prisma.review.update({
      where: { id: review.id },
      data: { status: "failed", overallSummary: message },
      include: { findings: true, files: true },
    });

    return res.status(201).json(failed);
  }
});

// GET /api/reviews/user/:userId - history list, newest first
// Declared before /:id so "user" isn't swallowed as a review id.
reviewsRouter.get("/user/:userId", async (req, res) => {
  const reviews = await prisma.review.findMany({
    where: { userId: req.params.userId },
    include: { findings: true },
    orderBy: { createdAt: "desc" },
  });

  res.json(reviews);
});

// GET /api/reviews/:id - one review with all findings and diffed files
reviewsRouter.get("/:id", async (req, res) => {
  const review = await prisma.review.findUnique({
    where: { id: req.params.id },
    include: { findings: true, files: true },
  });

  if (!review) {
    return res.status(404).json({ error: "Review not found" });
  }

  res.json(review);
});

// DELETE /api/reviews/:id
reviewsRouter.delete("/:id", async (req, res) => {
  await prisma.review.delete({ where: { id: req.params.id } });
  res.status(204).send();
});
