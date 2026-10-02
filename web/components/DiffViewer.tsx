"use client";

import { useEffect, useMemo, useState } from "react";
import { DiffFile } from "./DiffFile";
import type { Finding, ReviewFile } from "@/lib/types";

const REVEAL_INTERVAL_MS = 350;

export function DiffViewer({ files, findings }: { files: ReviewFile[]; findings: Finding[] }) {
  // Findings arrive all at once from the API, but we reveal them one at a
  // time, ordered as they appear scanning top-to-bottom through the diff, to
  // fake the pacing of someone actually reading through the review.
  const orderedFindings = useMemo(
    () =>
      files.flatMap((file) =>
        findings
          .filter((f) => f.filePath === file.filePath)
          .sort((a, b) => (a.lineNumber ?? 0) - (b.lineNumber ?? 0)),
      ),
    [files, findings],
  );

  const [revealedCount, setRevealedCount] = useState(0);

  useEffect(() => {
    setRevealedCount(0);
    if (orderedFindings.length === 0) return;

    const interval = setInterval(() => {
      setRevealedCount((count) => {
        const next = count + 1;
        if (next >= orderedFindings.length) clearInterval(interval);
        return next;
      });
    }, REVEAL_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [orderedFindings]);

  if (files.length === 0) {
    return <p className="text-sm text-muted">No diff available for this review yet.</p>;
  }

  const revealedIds = new Set(orderedFindings.slice(0, revealedCount).map((f) => f.id));

  return (
    <div className="flex flex-col gap-6">
      {files.map((file) => (
        <DiffFile
          key={file.id}
          file={file}
          findings={findings.filter((f) => f.filePath === file.filePath && revealedIds.has(f.id))}
        />
      ))}
    </div>
  );
}
