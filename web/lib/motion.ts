// Shared easing/duration constants for the landing page's scroll-driven
// animation. Kept separate from globals.css because Framer Motion consumes
// these as JS values (cubic-bezier arrays), not CSS custom properties.

export const EASE_SCROLL: [number, number, number, number] = [0.22, 1, 0.36, 1];
export const EASE_SETTLE: [number, number, number, number] = [0.16, 1, 0.3, 1];

export const DURATION_PANEL = 0.6;
export const DURATION_FINDING_POP = 0.35;
export const DURATION_CONNECTOR_DRAW = 0.4;

// Scroll progress (0-1) boundaries for the landing page's five beats. Shared
// between the R3F scroll rig (per-frame lerp, needs plain numbers) and any
// DOM overlays, so both stay in lockstep off one source of truth.
export const BEATS = {
  heroEnd: 0.2,
  fanEnd: 0.45,
  scanEnd: 0.7,
  collapseEnd: 0.9,
} as const;

export function clamp01(value: number) {
  return Math.min(1, Math.max(0, value));
}

export function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

// Numeric equivalent of EASE_SETTLE for use inside useFrame, where we lerp
// plain numbers every tick rather than animating a Framer Motion value.
export function easeInOutCubic(t: number) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

// Frame-rate-independent exponential smoothing: moves `current` toward
// `target` by a fraction that depends on elapsed time, not frame count, so
// the same damping feels identical at 30fps and 144fps. Scroll progress
// itself is choppy (wheel/trackpad delta events arrive in irregular,
// sometimes large jumps), and snapping panel transforms directly to it every
// frame carries that choppiness straight into the animation. Damping the
// *output* toward the scroll-derived target — rather than the raw scroll
// value — is what turns that into a smooth, slightly-trailing motion.
// Higher lambda = snappier/less lag, lower = smoother/more trailing.
export function damp(current: number, target: number, lambda: number, delta: number) {
  return lerp(current, target, 1 - Math.exp(-lambda * delta));
}

export const DAMPING = {
  panel: 7,
  camera: 5,
} as const;
