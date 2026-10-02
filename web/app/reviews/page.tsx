import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { getReviewsForUser } from "@/lib/api";
import { ReviewList } from "@/components/ReviewList";

export default async function ReviewsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/sign-in");

  const reviews = await getReviewsForUser(session.user.id);

  return (
    <main className="mx-auto w-full max-w-2xl px-6 py-16">
      <header className="mb-10 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Review history</h1>
          <p className="mt-1.5 text-sm text-muted">
            {reviews.length} review{reviews.length === 1 ? "" : "s"} so far
          </p>
        </div>
        <Link
          href="/reviews/new"
          className="shrink-0 rounded-full bg-accent px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90"
        >
          New review
        </Link>
      </header>

      {reviews.length === 0 ? (
        <p className="text-sm text-muted">No reviews yet.</p>
      ) : (
        <ReviewList reviews={reviews} />
      )}
    </main>
  );
}
