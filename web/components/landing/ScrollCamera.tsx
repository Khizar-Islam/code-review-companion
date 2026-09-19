"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import type { MotionValue } from "framer-motion";
import { BEATS, damp, DAMPING, easeInOutCubic, lerp } from "@/lib/motion";

// Camera and panel scale (keyframes.ts) both affect apparent size, so each
// beat lets only one of them drive it instead of both moving at once:
// hero->fan eases the camera back a little in the same direction panel
// scale is already shrinking (gentler combined shrink than either alone
// used to produce), the camera then holds still through fan/scan/collapse
// so panel scale alone drives that beat's shrink cleanly, and only the
// final collapse->cta stretch moves the camera again — a deliberate push-in
// for the CTA, while panel scale is holding steady by then.
const CAMERA_Z_KEYFRAMES: [number, number][] = [
  [0, 8],
  [BEATS.heroEnd, 8],
  [BEATS.fanEnd, 9],
  [BEATS.scanEnd, 9],
  [BEATS.collapseEnd, 9],
  [1, 6],
];

export function ScrollCamera({ scrollProgress }: { scrollProgress: MotionValue<number> }) {
  const currentZ = useRef(CAMERA_Z_KEYFRAMES[0][1]);

  useFrame((state, delta) => {
    const t = scrollProgress.get();
    let targetZ = CAMERA_Z_KEYFRAMES[CAMERA_Z_KEYFRAMES.length - 1][1];
    for (let i = 0; i < CAMERA_Z_KEYFRAMES.length - 1; i++) {
      const [t0, z0] = CAMERA_Z_KEYFRAMES[i];
      const [t1, z1] = CAMERA_Z_KEYFRAMES[i + 1];
      if (t >= t0 && t <= t1) {
        targetZ = lerp(z0, z1, t1 === t0 ? 0 : easeInOutCubic((t - t0) / (t1 - t0)));
        break;
      }
    }
    currentZ.current = damp(currentZ.current, targetZ, DAMPING.camera, delta);
    state.camera.position.z = currentZ.current;
    state.camera.lookAt(0, 0, 0);
  });
  return null;
}
