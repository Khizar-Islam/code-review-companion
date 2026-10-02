import type { Finding, Review, ReviewFile } from "./types";

// Sample content for the landing page's 3D/scroll scene only — never real
// review data. The three files below are chosen to double as a preview of
// the cross-file-awareness pitch: runReview.ts gains a param, and a caller
// picks up a plausible unrelated change of its own in the same PR, the kind
// of spread a real reviewer has to hold in mind across files at once.
export const HERO_FILE: ReviewFile = {
  id: "landing-hero-file",
  reviewId: "landing-hero-review",
  filePath: "src/review/runReview.ts",
  status: "modified",
  additions: 1,
  deletions: 1,
  patch: `@@ -12,7 +12,7 @@ export async function reviewPullRequest(prUrl: string) {
   const { files } = await fetchDiff(prUrl);
-  const findings = await runReview(files);
+  const findings = await runReview(files, { crossFile: true });
   return {
     summary: summarize(findings),
     findings,
   };`,
};

export const FAN_FILES: ReviewFile[] = [
  HERO_FILE,
  {
    id: "landing-fan-file-2",
    reviewId: "landing-hero-review",
    filePath: "src/webhooks/pullRequestHandler.ts",
    status: "modified",
    additions: 4,
    deletions: 0,
    patch: `@@ -14,6 +14,10 @@ export async function handlePullRequestEvent(payload: WebhookPayload) {
   const prUrl = payload.pull_request.html_url;
   const { findings, summary } = await reviewPullRequest(prUrl);

+  if (findings.some((f) => f.severity === "critical")) {
+    await notifySlackChannel(summary, findings);
+  }
+
   await postReviewComment(prUrl, findings);
 }`,
  },
  {
    id: "landing-fan-file-3",
    reviewId: "landing-hero-review",
    filePath: "src/review/runReview.test.ts",
    status: "modified",
    additions: 8,
    deletions: 0,
    patch: `@@ -20,4 +20,12 @@ describe("runReview", () => {
     expect(findings).toHaveLength(0);
   });
+
+  it("flags cross-file signature drift", async () => {
+    const files = [changedSignatureFile, staleCallerFile];
+    const findings = await runReview(files, { crossFile: true });
+    expect(findings.some((f) => f.category === "cross-file")).toBe(true);
+  });
 });`,
  },
];

// One finding per fan file (paired by array index) for the landing scene's
// scan/findings beat.
export const FAN_FINDINGS: Finding[] = [
  {
    id: "landing-finding-1",
    reviewId: "landing-hero-review",
    filePath: FAN_FILES[0].filePath,
    lineNumber: 13,
    severity: "warning",
    category: "cross-file",
    message: "New crossFile option isn't threaded through every runReview call site — check other callers.",
    createdAt: new Date().toISOString(),
  },
  {
    id: "landing-finding-2",
    reviewId: "landing-hero-review",
    filePath: FAN_FILES[1].filePath,
    lineNumber: 18,
    severity: "critical",
    category: "bug",
    message: "notifySlackChannel is awaited before postReviewComment — if Slack fails, the PR comment never posts.",
    createdAt: new Date().toISOString(),
  },
  {
    id: "landing-finding-3",
    reviewId: "landing-hero-review",
    filePath: FAN_FILES[2].filePath,
    lineNumber: 26,
    severity: "suggestion",
    category: "style",
    message: "Assert on the specific finding's filePath too, not just its category.",
    createdAt: new Date().toISOString(),
  },
];

// The review these files/findings would land on, for the landing scene's
// collapse-into-history beat.
export const LANDING_REVIEW: Review = {
  id: "landing-review",
  userId: "landing-user",
  prUrl: "https://github.com/example/code-review-companion/pull/42",
  prTitle: "Add cross-file awareness to runReview",
  repoName: "example/code-review-companion",
  status: "completed",
  overallSummary:
    "Threads a new crossFile option through the reviewer, but one caller downstream wasn't updated to match.",
  createdAt: new Date().toISOString(),
  findings: FAN_FINDINGS,
  files: FAN_FILES,
};
