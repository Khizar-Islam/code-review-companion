// Runs the limiter on a tiny Express app (no database, no real auth) to check that requests
// over the limit get a 429 with a usable body, that users are counted separately, and that
// the limit resets after the window. Run with: npm test
import assert from "node:assert/strict";
import type { AddressInfo } from "node:net";
import { after, describe, it } from "node:test";
import express from "express";
import { createLimiter } from "./rateLimit";

const servers: Array<{ close: () => void }> = [];
after(() => servers.forEach((s) => s.close()));

// The user id comes from the x-test-user header, standing in for what requireUser sets.
async function start(options: { windowMs: number; limit: number; message: string }) {
  const app = express();
  app.use((req, _res, next) => {
    const id = req.get("x-test-user");
    if (id) req.userId = id;
    next();
  });
  app.post("/review", createLimiter(options, (req) => (req.userId ? `user:${req.userId}` : "anon")), (_req, res) => {
    res.json({ ok: true });
  });
  const server = app.listen(0);
  servers.push(server);
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  return (user: string) => fetch(`${base}/review`, { method: "POST", headers: { "x-test-user": user } });
}

describe("rate limiter", () => {
  it("allows requests up to the limit, then answers 429 with a message and Retry-After", async () => {
    const post = await start({ windowMs: 60_000, limit: 3, message: "Slow down." });
    for (let i = 0; i < 3; i++) assert.equal((await post("a")).status, 200);

    const blocked = await post("a");
    assert.equal(blocked.status, 429);
    const body = (await blocked.json()) as { error: string; code: string; retryAfterSeconds: number };
    assert.equal(body.error, "Slow down.");
    assert.equal(body.code, "rate_limited");
    assert.ok(body.retryAfterSeconds >= 1 && body.retryAfterSeconds <= 60);
    assert.equal(blocked.headers.get("retry-after"), String(body.retryAfterSeconds));
  });

  it("counts each user separately", async () => {
    const post = await start({ windowMs: 60_000, limit: 1, message: "x" });
    assert.equal((await post("a")).status, 200);
    assert.equal((await post("a")).status, 429);
    assert.equal((await post("b")).status, 200); // b has their own budget
  });

  it("lets requests through again after the window", async () => {
    const post = await start({ windowMs: 300, limit: 1, message: "x" });
    assert.equal((await post("a")).status, 200);
    assert.equal((await post("a")).status, 429);
    await new Promise((r) => setTimeout(r, 400));
    assert.equal((await post("a")).status, 200);
  });
});
