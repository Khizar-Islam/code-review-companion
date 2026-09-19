"use client";

import { useMemo, useState, useCallback } from "react";
import { Diff, Hunk, type EventMap } from "react-diff-view";
import { parseReviewFile, findChangeByNewLineNumber, getChangeKey } from "@/lib/diff";
import { InlineComment } from "./InlineComment";
import type { Finding, ReviewFile } from "@/lib/types";

const STATUS_TO_DIFF_TYPE: Record<ReviewFile["status"], "add" | "delete" | "modify" | "rename"> = {
  added: "add",
  removed: "delete",
  modified: "modify",
  renamed: "rename",
};

export function DiffFile({ file, findings }: { file: ReviewFile; findings: Finding[] }) {
  const parsed = useMemo(() => parseReviewFile(file), [file]);
  const [hoveredKey, setHoveredKey] = useState<string | null>(null);

  const hoverHandlers: EventMap = useMemo(
    () => ({
      onMouseEnter: ({ change }) => change && setHoveredKey(getChangeKey(change)),
      onMouseLeave: () => setHoveredKey(null),
    }),
    [],
  );

  const widgets = useMemo(() => {
    if (!parsed) return {};

    const entries: Record<string, React.ReactNode> = {};
    for (const finding of findings) {
      if (finding.lineNumber == null) continue;
      const change = findChangeByNewLineNumber(parsed.hunks, finding.lineNumber);
      if (!change) continue;
      const key = getChangeKey(change);
      entries[key] = (
        <InlineComment
          finding={finding}
          highlighted={key === hoveredKey}
          onMouseEnter={() => setHoveredKey(key)}
          onMouseLeave={() => setHoveredKey(null)}
        />
      );
    }
    return entries;
  }, [parsed, findings, hoveredKey]);

  if (!parsed) {
    return (
      <div className="rounded-lg border border-border bg-surface p-4 text-sm text-muted">
        <p className="font-mono text-xs">{file.filePath}</p>
        <p className="mt-1">Diff not available.</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-surface">
      <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
        <p className="truncate font-mono text-xs text-foreground">{file.filePath}</p>
        <p className="shrink-0 font-mono text-xs">
          <span className="text-severity-suggestion">+{file.additions}</span>{" "}
          <span className="text-severity-critical">-{file.deletions}</span>
        </p>
      </div>
      <div className="overflow-x-auto">
        <Diff
          viewType="unified"
          diffType={STATUS_TO_DIFF_TYPE[file.status]}
          hunks={parsed.hunks}
          widgets={widgets}
          selectedChanges={hoveredKey ? [hoveredKey] : []}
          gutterEvents={hoverHandlers}
          codeEvents={hoverHandlers}
        >
          {(hunks) => hunks.map((hunk) => <Hunk key={hunk.content} hunk={hunk} />)}
        </Diff>
      </div>
    </div>
  );
}
