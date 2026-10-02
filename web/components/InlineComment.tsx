"use client";

import { motion } from "framer-motion";
import { SeverityBadge } from "./SeverityBadge";
import type { Finding } from "@/lib/types";

export function InlineComment({
  finding,
  highlighted = false,
  onMouseEnter,
  onMouseLeave,
}: {
  finding: Finding;
  highlighted?: boolean;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      className="relative my-1.5 ml-3 max-w-2xl"
    >
      <svg
        width="14"
        height="20"
        viewBox="0 0 14 20"
        className="absolute -left-3 top-0 overflow-visible text-muted"
        aria-hidden
      >
        <motion.path
          d="M 0 0 L 0 10 Q 0 14 4 14 L 10 14"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.3, delay: 0.1, ease: "easeOut" }}
        />
      </svg>
      <div
        className={`inline-comment rounded-md border px-3 py-2.5 text-sm shadow-sm transition-colors ${
          highlighted ? "border-accent" : "border-border"
        } bg-surface`}
      >
        <div className="flex items-center gap-2">
          <SeverityBadge severity={finding.severity} />
          <span className="text-xs uppercase tracking-wide text-muted">{finding.category}</span>
        </div>
        <p className="mt-1.5 text-foreground">{finding.message}</p>
      </div>
    </motion.div>
  );
}
