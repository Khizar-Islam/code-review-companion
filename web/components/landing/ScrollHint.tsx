"use client";

import { motion, useTransform } from "framer-motion";
import type { MotionValue } from "framer-motion";
import { DOM_OVERLAY_Z } from "@/lib/motion";

// Signals there's more below the fold before a first-time visitor has
// scrolled at all. Fades out over the first sliver of scroll — well before
// heroEnd — so it never lingers once someone's already engaged with the
// fan-out beat; it's an invitation to start, not a persistent UI element.
//
// Fixed (not absolute) deliberately: the sticky container above only snaps
// to the viewport's top edge once you've scrolled past whatever precedes it
// on the page (the site header), so before any scrolling its box sits partly
// below the viewport — bottom-anchoring to that box would place this off-
// screen at exactly the moment it's meant to be seen. Fixed positioning
// anchors to the real viewport instead, sidestepping that entirely.
export function ScrollHint({ scrollProgress }: { scrollProgress: MotionValue<number> }) {
  const opacity = useTransform(scrollProgress, [0, 0.06], [1, 0]);

  return (
    <motion.div
      style={{ opacity, zIndex: DOM_OVERLAY_Z }}
      className="pointer-events-none fixed inset-x-0 bottom-8 flex flex-col items-center gap-2"
    >
      <span className="text-sm text-muted">Scroll to see it in action</span>
      <motion.svg
        width="22"
        height="22"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="text-muted"
        animate={{ y: [0, 6, 0] }}
        transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
      >
        <path d="M6 9l6 6 6-6" />
      </motion.svg>
    </motion.div>
  );
}
