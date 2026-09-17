"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { createReview } from "@/lib/api";
import { TEMP_USER_ID } from "@/lib/constants";

export default function NewReviewPage() {
  const router = useRouter();
  const [prUrl, setPrUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const review = await createReview(prUrl, TEMP_USER_ID);
      router.push(`/reviews/${review.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-xl flex-col justify-center px-6 py-16">
      <h1 className="text-2xl font-semibold text-foreground">New review</h1>
      <p className="mt-1.5 text-sm text-muted">Paste a GitHub pull request URL to fetch its diff.</p>

      <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-3">
        <input
          type="url"
          required
          value={prUrl}
          onChange={(e) => setPrUrl(e.target.value)}
          placeholder="https://github.com/owner/repo/pull/123"
          className="rounded-md border border-border bg-surface px-3.5 py-2.5 text-sm text-foreground outline-none placeholder:text-muted focus:border-accent"
        />

        {error && <p className="text-sm text-severity-critical">{error}</p>}

        <motion.button
          type="submit"
          disabled={loading}
          whileHover={{ opacity: 0.9 }}
          whileTap={{ scale: 0.98 }}
          className="self-start rounded-full bg-accent px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
        >
          {loading ? "Fetching diff…" : "Fetch diff"}
        </motion.button>
      </form>
    </main>
  );
}
