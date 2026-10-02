import { test, expect } from "@playwright/test";

// Real device widths worth checking, spanning from a small phone up past
// the 768px breakpoint where the landing page switches from its static
// fallback to the 3D scroll scene — both paths need checking.
const WIDTHS = [320, 375, 393, 412, 427, 768, 1024];

// document.documentElement.scrollWidth > clientWidth is the actual,
// unambiguous signal for "this page has an unwanted horizontal scrollbar" —
// it does NOT false-positive on content that's *intentionally*
// horizontally scrollable inside its own container (e.g. a wide diff table
// inside overflow-x-auto), since that container absorbs its own overflow
// and never lets it reach the document level. That's the real bug this
// project kept re-hitting in different components, so this is what
// actually needs to be zero, not a proxy for it.
for (const width of WIDTHS) {
  test(`no horizontal overflow at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    const result = await page.evaluate(() => {
      const clientWidth = document.documentElement.clientWidth;
      const scrollWidth = document.documentElement.scrollWidth;

      // Best-effort diagnostic only (not the pass/fail signal): elements
      // whose right edge exceeds the viewport, excluding anything
      // contained by an ancestor that's already handling its own overflow
      // (overflow-x: auto/scroll/hidden), since those are the legitimate,
      // intentionally-scrollable/clipped cases.
      function isOverflowContained(el: Element): boolean {
        let node = el.parentElement;
        while (node && node !== document.body) {
          const overflowX = getComputedStyle(node).overflowX;
          if (overflowX === "auto" || overflowX === "scroll" || overflowX === "hidden") return true;
          node = node.parentElement;
        }
        return false;
      }

      const offenders: { selector: string; right: number; text: string }[] = [];
      if (scrollWidth > clientWidth + 1) {
        for (const el of document.querySelectorAll<HTMLElement>("body *")) {
          const rect = el.getBoundingClientRect();
          if (rect.right > clientWidth + 1 && !isOverflowContained(el)) {
            const cls = typeof el.className === "string" && el.className ? "." + el.className.trim().split(/\s+/).join(".") : "";
            offenders.push({
              selector: el.tagName.toLowerCase() + cls,
              right: Math.round(rect.right),
              text: (el.textContent ?? "").trim().slice(0, 60),
            });
          }
        }
      }

      return { clientWidth, scrollWidth, offenders: offenders.slice(0, 8) };
    });

    expect(
      result.scrollWidth,
      `document is ${result.scrollWidth}px wide but viewport is only ${result.clientWidth}px at ${width}px.\n` +
        `Likely offenders:\n${JSON.stringify(result.offenders, null, 2)}`,
    ).toBeLessThanOrEqual(result.clientWidth + 1);
  });
}
