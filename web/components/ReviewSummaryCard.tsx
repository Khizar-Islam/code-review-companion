import { FindingCountBar } from "./FindingCountBar";
import type { Review, Severity } from "@/lib/types";

const ORDER: Severity[] = ["critical", "warning", "suggestion"];

export function ReviewSummaryCard({ review }: { review: Review }) {
  const counts = ORDER.map((severity) => ({
    severity,
    count: review.findings.filter((f) => f.severity === severity).length,
  })).filter((c) => c.count > 0);

  return (
    <div className="rounded-lg border border-border bg-surface p-5">
      <p className="font-mono text-xs text-muted">{review.repoName ?? review.prUrl}</p>
      <h1 className="mt-1 text-xl font-semibold text-foreground">{review.prTitle ?? "Awaiting review title"}</h1>

      {review.overallSummary && <p className="mt-3 text-sm text-muted">{review.overallSummary}</p>}

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
    </div>
  );
}
