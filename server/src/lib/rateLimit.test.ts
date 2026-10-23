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

  // reviews.ts registers its limiters in a call of their own, before the handler (see the
  // comment there). That only works if a request the limiter allows falls through to the
  // handler, with the route's :id intact, and one it refuses never reaches the handler.
  it("works when registered separately from the handler", async () => {
    const app = express();
    app.use((req, _res, next) => {
      req.userId = req.get("x-test-user") ?? undefined;
      next();
    });
    const router = express.Router();
    let handlerCalls = 0;
    router.post("/:id/retry", createLimiter({ windowMs: 60_000, limit: 1, message: "x" }, (req) => `user:${req.userId}`));
    router.post("/:id/retry", (req, res) => {
      handlerCalls++;
      res.json({ id: req.params.id });
    });
    app.use("/reviews", router);
    const server = app.listen(0);
    servers.push(server);
    const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
    const post = () => fetch(`${base}/reviews/abc/retry`, { method: "POST", headers: { "x-test-user": "a" } });

    const first = await post();
    assert.equal(first.status, 200);
    assert.deepEqual(await first.json(), { id: "abc" });
    assert.equal((await post()).status, 429);
    assert.equal(handlerCalls, 1);
  });
});
