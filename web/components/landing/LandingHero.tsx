"use client";

import { motion, useTransform } from "framer-motion";
import type { MotionValue } from "framer-motion";
import { BEATS, DOM_OVERLAY_Z } from "@/lib/motion";
import { Headline } from "./Headline";

// The opening beat's headline, pairing with the single centered diff panel
// that keyframes.ts holds through heroEnd. Held at full opacity well past
// ScrollHint's icon-level fade (0-0.06) — a sentence needs longer to read
// than a chevron needs to register — then faded out by heroEnd so it's gone
// before the fan-out beat gets busy with multiple panels.
const FADE_START = 0.12;

export function LandingHero({ scrollProgress }: { scrollProgress: MotionValue<number> }) {
  const opacity = useTransform(scrollProgress, [FADE_START, BEATS.heroEnd], [1, 0]);

  return (
    <motion.div
      style={{ opacity, zIndex: DOM_OVERLAY_Z }}
      className="pointer-events-none absolute inset-x-0 top-20 flex justify-center px-6 text-center"
    >
      <Headline as="h1" />
    </motion.div>
  );
}
