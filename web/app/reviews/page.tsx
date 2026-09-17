import { getReviewsForUser } from "@/lib/api";
import { TEMP_USER_ID } from "@/lib/constants";
import { ReviewList } from "@/components/ReviewList";

export default async function ReviewsPage() {
  const reviews = await getReviewsForUser(TEMP_USER_ID);

  return (
    <main className="mx-auto w-full max-w-2xl px-6 py-16">
      <header className="mb-10">
        <h1 className="text-2xl font-semibold text-foreground">Review history</h1>
        <p className="mt-1.5 text-sm text-muted">
          {reviews.length} review{reviews.length === 1 ? "" : "s"} so far
        </p>
      </header>

      {reviews.length === 0 ? (
        <p className="text-sm text-muted">No reviews yet.</p>
      ) : (
        <ReviewList reviews={reviews} />
      )}
    </main>
  );
}
