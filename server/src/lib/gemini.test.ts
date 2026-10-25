import { before, describe, it, mock } from "node:test";
import assert from "node:assert/strict";

// gemini.ts reads this on import. A placeholder is enough: the one Gemini
// request below is answered by a stub.
process.env.GEMINI_API_KEY ??= "test-key";

// Imported after the env is set, rather than with a static import (which
// would run before the line above).
let buildPrompt: typeof import("./gemini").buildPrompt;
let reviewDiff: typeof import("./gemini").reviewDiff;

before(async () => {
  ({ buildPrompt, reviewDiff } = await import("./gemini"));
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
