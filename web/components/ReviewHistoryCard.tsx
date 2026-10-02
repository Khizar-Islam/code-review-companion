"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { SeverityBadge } from "./SeverityBadge";
import { FindingCountBar } from "./FindingCountBar";
import type { Review, Severity } from "@/lib/types";

const STATUS_LABEL: Record<Review["status"], string> = {
  pending: "Pending",
  completed: "Reviewed",
  failed: "Failed",
};

function severityCounts(review: Review) {
  const order: Severity[] = ["critical", "warning", "suggestion"];
  return order
    .map((severity) => ({
      severity,
      count: review.findings.filter((f) => f.severity === severity).length,
    }))
    .filter((c) => c.count > 0);
}

export function ReviewHistoryCard({ review }: { review: Review }) {
  const counts = severityCounts(review);
  const date = new Date(review.createdAt).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return (
    <Link href={`/reviews/${review.id}`} className="block">
      <motion.article
        whileHover={{ y: -2 }}
        transition={{ duration: 0.15, ease: "easeOut" }}
        className="group rounded-lg border border-border bg-surface p-5 shadow-sm transition-shadow hover:shadow-md"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="truncate font-mono text-xs text-muted">{review.repoName ?? review.prUrl}</p>
            <h3 className="mt-1 truncate text-sm font-semibold text-foreground">
              {review.prTitle ?? "Awaiting review title"}
            </h3>
          </div>
          <span
            className={`shrink-0 rounded-full border px-2.5 py-0.5 text-xs font-medium ${
              review.status === "completed"
                ? "border-border text-foreground"
                : review.status === "pending"
                  ? "border-border text-muted"
                  : "border-severity-critical text-severity-critical"
            }`}
          >
            {STATUS_LABEL[review.status]}
          </span>
        </div>

        {review.overallSummary && (
          <p className="mt-3 line-clamp-2 text-sm text-muted">{review.overallSummary}</p>
        )}

        <div className="mt-4">
          <FindingCountBar findings={review.findings} />
          <div className="mt-2 flex items-center justify-between">
            <div className="flex flex-wrap gap-1.5">
              {counts.length > 0 ? (
                counts.map((c) => <SeverityBadge key={c.severity} severity={c.severity} />)
              ) : (
                <span className="text-xs text-muted">No findings yet</span>
              )}
            </div>
            <time className="shrink-0 text-xs text-muted">{date}</time>
          </div>
        </div>
      </motion.article>
    </Link>
  );
}
