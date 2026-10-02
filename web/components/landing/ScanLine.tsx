"use client";

import { useEffect, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import type { MotionValue } from "framer-motion";
import type { Mesh, MeshBasicMaterial } from "three";
import { BEATS, clamp01, damp, DAMPING, easeInOutCubic, lerp } from "@/lib/motion";

// Sweeps a few units past the outermost fanned-out panels (x = ±2.6 for the
// current 3-file fan, see keyframes.ts) so it visibly enters and exits
// rather than starting/ending mid-frame.
const SWEEP_START_X = -3.6;
const SWEEP_END_X = 3.6;

// A plain thin bar, not a glow/blur effect (the project's visual direction
// explicitly avoids decorative glow) — reads as a scanner pass rather than
// a special effect. Sweeps left-to-right across the fanEnd-scanEnd hold,
// roughly in step with the same-direction finding stagger in DiffPanel.tsx
// (panel 0 is leftmost and reveals first), without being wired to it
// directly — the sweep is ambient scene-reading motion, not the literal
// cause of each reveal.
export function ScanLine({ scrollProgress }: { scrollProgress: MotionValue<number> }) {
  const meshRef = useRef<Mesh>(null);
  const currentOpacity = useRef(0);
  const currentX = useRef(SWEEP_START_X);

  useEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    const color = getComputedStyle(document.documentElement).getPropertyValue("--scan-line").trim();
    if (color) (mesh.material as MeshBasicMaterial).color.set(color);
  }, []);

  useFrame((_state, delta) => {
    const mesh = meshRef.current;
    if (!mesh) return;

    const t = scrollProgress.get();
    const local = clamp01((t - BEATS.fanEnd) / (BEATS.scanEnd - BEATS.fanEnd));
    // Fades in over the first 12% of the hold and out over the last 12%,
    // rather than popping in/out at the hold's exact edges.
    const targetOpacity = Math.min(clamp01(local / 0.12), clamp01((1 - local) / 0.12));
    const targetX = lerp(SWEEP_START_X, SWEEP_END_X, easeInOutCubic(local));

    currentOpacity.current = damp(currentOpacity.current, targetOpacity, DAMPING.panel, delta);
    currentX.current = damp(currentX.current, targetX, DAMPING.panel, delta);

    mesh.position.x = currentX.current;
    (mesh.material as MeshBasicMaterial).opacity = currentOpacity.current;
    mesh.visible = currentOpacity.current > 0.01;
  });

  return (
    <mesh ref={meshRef} position={[SWEEP_START_X, 0, 0.6]} visible={false}>
      <planeGeometry args={[0.035, 3.2]} />
      <meshBasicMaterial color="#e0973f" transparent opacity={0} depthWrite={false} />
    </mesh>
  );
}
