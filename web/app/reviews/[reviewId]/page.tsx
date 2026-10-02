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
    freshApiToken().then((token) => getReview(reviewId, token)).then((data) => {
      if (!cancelled) setLoaded({ reviewId, review: data });
    });

    return () => {
      cancelled = true;
    };
  }, [reviewId, status]);

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
