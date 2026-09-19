"use client";

import { Canvas } from "@react-three/fiber";
import type { MotionValue } from "framer-motion";
import { DiffPanel } from "./landing/DiffPanel";
import { ScrollCamera } from "./landing/ScrollCamera";
import { HistoryReveal } from "./landing/HistoryReveal";
import { ScanLine } from "./landing/ScanLine";
import { FAN_FILES, FAN_FINDINGS, LANDING_REVIEW } from "@/lib/landing-sample-data";

// The full scroll-orchestrated scene: hero -> fan-out -> scan/findings ->
// collapse -> history reveal, all driven by `scrollProgress` (0-1). See
// components/landing/keyframes.ts for the per-panel pose math and
// components/landing/DiffPanel.tsx / FindingBubble.tsx / HistoryReveal.tsx
// for the individual beats.
export function LandingScene({ scrollProgress }: { scrollProgress: MotionValue<number> }) {
  return (
    <Canvas camera={{ position: [0, 0, 8], fov: 35 }} gl={{ alpha: true, antialias: true }} dpr={[1, 2]}>
      <ScrollCamera scrollProgress={scrollProgress} />
      <ScanLine scrollProgress={scrollProgress} />
      {FAN_FILES.map((file, index) => (
        <DiffPanel
          key={file.id}
          index={index}
          total={FAN_FILES.length}
          file={file}
          finding={FAN_FINDINGS[index]}
          scrollProgress={scrollProgress}
        />
      ))}
      <HistoryReveal review={LANDING_REVIEW} scrollProgress={scrollProgress} />
    </Canvas>
  );
}
