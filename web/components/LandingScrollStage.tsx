"use client";

import { useRef } from "react";
import dynamic from "next/dynamic";
import { useScroll } from "framer-motion";
import { LandingCTA } from "./landing/LandingCTA";
import { LandingHero } from "./landing/LandingHero";
import { CodeWatermark } from "./landing/CodeWatermark";
import { ScrollHint } from "./landing/ScrollHint";

const LandingScene = dynamic(() => import("./LandingScene").then((mod) => mod.LandingScene), { ssr: false });

// The scroll track: a tall container whose scroll-through-progress (0-1)
// drives every panel/camera move inside LandingScene, via a sticky canvas
// pinned for the container's full height. Five beats live across that
// range — see LandingScene's evaluatePanel for the exact boundaries.
export function LandingScrollStage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: containerRef, offset: ["start start", "end end"] });

  return (
    <div ref={containerRef} className="relative h-[500vh]">
      <div className="sticky top-0 h-screen w-full overflow-hidden bg-background">
        <CodeWatermark />
        <LandingScene scrollProgress={scrollYProgress} />
        <LandingHero scrollProgress={scrollYProgress} />
        <LandingCTA scrollProgress={scrollYProgress} />
        <ScrollHint scrollProgress={scrollYProgress} />
      </div>
    </div>
  );
}
