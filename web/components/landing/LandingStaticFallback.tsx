"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { DiffFile } from "../DiffFile";
import { InlineComment } from "../InlineComment";
import { ReviewHistoryCard } from "../ReviewHistoryCard";
import { Headline } from "./Headline";
import { FAN_FILES, FAN_FINDINGS, LANDING_REVIEW } from "@/lib/landing-sample-data";

// Non-3D, non-scroll-jacking version of the landing page — same real
// components and sample data as the 3D scene, laid out in normal document
// flow instead of animated in 3D space. Shown for prefers-reduced-motion,
// small viewports, and browsers without WebGL (see lib/device.ts).
export function LandingStaticFallback() {
  const { data: session } = useSession();
  const href = session?.user ? "/reviews/new" : "/sign-in?callbackUrl=/reviews/new";

  // w-full: empirically, align-items:stretch alone doesn't reliably
  // constrain this flex-col item to its parent's width in this layout
  // (confirmed by direct testing — forcing align-items:stretch explicitly
  // made no difference, but an explicit width did) — an explicit width is
  // needed wherever a flex-col item should span its container, same as
  // Header.tsx already does. This is a distinct mechanism from the
  // min-width fix in globals.css, and — unlike that one — isn't safe to
  // apply globally, since plenty of flex-col children (e.g. the centered
  // CTA button below) are intentionally sized to their content, not
  // stretched full width.
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-16 px-6 py-20">
      <section className="flex flex-col items-center gap-4 text-center">
        <Headline as="h1" />
        <p className="max-w-md text-sm text-muted">
          Full diff context, line-anchored findings, saved to your history — one paste, not a chat window.
        </p>
        <Link
          href={href}
          className="mt-2 rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90"
        >
          Start reviewing a PR
        </Link>
      </section>

      <section className="flex flex-col gap-4">
        {FAN_FILES.map((file, index) => (
          <div key={file.id} className="flex flex-col gap-2">
            <DiffFile file={file} findings={[]} />
            <div className="pl-1">
              <InlineComment finding={FAN_FINDINGS[index]} />
            </div>
          </div>
        ))}
      </section>

      {/* w-full mx-auto, not self-center: align-self:center switches this
          item into shrink-to-fit sizing, which (empirically) sizes toward
          max-w-sm rather than capping at the actually-available space.
          w-full + mx-auto keeps it in stretch sizing (bounded by the real
          available width, same w-full caveat as on <main> above) and
          centers it via the leftover space once max-w-sm caps it below
          that. */}
      <section className="pointer-events-none w-full max-w-sm mx-auto">
        <ReviewHistoryCard review={LANDING_REVIEW} />
      </section>
    </main>
  );
}
