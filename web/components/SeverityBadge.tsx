"use client";

import { motion } from "framer-motion";
import type { Severity } from "@/lib/types";

const LABELS: Record<Severity, string> = {
  critical: "Critical",
  warning: "Warning",
  suggestion: "Suggestion",
};

const STYLES: Record<Severity, { text: string; bg: string }> = {
  critical: { text: "text-severity-critical", bg: "bg-severity-critical-bg" },
  warning: { text: "text-severity-warning", bg: "bg-severity-warning-bg" },
  suggestion: { text: "text-severity-suggestion", bg: "bg-severity-suggestion-bg" },
};

export function SeverityBadge({ severity }: { severity: Severity }) {
  const style = STYLES[severity];

  return (
    <motion.span
      initial={{ scale: 0.85, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${style.text} ${style.bg}`}
    >
      <motion.span
        initial={{ scale: 1 }}
        animate={{ scale: [1, 1.35, 1] }}
        transition={{ duration: 0.4, delay: 0.2, ease: "easeOut" }}
        className="inline-block"
      >
        {LABELS[severity]}
      </motion.span>
    </motion.span>
  );
}
