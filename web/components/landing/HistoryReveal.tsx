"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import type { MotionValue } from "framer-motion";
import type { Group, PerspectiveCamera } from "three";
import { ReviewHistoryCard } from "../ReviewHistoryCard";
import type { Review } from "@/lib/types";
import { BEATS, clamp01, damp, DAMPING, easeInOutCubic, lerp } from "@/lib/motion";

// This group's world Z — kept as a constant since the clamp math below needs
// the camera's distance to it, not just its final CSS transform.
const GROUP_Z = 0.5;

// LandingCTA sits at a fixed CSS pixel offset (`top-20`) that doesn't scale
// with viewport size, while this card's screen position comes from
// projecting a 3D world coordinate through a scroll-driven camera — a
// projection whose pixel result *does* scale with viewport height. Nothing
// ties those two coordinate spaces together, so on a short viewport this
// card's natural rise to world Y=0 at full scroll pushes its (perspective-
// scaled) box up into the CTA text. CTA_SAFE_ZONE_PX is the minimum
// on-screen distance-from-top this card's center must stay below —
// approximated from the CTA's measured worst-case bottom edge (~256px) plus
// this card's rendered half-height (~150px) plus a margin. Each frame we
// invert the camera's perspective projection (the same math driving what the
// camera actually shows) to find the world-space Y that produces that screen
// position for the *current* camera distance and viewport height, and clamp
// toward it instead of letting the card rise all the way to Y=0. On a tall
// viewport the clamp resolves above the natural target and never engages;
// on a short one it engages exactly as much as that viewport needs.
const CTA_SAFE_ZONE_PX = 430;

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

  useFrame((state, delta) => {
    const group = groupRef.current;
    const content = contentRef.current;
    if (!group || !content) return;

    const t = scrollProgress.get();
    const local = easeInOutCubic(clamp01((t - BEATS.collapseEnd) / (1 - BEATS.collapseEnd)));
    const targetOpacity = local;

    const fovDeg = (state.camera as PerspectiveCamera).fov ?? 35;
    const depth = Math.max(0.1, state.camera.position.z - GROUP_Z);
    const tanHalfFov = Math.tan((fovDeg * Math.PI) / 360);
    const maxSafeY = depth * tanHalfFov * (1 - (2 * CTA_SAFE_ZONE_PX) / state.size.height);
    const targetY = Math.min(lerp(-0.6, 0, local), maxSafeY);

    currentOpacity.current = damp(currentOpacity.current, targetOpacity, DAMPING.panel, delta);
    currentY.current = damp(currentY.current, targetY, DAMPING.panel, delta);

    group.position.set(0, currentY.current, GROUP_Z);
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
