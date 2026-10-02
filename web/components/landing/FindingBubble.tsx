"use client";

import { useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import { AnimatePresence } from "framer-motion";
import type { MotionValue } from "framer-motion";
import { InlineComment } from "../InlineComment";
import type { Finding } from "@/lib/types";
import { BEATS } from "@/lib/motion";

// Local offset, in the parent diff panel's own group space, where the
// bubble sits relative to its panel.
const LOCAL_OFFSET: [number, number, number] = [1.05, -0.55, 0.25];

// Mounted/unmounted (not just opacity-faded) on scroll-threshold crossing so
// InlineComment's own mount animation — slide-in, connector draw, severity
// badge pulse — actually plays at the moment the finding becomes relevant,
// faking the "read top to bottom" pacing called for even though the real AI
// response arrives all at once.
export function FindingBubble({
  finding,
  scrollProgress,
  appearAt,
}: {
  finding: Finding;
  scrollProgress: MotionValue<number>;
  appearAt: number;
}) {
  const [visible, setVisible] = useState(false);
  const wasVisible = useRef(false);

  useFrame(() => {
    const t = scrollProgress.get();
    const shouldShow = t >= appearAt && t < BEATS.collapseEnd;
    if (shouldShow !== wasVisible.current) {
      wasVisible.current = shouldShow;
      setVisible(shouldShow);
    }
  });

  return (
    <group position={LOCAL_OFFSET}>
      <Html transform center distanceFactor={3} style={{ pointerEvents: "none" }}>
        <AnimatePresence>
          {visible && (
            <div className="w-[260px]">
              <InlineComment finding={finding} />
            </div>
          )}
        </AnimatePresence>
      </Html>
    </group>
  );
}
