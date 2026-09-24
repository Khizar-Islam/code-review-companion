"use client";

import { motion } from "framer-motion";
import { FindingCountBar } from "./FindingCountBar";
import type { Review, Severity } from "@/lib/types";

const ORDER: Severity[] = ["critical", "warning", "suggestion"];

// Carries the layoutId that ReviewHistoryCard hands off on navigation, so it
// mounts (as this loading shell) before `review` arrives and morphs smoothly
// into place rather than popping in once the client-side fetch resolves.
export function ReviewSummaryCard({
  reviewId,
  review,
  onRetry,
  retrying = false,
  retryError = null,
}: {
  reviewId: string;
  review: Review | null;
  onRetry?: () => void;
  retrying?: boolean;
  retryError?: string | null;
}) {
  const counts = review
    ? ORDER.map((severity) => ({
        severity,
        count: review.findings.filter((f) => f.severity === severity).length,
      })).filter((c) => c.count > 0)
    : [];

  return (
    <motion.div layoutId={`review-${reviewId}`} className="rounded-lg border border-border bg-surface p-5">
      {review ? (
        <>
          <p className="font-mono text-xs text-muted">{review.repoName ?? review.prUrl}</p>
          <h1 className="mt-1 text-xl font-bold tracking-tight text-foreground">
            {review.prTitle ?? "Awaiting review title"}
          </h1>

          {review.overallSummary && <p className="mt-3 text-sm text-muted">{review.overallSummary}</p>}

          {review.status === "failed" && onRetry && (
            <div className="mt-4 flex flex-col items-start gap-2">
              <motion.button
                type="button"
                onClick={onRetry}
                disabled={retrying}
                whileHover={{ opacity: 0.9 }}
                whileTap={{ scale: 0.98 }}
                className="rounded-full bg-accent px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
              >
                {retrying ? "Retrying…" : "Retry review"}
              </motion.button>
              {retrying && <p className="text-xs text-muted">This can take a minute.</p>}
              {retryError && <p className="text-sm text-severity-critical">{retryError}</p>}
            </div>
          )}

          {review.findings.length > 0 && (
            <div className="mt-4">
              <FindingCountBar findings={review.findings} />
              <div className="mt-2 flex gap-4 text-xs text-muted">
                {counts.map((c) => (
                  <span key={c.severity}>
                    {c.count} {c.severity}
                  </span>
                ))}
              </div>
            </div>
          )}
        </>
      ) : (
        <p className="text-sm text-muted">Loading review…</p>
      )}
    </motion.div>
  );
}
