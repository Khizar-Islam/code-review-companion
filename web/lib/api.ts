import type { Review } from "./types";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

// `token` is session.apiToken — a short-lived token the API uses to know who
// is asking (see lib/apiToken.ts). Server components get it from
// getServerSession; client components should call getSession() right before
// a request so a long-open tab never sends an expired one.
function authHeaders(token: string): HeadersInit {
  return { Authorization: `Bearer ${token}` };
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

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error ?? `Failed to retry review: ${res.status}`);
  }

  return data;
}

export async function createReview(prUrl: string, userId: string, token: string): Promise<Review> {
  const res = await fetch(`${API_URL}/api/reviews`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders(token) },
    body: JSON.stringify({ prUrl, userId }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error ?? `Failed to create review: ${res.status}`);
  }

  return data;
}
