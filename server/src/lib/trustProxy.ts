// How many proxies sit in front of the API in production, so req.ip is the visitor's address
// and not a proxy's: Express takes the X-Forwarded-For entry that many hops from the right.
// Set with TRUST_PROXY_HOPS. Unset or blank means 1; anything that isn't a whole number from
// 1 to 5 also means 1, with a warning so a typo doesn't go unnoticed.
export const DEFAULT_TRUST_PROXY_HOPS = 1;
const MAX_TRUST_PROXY_HOPS = 5;

export function parseTrustProxyHops(raw: string | undefined, warn: (message: string) => void = console.warn): number {
  const value = raw?.trim() ?? "";
  if (value === "") return DEFAULT_TRUST_PROXY_HOPS;
  // Whole string must be digits: parseInt would read "2abc" as 2.
  if (/^\d+$/.test(value)) {
    const hops = Number(value);
    if (hops >= 1 && hops <= MAX_TRUST_PROXY_HOPS) return hops;
  }
  warn(
    `TRUST_PROXY_HOPS must be a whole number from 1 to ${MAX_TRUST_PROXY_HOPS}, got ${JSON.stringify(raw)}. ` +
      `Using ${DEFAULT_TRUST_PROXY_HOPS}.`,
  );
  return DEFAULT_TRUST_PROXY_HOPS;
}
