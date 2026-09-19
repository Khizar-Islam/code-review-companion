"use client";

import { useSyncExternalStore } from "react";
import { LandingScrollStage } from "./LandingScrollStage";
import { LandingStaticFallback } from "./landing/LandingStaticFallback";
import { canRender3DScene, REDUCED_MOTION_QUERY, SMALL_VIEWPORT_QUERY } from "@/lib/device";

// WebGL support can't change after mount, but viewport width and
// prefers-reduced-motion genuinely can — a window resize, rotating a phone,
// DevTools device emulation switching size, or toggling the OS setting all
// fire without a page reload. A no-op subscribe (an earlier version of this
// file had one) means React never re-checks canRender3DScene() after the
// first render, so the 3D scene can get stuck on even after the viewport
// becomes too small for it. Subscribing to both media queries' change
// events is what makes the gate actually live.
function subscribe(callback: () => void) {
  const motionQuery = window.matchMedia(REDUCED_MOTION_QUERY);
  const widthQuery = window.matchMedia(SMALL_VIEWPORT_QUERY);
  motionQuery.addEventListener("change", callback);
  widthQuery.addEventListener("change", callback);
  return () => {
    motionQuery.removeEventListener("change", callback);
    widthQuery.removeEventListener("change", callback);
  };
}

function getServerSnapshot() {
  return false;
}

// Entry point for the landing page. Renders the static fallback by default
// (safe for SSR/first paint — getServerSnapshot can't know browser
// capabilities) and upgrades to the 3D scroll scene after mount only if the
// browser both can and should render it — see lib/device.ts. Capable users
// see a brief static-first flash before the upgrade; that's the deliberate
// trade-off for never shipping motion/WebGL to someone who can't (or asked
// not to) handle it.
export function LandingExperience() {
  const enable3D = useSyncExternalStore(subscribe, canRender3DScene, getServerSnapshot);
  if (!enable3D) return <LandingStaticFallback />;
  return <LandingScrollStage />;
}
