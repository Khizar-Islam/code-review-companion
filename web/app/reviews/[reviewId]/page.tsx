"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { getReview } from "@/lib/api";
import { ReviewSummaryCard } from "@/components/ReviewSummaryCard";
import { DiffViewer } from "@/components/DiffViewer";
import type { Review } from "@/lib/types";

export default function ReviewDetailPage() {
  const { reviewId } = useParams<{ reviewId: string }>();
  const { status } = useSession();
  const router = useRouter();
  const [review, setReview] = useState<Review | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") router.replace("/sign-in");
  }, [status, router]);

  useEffect(() => {
    if (status !== "authenticated") return;

    let cancelled = false;
    setReview(null);
    setNotFound(false);

    getReview(reviewId).then((data) => {
      if (cancelled) return;
      if (data) setReview(data);
      else setNotFound(true);
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
            <ReviewSummaryCard reviewId={reviewId} review={review} />
            {review && <DiffViewer files={review.files} findings={review.findings} />}
          </>
        )}
      </div>
    </main>
  );
}
