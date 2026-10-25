import type { Review } from "./types";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

// `token` is session.apiToken — a short-lived token the API uses to know who
// is asking (see lib/apiToken.ts). Server components get it from
// getServerSession; client components should call getSession() right before
// a request so a long-open tab never sends an expired one.
function authHeaders(token: string): HeadersInit {
  return { Authorization: `Bearer ${token}` };
}

const FALLBACK_ERROR = "Something went wrong. Please try again.";

// A failed reply isn't always the API's { error } JSON — a proxy in front of
// it can answer with an HTML page, or the body can be empty. Anything without
// a readable message becomes one fixed line instead of a JSON parse error.
async function readError(res: Response): Promise<string> {
  try {
    const data = await res.json();
    if (typeof data?.error === "string" && data.error) return data.error;
  } catch {
    // Not JSON — fall through to the fixed message.
  }
  return FALLBACK_ERROR;
}

// userId stays in the URL (and in createReview's body) only so the web app
// works against both the old API and the token-checking one during rollout —
// the token-checking API takes the user from the token and ignores these.
export async function getReviewsForUser(userId: string, token: string): Promise<Review[]> {
  const res = await fetch(`${API_URL}/api/reviews/user/${userId}`, {
    cache: "no-store",
    headers: authHeaders(token),
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch reviews: ${res.status}`);
  }

  return res.json();
}

export async function getReview(id: string, token: string): Promise<Review | null> {
  const res = await fetch(`${API_URL}/api/reviews/${id}`, {
    cache: "no-store",
    headers: authHeaders(token),
  });

  if (res.status === 404) return null;
  if (!res.ok) {
    throw new Error(`Failed to fetch review: ${res.status}`);
  }

  return res.json();
}

export async function retryReview(id: string, token: string): Promise<Review> {
  const res = await fetch(`${API_URL}/api/reviews/${id}/retry`, {
    method: "POST",
    headers: authHeaders(token),
  });

  if (!res.ok) {
    throw new Error(await readError(res));
  }

  return res.json();
}

export async function createReview(prUrl: string, userId: string, token: string): Promise<Review> {
  const res = await fetch(`${API_URL}/api/reviews`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders(token) },
    body: JSON.stringify({ prUrl, userId }),
  });

  if (!res.ok) {
    throw new Error(await readError(res));
  }

  return res.json();
}
