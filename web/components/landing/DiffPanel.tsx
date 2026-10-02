"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import type { MotionValue } from "framer-motion";
import type { Group } from "three";
import { DiffFile } from "../DiffFile";
import type { Finding, ReviewFile } from "@/lib/types";
import { BEATS, damp, DAMPING } from "@/lib/motion";
import { evaluatePanel, keyframesFor, type PanelKeyframe } from "./keyframes";
import { FindingBubble } from "./FindingBubble";

const FINDING_STAGGER = 0.05;

export function DiffPanel({
  index,
  total,
  file,
  finding,
  scrollProgress,
}: {
  index: number;
  total: number;
  file: ReviewFile;
  finding: Finding;
  scrollProgress: MotionValue<number>;
}) {
  const groupRef = useRef<Group>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const keyframes = useMemo(() => keyframesFor(index, total), [index, total]);
  // Smoothed pose, trailing the scroll-derived target rather than snapping
  // to it — see lib/motion.ts `damp`. Seeded to the hero pose since scroll
  // starts at the top.
  const currentRef = useRef<PanelKeyframe>(keyframes[0]);

  // Mutate the group/DOM node directly instead of using React state, so
  // scroll doesn't trigger a re-render on every tick.
  useFrame((_state, delta) => {
    const group = groupRef.current;
    const content = contentRef.current;
    if (!group || !content) return;

    const target = evaluatePanel(scrollProgress.get(), keyframes);
    const current = currentRef.current;
    const d = DAMPING.panel;
    current.position = [
      damp(current.position[0], target.position[0], d, delta),
      damp(current.position[1], target.position[1], d, delta),
      damp(current.position[2], target.position[2], d, delta),
    ];
    current.rotation = [
      damp(current.rotation[0], target.rotation[0], d, delta),
      damp(current.rotation[1], target.rotation[1], d, delta),
      damp(current.rotation[2], target.rotation[2], d, delta),
    ];
    current.scale = damp(current.scale, target.scale, d, delta);
    current.opacity = damp(current.opacity, target.opacity, d, delta);

    group.position.set(...current.position);
    group.rotation.set(...current.rotation);
    group.scale.setScalar(current.scale);
    content.style.opacity = current.opacity.toFixed(3);
    content.style.visibility = current.opacity < 0.02 ? "hidden" : "visible";
  });

  return (
    <group ref={groupRef}>
      <Html transform center distanceFactor={3} style={{ pointerEvents: "none" }}>
        <div ref={contentRef} className="w-[420px]" style={{ boxShadow: "var(--panel-shadow)" }}>
          <DiffFile file={file} findings={[]} />
        </div>
      </Html>
      <FindingBubble finding={finding} scrollProgress={scrollProgress} appearAt={BEATS.fanEnd + index * FINDING_STAGGER} />
    </group>
  );
}
