import { parseDiff as parseDiffRaw } from "react-diff-view";
import type { ReviewFile } from "./types";

export { findChangeByNewLineNumber, getChangeKey } from "react-diff-view";
export type { HunkData, ChangeData, FileData } from "react-diff-view";

// GitHub's PR-files-API `patch` field (what ReviewFile.patch stores) is just
// the raw hunks, with no `diff --git` / `---` / `+++` header lines. gitdiff-parser
// silently returns an empty file list without them, so we synthesize the headers
// from data we already have before handing the text to parseDiff.
export function parseReviewFile(file: ReviewFile) {
  if (!file.patch) return null;

  const oldPath = file.status === "added" ? "/dev/null" : `a/${file.filePath}`;
  const newPath = file.status === "removed" ? "/dev/null" : `b/${file.filePath}`;

  const fullDiffText = [
    `diff --git a/${file.filePath} b/${file.filePath}`,
    `--- ${oldPath}`,
    `+++ ${newPath}`,
    file.patch,
  ].join("\n");

  const [parsed] = parseDiffRaw(fullDiffText);
  return parsed ?? null;
}
