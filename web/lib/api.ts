import type { Review } from "./types";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export async function getReviewsForUser(userId: string): Promise<Review[]> {
  const res = await fetch(`${API_URL}/api/reviews/user/${userId}`, {
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch reviews: ${res.status}`);
  }

  return res.json();
}

export async function getReview(id: string): Promise<Review | null> {
  const res = await fetch(`${API_URL}/api/reviews/${id}`, {
    cache: "no-store",
  });

  if (res.status === 404) return null;
  if (!res.ok) {
    throw new Error(`Failed to fetch review: ${res.status}`);
  }

  return res.json();
}

export async function retryReview(id: string): Promise<Review> {
  const res = await fetch(`${API_URL}/api/reviews/${id}/retry`, { method: "POST" });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error ?? `Failed to retry review: ${res.status}`);
  }

  return data;
}

export async function createReview(prUrl: string, userId: string): Promise<Review> {
  const res = await fetch(`${API_URL}/api/reviews`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prUrl, userId }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error ?? `Failed to create review: ${res.status}`);
  }

  return data;
}
