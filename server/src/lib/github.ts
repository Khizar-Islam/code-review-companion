const GITHUB_API = "https://api.github.com";

export interface ParsedPrUrl {
  owner: string;
  repo: string;
  pullNumber: number;
}

export function parsePrUrl(url: string): ParsedPrUrl | null {
  const match = url.trim().match(/^https?:\/\/github\.com\/([^/]+)\/([^/]+)\/pull\/(\d+)/);
  if (!match) return null;

  const [, owner, repo, pullNumber] = match;
  return { owner, repo, pullNumber: Number(pullNumber) };
}

export class GitHubApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
    this.name = "GitHubApiError";
  }
}

async function githubFetch(path: string): Promise<Response> {
  const res = await fetch(`${GITHUB_API}${path}`, {
    headers: {
      Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
    },
  });

  if (res.status === 404) {
    throw new GitHubApiError("Pull request not found (or the token can't see this repo)", 404);
  }
  if (res.status === 403) {
    throw new GitHubApiError("GitHub API rate limit hit or access denied", 403);
  }
  if (!res.ok) {
    throw new GitHubApiError(`GitHub API request failed: ${res.status}`, res.status);
  }

  return res;
}

export interface GitHubPullFile {
  filename: string;
  status: string;
  additions: number;
  deletions: number;
  patch?: string;
}

// GitHub can also return "copied", "changed", or "unchanged" — our schema
// (and the frontend's diffType mapping) only models the four common cases,
// so anything else collapses to "modified" rather than breaking downstream.
const KNOWN_STATUSES = new Set(["added", "removed", "modified", "renamed"]);

export function normalizeFileStatus(status: string): string {
  return KNOWN_STATUSES.has(status) ? status : "modified";
}

export interface PullRequestData {
  title: string;
  files: GitHubPullFile[];
}

export async function fetchPullRequest(owner: string, repo: string, pullNumber: number): Promise<PullRequestData> {
  const prRes = await githubFetch(`/repos/${owner}/${repo}/pulls/${pullNumber}`);
  const pr = (await prRes.json()) as { title: string };

  const files: GitHubPullFile[] = [];
  let page = 1;

  // The files endpoint paginates at 100/page — loop until a short page tells us we're done.
  while (true) {
    const filesRes = await githubFetch(`/repos/${owner}/${repo}/pulls/${pullNumber}/files?per_page=100&page=${page}`);
    const batch = (await filesRes.json()) as GitHubPullFile[];
    files.push(...batch);

    if (batch.length < 100) break;
    page += 1;
  }

  return { title: pr.title, files };
}
