// Checks how TRUST_PROXY_HOPS is read: whole numbers 1 to 5 are used, unset or blank falls
// back to 1 quietly, and anything else falls back to 1 with a warning. Run with: npm test
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseTrustProxyHops } from "./trustProxy";

function parse(raw: string | undefined) {
  const warnings: string[] = [];
  const hops = parseTrustProxyHops(raw, (message) => warnings.push(message));
  return { hops, warnings };
}

describe("parseTrustProxyHops", () => {
  it("uses whole numbers from 1 to 5", () => {
    for (const n of [1, 2, 3, 4, 5]) assert.deepEqual(parse(String(n)), { hops: n, warnings: [] });
  });

  it("allows spaces around the number", () => {
    assert.deepEqual(parse(" 3 "), { hops: 3, warnings: [] });
  });

  it("falls back to 1 without a warning when unset or empty", () => {
    for (const raw of [undefined, "", "   "]) assert.deepEqual(parse(raw), { hops: 1, warnings: [] });
  });

  it("falls back to 1 with a warning for anything else", () => {
    for (const raw of ["0", "6", "-1", "1.5", "abc", "2abc", "+2", "1e1"]) {
      const { hops, warnings } = parse(raw);
      assert.equal(hops, 1, `hops for ${JSON.stringify(raw)}`);
      assert.equal(warnings.length, 1, `warnings for ${JSON.stringify(raw)}`);
      assert.match(warnings[0], /TRUST_PROXY_HOPS/);
    }
  });
});
