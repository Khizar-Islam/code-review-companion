import { BEATS, clamp01, easeInOutCubic, lerp } from "@/lib/motion";

export type Vec3 = [number, number, number];

export interface PanelKeyframe {
  position: Vec3;
  rotation: Vec3;
  scale: number;
  opacity: number;
}

// Four resting poses per panel: hero (only panel 0 visible, centered), fan
// (all panels spread in an arc — findings/scan beat holds here), collapse
// (panels stack down as if settling into a history timeline), and cta (faded
// out to make room for the closing section).
export function keyframesFor(index: number, total: number): [PanelKeyframe, PanelKeyframe, PanelKeyframe, PanelKeyframe] {
  const isHero = index === 0;
  const center = (total - 1) / 2;
  const spread = index - center;

  const hero: PanelKeyframe = isHero
    ? { position: [0, 0, 0], rotation: [0.06, -0.18, 0.01], scale: 1, opacity: 1 }
    : { position: [0, 0, -1.5], rotation: [0.06, -0.18, 0.01], scale: 0.85, opacity: 0 };

  const fan: PanelKeyframe = {
    position: [spread * 2.6, 0, -Math.abs(spread) * 0.6],
    rotation: [0.04, spread * -0.22, 0],
    scale: 0.82,
    opacity: 1,
  };

  const collapse: PanelKeyframe = {
    position: [spread * 0.5, -2.4 - index * 0.15, -index * 0.2],
    rotation: [0.15, 0, 0],
    // 0.82 -> 0.62 over the fanEnd-collapseEnd window is a similar per-unit
    // rate to hero's 1 -> 0.82 shrink, instead of the much steeper drop a
    // 0.5 target produced here.
    scale: 0.62,
    opacity: 0.6,
  };

  // Scale holds steady into the cta beat — that window is the narrowest of
  // the four, so any further scale delta there would read as the sharpest
  // change of all. Opacity alone carries the "disappearing" job instead.
  const cta: PanelKeyframe = { position: collapse.position, rotation: collapse.rotation, scale: collapse.scale, opacity: 0 };

  return [hero, fan, collapse, cta];
}

export function lerpKeyframe(a: PanelKeyframe, b: PanelKeyframe, t: number): PanelKeyframe {
  return {
    position: [lerp(a.position[0], b.position[0], t), lerp(a.position[1], b.position[1], t), lerp(a.position[2], b.position[2], t)],
    rotation: [lerp(a.rotation[0], b.rotation[0], t), lerp(a.rotation[1], b.rotation[1], t), lerp(a.rotation[2], b.rotation[2], t)],
    scale: lerp(a.scale, b.scale, t),
    opacity: lerp(a.opacity, b.opacity, t),
  };
}

// Beat 0-heroEnd holds at `hero`. heroEnd-fanEnd eases into `fan`. fanEnd-
// scanEnd holds at `fan` (this is where the scan-line/findings beat lives).
// scanEnd-collapseEnd eases into `collapse`. collapseEnd-1 eases into `cta`.
export function evaluatePanel(t: number, kfs: [PanelKeyframe, PanelKeyframe, PanelKeyframe, PanelKeyframe]): PanelKeyframe {
  const [hero, fan, collapse, cta] = kfs;
  if (t <= BEATS.heroEnd) return hero;
  if (t <= BEATS.fanEnd) {
    return lerpKeyframe(hero, fan, easeInOutCubic(clamp01((t - BEATS.heroEnd) / (BEATS.fanEnd - BEATS.heroEnd))));
  }
  if (t <= BEATS.scanEnd) return fan;
  if (t <= BEATS.collapseEnd) {
    return lerpKeyframe(fan, collapse, easeInOutCubic(clamp01((t - BEATS.scanEnd) / (BEATS.collapseEnd - BEATS.scanEnd))));
  }
  return lerpKeyframe(collapse, cta, easeInOutCubic(clamp01((t - BEATS.collapseEnd) / (1 - BEATS.collapseEnd))));
}
