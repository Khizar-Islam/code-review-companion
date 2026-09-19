"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import type { MotionValue } from "framer-motion";
import type { Group } from "three";
import { ReviewHistoryCard } from "../ReviewHistoryCard";
import type { Review } from "@/lib/types";
import { BEATS, clamp01, damp, DAMPING, easeInOutCubic, lerp } from "@/lib/motion";

// Crossfades in as the diff panels collapse and fade toward the CTA beat —
// the diffs "settling" into a saved review. Reuses the real
// ReviewHistoryCard/FindingCountBar; the wrapping Html carries
// pointer-events:none (same as the diff panels) so the card's internal Link
// is inert here — it's decorative, not a real history entry to navigate to.
export function HistoryReveal({ review, scrollProgress }: { review: Review; scrollProgress: MotionValue<number> }) {
  const groupRef = useRef<Group>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const currentOpacity = useRef(0);
  const currentY = useRef(-0.6);

  useFrame((_state, delta) => {
    const group = groupRef.current;
    const content = contentRef.current;
    if (!group || !content) return;

    const t = scrollProgress.get();
    const local = easeInOutCubic(clamp01((t - BEATS.collapseEnd) / (1 - BEATS.collapseEnd)));
    const targetOpacity = local;
    const targetY = lerp(-0.6, 0, local);

    currentOpacity.current = damp(currentOpacity.current, targetOpacity, DAMPING.panel, delta);
    currentY.current = damp(currentY.current, targetY, DAMPING.panel, delta);

    group.position.set(0, currentY.current, 0.5);
    content.style.opacity = currentOpacity.current.toFixed(3);
    content.style.visibility = currentOpacity.current < 0.02 ? "hidden" : "visible";
  });

  return (
    <group ref={groupRef}>
      <Html transform center distanceFactor={3} style={{ pointerEvents: "none" }}>
        <div ref={contentRef} className="w-[380px]">
          <ReviewHistoryCard review={review} />
        </div>
      </Html>
    </group>
  );
}
