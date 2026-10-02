export type Severity = "critical" | "warning" | "suggestion";
export type Category = "bug" | "style" | "security" | "cross-file" | "performance";
export type ReviewStatus = "pending" | "completed" | "failed";

export interface Finding {
  id: string;
  reviewId: string;
  filePath: string;
  lineNumber: number | null;
  severity: Severity;
  category: Category;
  message: string;
  createdAt: string;
}

export interface ReviewFile {
  id: string;
  reviewId: string;
  filePath: string;
  status: "added" | "modified" | "removed" | "renamed";
  additions: number;
  deletions: number;
  patch: string | null;
}

export interface Review {
  id: string;
  userId: string;
  prUrl: string;
  prTitle: string | null;
  repoName: string | null;
  status: ReviewStatus;
  overallSummary: string | null;
  createdAt: string;
  findings: Finding[];
  files: ReviewFile[];
}
