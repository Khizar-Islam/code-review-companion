"use client";

import { motion } from "framer-motion";
import type { Finding, Severity } from "@/lib/types";

const ORDER: Severity[] = ["critical", "warning", "suggestion"];

const SEGMENT_COLOR: Record<Severity, string> = {
  critical: "bg-severity-critical",
  warning: "bg-severity-warning",
  suggestion: "bg-severity-suggestion",
};

// Segment widths are derived from `findings` on every render, so if the
// underlying data changes (filtering, refetch, etc.) Framer Motion
// interpolates from the current width to the new one instead of resetting.
export function FindingCountBar({ findings }: { findings: Finding[] }) {
  const total = findings.length;

  if (total === 0) {
    return <div className="h-1.5 w-full rounded-full bg-border" />;
  }

  const counts = ORDER.map((severity) => ({
    severity,
    count: findings.filter((f) => f.severity === severity).length,
  }));

  return (
    <div className="flex h-1.5 w-full gap-0.5 overflow-hidden rounded-full">
      {counts
        .filter((c) => c.count > 0)
        .map(({ severity, count }) => (
          <motion.div
            key={severity}
            className={`h-full ${SEGMENT_COLOR[severity]}`}
            initial={{ width: 0 }}
            animate={{ width: `${(count / total) * 100}%` }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          />
        ))}
    </div>
  );
}
