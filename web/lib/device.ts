// Capability checks for gating the landing page's 3D/scroll scene. Client-
// only (rely on window/matchMedia), so callers must only use these after
// mount, not during SSR.

// Exported so callers that need to live-subscribe to these (see
// LandingExperience.tsx) use the exact same query strings as the checks
// below, rather than a second hand-copied literal that could drift.
export const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";
export const SMALL_VIEWPORT_QUERY = "(max-width: 768px)";

export function prefersReducedMotion(): boolean {
  return window.matchMedia(REDUCED_MOTION_QUERY).matches;
}

export function isSmallViewport(): boolean {
  return window.matchMedia(SMALL_VIEWPORT_QUERY).matches;
}

export function supportsWebGL(): boolean {
  try {
    const canvas = document.createElement("canvas");
    return !!(canvas.getContext("webgl2") || canvas.getContext("webgl"));
  } catch {
    return false;
  }
}

// The 3D/scroll landing scene is deliberately opt-in: it's WebGL-heavy and
// the panels/text are sized for desktop, so phones and reduced-motion
// preferences get the static fallback instead of a cramped or motion-heavy
// version of the same thing.
export function canRender3DScene(): boolean {
  return !prefersReducedMotion() && !isSmallViewport() && supportsWebGL();
}
