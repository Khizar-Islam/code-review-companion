// Checks that errors always come back as { error } JSON and that a 5xx never
// leaks the real message. Part A calls the handler directly with fake objects;
// part B runs a tiny Express app (no database, no auth) over real HTTP so
// body-parser's own errors go through it. Run with: npm test
import assert from "node:assert/strict";
import type { AddressInfo } from "node:net";
import { after, before, describe, it, mock } from "node:test";
import express, { type NextFunction, type Request, type Response } from "express";
import { apiNotFound, errorHandler, SERVER_ERROR_MESSAGE } from "./errorHandler";

const SECRET = "connect ECONNREFUSED db.internal:5432 password=hunter2";

// Records what the handler sends instead of writing to a socket.
function fakeRes(headersSent = false) {
  const res = {
    headersSent,
    statusCode: 200,
    body: undefined as unknown,
    status(code: number) {
      res.statusCode = code;
      return res;
    },
    json(body: unknown) {
      res.body = body;
      return res;
    },
  };
  return res;
}

function run(err: unknown, res: ReturnType<typeof fakeRes>) {
  const next = mock.fn();
  errorHandler(err, {} as Request, res as unknown as Response, next as unknown as NextFunction);
  return next;
}

describe("errorHandler (direct calls)", () => {
  it("answers a plain Error with 500 and the fixed message, and logs the real error", (t) => {
    const log = t.mock.method(console, "error", () => {});
    const err = new Error(SECRET);
    const res = fakeRes();
    run(err, res);

    assert.equal(res.statusCode, 500);
    assert.deepEqual(res.body, { error: SERVER_ERROR_MESSAGE });
    assert.ok(!JSON.stringify(res.body).includes("hunter2"));
    assert.equal(log.mock.callCount(), 1);
    assert.equal(log.mock.calls[0].arguments[0], err);
  });

  it("keeps the status and message of an error with statusCode 400", (t) => {
    t.mock.method(console, "error", () => {});
    const res = fakeRes();
    run(Object.assign(new Error("Unexpected token in JSON"), { statusCode: 400 }), res);

    assert.equal(res.statusCode, 400);
    assert.deepEqual(res.body, { error: "Unexpected token in JSON" });
  });

  it("ignores `status` without statusCode: status 401 still gets 500", (t) => {
    t.mock.method(console, "error", () => {});
    const res = fakeRes();
    run(Object.assign(new Error(SECRET), { status: 401 }), res);

    assert.equal(res.statusCode, 500);
    assert.deepEqual(res.body, { error: SERVER_ERROR_MESSAGE });
  });

  it("sends nothing and passes the error on when headers were already sent", (t) => {
    t.mock.method(console, "error", () => {});
    const err = new Error(SECRET);
    const res = fakeRes(true);
    const next = run(err, res);

    assert.equal(res.statusCode, 200);
    assert.equal(res.body, undefined);
    assert.equal(next.mock.callCount(), 1);
    assert.equal(next.mock.calls[0].arguments[0], err);
  });
});

describe("errorHandler (real HTTP)", () => {
  let base = "";
  let server: ReturnType<express.Express["listen"]>;
  let log: ReturnType<typeof mock.method>;

  before(() => {
    log = mock.method(console, "error", () => {});
    const app = express();
    app.use(express.json());
    app.post("/api/boom", () => {
      throw new Error(SECRET);
    });
    app.use("/api", apiNotFound);
    app.use(errorHandler);
    server = app.listen(0);
    base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  });

  after(() => {
    server.close();
    log.mock.restore();
  });

  const postJson = (body: string) =>
    fetch(`${base}/api/boom`, { method: "POST", headers: { "Content-Type": "application/json" }, body });

  it("answers invalid JSON with 400 and an error string", async () => {
    const res = await postJson("{not json");
    assert.equal(res.status, 400);
    const body = (await res.json()) as { error: unknown };
    assert.equal(typeof body.error, "string");
  });

  it("answers a body over 100kb with 413 and JSON", async () => {
    const res = await postJson(JSON.stringify({ pad: "x".repeat(101 * 1024) }));
    assert.equal(res.status, 413);
    assert.match(res.headers.get("content-type") ?? "", /application\/json/);
    const body = (await res.json()) as { error: unknown };
    assert.equal(typeof body.error, "string");
  });

  it("answers an unknown /api route with 404 { error: 'Not found' }", async () => {
    const res = await fetch(`${base}/api/nope`);
    assert.equal(res.status, 404);
    assert.deepEqual(await res.json(), { error: "Not found" });
  });

  it("answers a throwing route with 500 and the fixed message, without the secret", async () => {
    const res = await postJson("{}");
    assert.equal(res.status, 500);
    const text = await res.text();
    assert.ok(!text.includes("hunter2"));
    assert.deepEqual(JSON.parse(text), { error: SERVER_ERROR_MESSAGE });
  });
});
