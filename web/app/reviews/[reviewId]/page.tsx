import { notFound } from "next/navigation";
import Link from "next/link";
import { getReview } from "@/lib/api";
import { ReviewSummaryCard } from "@/components/ReviewSummaryCard";
import { DiffViewer } from "@/components/DiffViewer";

export default async function ReviewDetailPage(props: PageProps<"/reviews/[reviewId]">) {
  const { reviewId } = await props.params;
  const review = await getReview(reviewId);

  if (!review) {
    notFound();
  }

  return (
    <main className="mx-auto w-full max-w-4xl px-6 py-16">
      <Link href="/reviews" className="text-sm text-muted hover:text-foreground">
        ← Back to history
      </Link>

      <div className="mt-6 flex flex-col gap-6">
        <ReviewSummaryCard review={review} />
        <DiffViewer files={review.files} findings={review.findings} />
      </div>
    </main>
  );
}
