"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { motion } from "framer-motion";
import { createReview } from "@/lib/api";
import { freshApiToken } from "@/lib/freshApiToken";

// A small, merged PR in a widely used repo, so the diff can't disappear on us.
const EXAMPLE_PR_URL = "https://github.com/expressjs/express/pull/3495";

export default function NewReviewPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const [prUrl, setPrUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const submitRef = useRef<HTMLButtonElement>(null);

  function fillExample() {
    setPrUrl(EXAMPLE_PR_URL);
    setError(null);
    submitRef.current?.focus();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!session?.user) return;
    setError(null);
    setLoading(true);

    try {
      const review = await createReview(prUrl, session.user.id, await freshApiToken());
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
        <p className="-mt-1 text-xs text-muted">
          Paste the URL of any GitHub pull request — e.g. github.com/owner/repo/pull/12
        </p>

        {error && <p className="text-sm text-severity-critical">{error}</p>}

        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <motion.button
            ref={submitRef}
            type="submit"
            disabled={loading}
            whileHover={{ opacity: 0.9 }}
            whileTap={{ scale: 0.98 }}
            className="rounded-full bg-accent px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
          >
            {loading ? "Fetching diff…" : "Fetch diff"}
          </motion.button>
          <motion.button
            type="button"
            onClick={fillExample}
            disabled={loading}
            whileTap={{ scale: 0.97 }}
            className="text-sm text-muted underline-offset-4 transition-colors hover:text-foreground hover:underline disabled:opacity-60"
          >
            Try with an example PR
          </motion.button>
        </div>
      </form>
    </main>
  );
}
