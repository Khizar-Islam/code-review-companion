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

  // The count is tagged with the findings list it belongs to, so when the
  // findings change (e.g. a retried review), the reveal restarts from 0
  // without resetting state inside the effect.
  const [reveal, setReveal] = useState({ source: orderedFindings, count: 0 });
  const revealedCount = reveal.source === orderedFindings ? reveal.count : 0;

  useEffect(() => {
    if (orderedFindings.length === 0) return;

    const interval = setInterval(() => {
      setReveal((prev) => {
        const count = prev.source === orderedFindings ? prev.count + 1 : 1;
        if (count >= orderedFindings.length) clearInterval(interval);
        return { source: orderedFindings, count };
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
