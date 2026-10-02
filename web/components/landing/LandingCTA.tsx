"use client";

import Link from "next/link";
import { motion, useTransform } from "framer-motion";
import type { MotionValue } from "framer-motion";
import { useSession } from "next-auth/react";
import { BEATS } from "@/lib/motion";

// Plain DOM overlay (not part of the R3F scene) that fades in over the same
// collapseEnd-1 window as HistoryReveal, closing the scroll story. Driven
// directly off scrollProgress via useTransform rather than useFrame/damping
// — a one-shot fade-in doesn't need per-frame smoothing, and CSS opacity/
// transform animate natively off a Framer Motion value without re-renders.
export function LandingCTA({ scrollProgress }: { scrollProgress: MotionValue<number> }) {
  const { data: session } = useSession();
  const opacity = useTransform(scrollProgress, [BEATS.collapseEnd, 1], [0, 1]);
  const y = useTransform(scrollProgress, [BEATS.collapseEnd, 1], [16, 0]);

  const href = session?.user ? "/reviews/new" : "/sign-in?callbackUrl=/reviews/new";

  return (
    <motion.div
      style={{ opacity, y }}
      className="pointer-events-none absolute inset-x-0 top-20 flex flex-col items-center gap-4 px-6 text-center"
    >
      <h2 className="text-3xl font-semibold text-foreground sm:text-4xl">Paste a link. Get a real review.</h2>
      <p className="max-w-md text-sm text-muted">
        Full diff context, line-anchored findings, saved to your history — one paste, not a chat window.
      </p>
      <Link
        href={href}
        className="pointer-events-auto mt-2 rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90"
      >
        Start reviewing a PR
      </Link>
    </motion.div>
  );
}
