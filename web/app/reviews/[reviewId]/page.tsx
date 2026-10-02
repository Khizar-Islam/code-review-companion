"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { getReview, retryReview } from "@/lib/api";
import { freshApiToken } from "@/lib/freshApiToken";
import { ReviewSummaryCard } from "@/components/ReviewSummaryCard";
import { DiffViewer } from "@/components/DiffViewer";
import type { Review } from "@/lib/types";

// While a review is pending, re-fetch it on this interval so it moves to
// completed/failed without a reload. The server also marks abandoned
// pending reviews as failed on read, so polling surfaces those too.
const POLL_INTERVAL_MS = 10_000;

// Shared by the initial load and polling.
async function fetchReview(reviewId: string): Promise<Review | null> {
  return getReview(reviewId, await freshApiToken());
}

export default function ReviewDetailPage() {
  const { reviewId } = useParams<{ reviewId: string }>();
  const { status } = useSession();
  const router = useRouter();
  // Tagged with the reviewId it was fetched for, so navigating to another
  // review never shows the previous one's data — it just doesn't match
  // until the new fetch lands. `review: null` means the API found nothing.
  const [loaded, setLoaded] = useState<{ reviewId: string; review: Review | null } | null>(null);
  const current = loaded?.reviewId === reviewId ? loaded : null;
  const review = current?.review ?? null;
  const notFound = current !== null && current.review === null;
  const isPending = review?.status === "pending";

  const [retrying, setRetrying] = useState(false);
  const [retryError, setRetryError] = useState<string | null>(null);

  async function handleRetry() {
    setRetrying(true);
    setRetryError(null);
    try {
      setLoaded({ reviewId, review: await retryReview(reviewId, await freshApiToken()) });
    } catch (err) {
      setRetryError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setRetrying(false);
    }
  }

  useEffect(() => {
    if (status === "unauthenticated") router.replace("/sign-in");
  }, [status, router]);

  useEffect(() => {
    if (status !== "authenticated") return;

    let cancelled = false;
    fetchReview(reviewId).then((data) => {
      if (!cancelled) setLoaded({ reviewId, review: data });
    });

    return () => {
      cancelled = true;
    };
  }, [reviewId, status]);

  // Clears itself once the review is no longer pending (or on navigation),
  // since isPending/reviewId change and the effect re-runs its cleanup.
  useEffect(() => {
    if (status !== "authenticated" || !isPending) return;

    let cancelled = false;
    const interval = setInterval(() => {
      // A failed poll (network blip, server restart) is skipped — the next
      // tick tries again.
      fetchReview(reviewId)
        .then((data) => {
          if (!cancelled) setLoaded({ reviewId, review: data });
        })
        .catch(() => {});
    }, POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [reviewId, status, isPending]);

  if (status !== "authenticated") return null;

  return (
    <main className="mx-auto w-full max-w-4xl px-8 py-16">
      <Link href="/reviews" className="text-sm text-muted hover:text-foreground">
        ← Back to history
      </Link>

      <div className="mt-6 flex flex-col gap-6">
        {notFound ? (
          <p className="text-sm text-muted">Review not found.</p>
        ) : (
          <>
            <ReviewSummaryCard
              reviewId={reviewId}
              review={review}
              onRetry={handleRetry}
              retrying={retrying}
              retryError={retryError}
            />
            {review && <DiffViewer files={review.files} findings={review.findings} />}
          </>
        )}
      </div>
    </main>
  );
}
