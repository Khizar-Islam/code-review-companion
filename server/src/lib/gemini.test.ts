import { before, describe, it, mock } from "node:test";
import assert from "node:assert/strict";

// gemini.ts reads this on import. A placeholder is enough: the one Gemini
// request below is answered by a stub.
process.env.GEMINI_API_KEY ??= "test-key";
// The fallback tests below rely on the default model order.
delete process.env.GEMINI_MODELS;

// Imported after the env is set, rather than with a static import (which
// would run before the line above).
let buildPrompt: typeof import("./gemini").buildPrompt;
let reviewDiff: typeof import("./gemini").reviewDiff;
let parseModelList: typeof import("./gemini").parseModelList;
let DEFAULT_MODELS: typeof import("./gemini").DEFAULT_MODELS;
let MODELS: typeof import("./gemini").MODELS;

before(async () => {
  ({ buildPrompt, reviewDiff, parseModelList, DEFAULT_MODELS, MODELS } = await import("./gemini"));
});

const OMITTED_HEADING = "FILES CHANGED BUT DIFF NOT AVAILABLE (binary or too large):";
const PATCH = "@@ -1 +1 @@\n-a\n+b";

describe("buildPrompt", () => {
  it("tells the model it only sees partial files", () => {
    const prompt = buildPrompt([{ filePath: "a.ts", patch: PATCH }]);
    assert.ok(prompt.includes("you only see part of each file"));
    assert.ok(prompt.includes("Do NOT report something as missing, undefined or not imported unless the diff itself shows the problem"));
    assert.ok(prompt.includes('Use "critical" only for problems clearly visible in the diff.'));
  });

  it("lists files that have no patch instead of dropping them", () => {
    const prompt = buildPrompt([
      { filePath: "a.ts", patch: PATCH },
      { filePath: "logo.png", patch: null },
    ]);
    assert.ok(prompt.includes(`FILE: a.ts\n${PATCH}`));
    assert.ok(prompt.includes(`${OMITTED_HEADING}\n- logo.png\n`));
    assert.ok(!prompt.includes("FILE: logo.png"));
  });

  it("leaves out the omitted-files section when every file has a patch", () => {
    const prompt = buildPrompt([
      { filePath: "a.ts", patch: PATCH },
      { filePath: "b.ts", patch: PATCH },
    ]);
    assert.ok(!prompt.includes(OMITTED_HEADING));
  });
});

describe("reviewDiff", () => {
  it("sends the built prompt to Gemini and returns the parsed result", async () => {
    const result = { overallSummary: "Looks fine.", findings: [] };
    const fetchMock = mock.method(globalThis, "fetch", async () =>
      new Response(JSON.stringify({ candidates: [{ content: { role: "model", parts: [{ text: JSON.stringify(result) }] } }] }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );
    try {
      const files = [
        { filePath: "a.ts", patch: PATCH },
        { filePath: "logo.png", patch: null },
      ];
      assert.deepEqual(await reviewDiff(files), result);
      assert.equal(fetchMock.mock.callCount(), 1);
      const body = String((fetchMock.mock.calls[0].arguments[1] as RequestInit).body);
      assert.ok(body.includes(JSON.stringify(buildPrompt(files)).slice(1, -1)));
    } finally {
      fetchMock.mock.restore();
    }
  });
});

describe("model order", () => {
  it("defaults to 3.6 Flash, then Flash-Lite, then 3.8 Flash", () => {
    assert.deepEqual(DEFAULT_MODELS, ["gemini-3.6-flash", "gemini-3.5-flash-lite", "gemini-3.8-flash"]);
  });

  it("uses the default order when GEMINI_MODELS is unset", () => {
    assert.deepEqual(MODELS, DEFAULT_MODELS);
    assert.deepEqual(parseModelList(undefined), DEFAULT_MODELS);
  });

  it("uses the default order when GEMINI_MODELS is empty or only blanks", () => {
    for (const raw of ["", "   ", " , ,, "]) {
      assert.deepEqual(parseModelList(raw), DEFAULT_MODELS, JSON.stringify(raw));
    }
  });

  it("trims entries, skips blanks and removes duplicates, keeping first-seen order", () => {
    assert.deepEqual(parseModelList(" model-b ,, model-a,model-b , ,model-a"), ["model-b", "model-a"]);
  });
});

function okResponse(): Response {
  const result = { overallSummary: "Looks fine.", findings: [] };
  return new Response(JSON.stringify({ candidates: [{ content: { role: "model", parts: [{ text: JSON.stringify(result) }] } }] }), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}

function errorResponse(status: number): Response {
  return new Response(JSON.stringify({ error: { code: status, message: "stub", status: "stub" } }), {
    status,
    headers: { "content-type": "application/json" },
  });
}

// Runs a review with the first model failing via `failFirst` and every other
// model answering. Returns which model each request went to, in order.
async function reviewWithFirstModelFailing(failFirst: () => Promise<Response>): Promise<string[]> {
  const fetchMock = mock.method(globalThis, "fetch", async (url: string | URL | Request) => {
    const model = /\/models\/([^:]+):/.exec(String(url))?.[1];
    return model === DEFAULT_MODELS[0] ? failFirst() : okResponse();
  });
  try {
    await reviewDiff([{ filePath: "a.ts", patch: PATCH }]);
    return fetchMock.mock.calls.map((c) => /\/models\/([^:]+):/.exec(String(c.arguments[0]))?.[1] ?? "?");
  } finally {
    fetchMock.mock.restore();
  }
}

describe("model fallback", () => {
  it("moves to the next model on 429", async () => {
    assert.deepEqual(await reviewWithFirstModelFailing(async () => errorResponse(429)), DEFAULT_MODELS.slice(0, 2));
  });

  it("moves to the next model on Gemini's 504", async () => {
    assert.deepEqual(await reviewWithFirstModelFailing(async () => errorResponse(504)), DEFAULT_MODELS.slice(0, 2));
  });

  it("moves to the next model on our own timeout", async () => {
    const requests = await reviewWithFirstModelFailing(async () => {
      throw new DOMException("timed out", "AbortError");
    });
    assert.deepEqual(requests, DEFAULT_MODELS.slice(0, 2));
  });

  // Sleeps through the real retry backoff on one model (about 6s).
  it("moves to the next model on 503 once retries run out", async () => {
    const requests = await reviewWithFirstModelFailing(async () => errorResponse(503));
    const [first, second] = DEFAULT_MODELS;
    assert.deepEqual(requests, [first, first, first, second]);
  });
});
