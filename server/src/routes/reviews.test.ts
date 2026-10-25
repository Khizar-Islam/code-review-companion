import { before, describe, it, mock } from "node:test";
import assert from "node:assert/strict";

// reviews.ts pulls in github.ts and gemini.ts, which read these on import.
// Placeholders are enough: every Gemini request below is answered by a stub,
// and nothing here touches GitHub or the database.
process.env.GITHUB_TOKEN ??= "test-token";
process.env.GEMINI_API_KEY ??= "test-key";

// Imported after the env is set, rather than with a static import (which
// would run before the lines above).
let reviewDiff: typeof import("../lib/gemini").reviewDiff;
let GeminiReviewError: typeof import("../lib/gemini").GeminiReviewError;
let toUserFacingMessage: typeof import("./reviews").toUserFacingMessage;

before(async () => {
  ({ reviewDiff, GeminiReviewError } = await import("../lib/gemini"));
  ({ toUserFacingMessage } = await import("./reviews"));
});

const TIMEOUT_MESSAGE = "The AI took too long to respond. This usually passes, so press Retry.";
const QUOTA_MESSAGE = "The AI service is busy right now. Try again in a few minutes, or later today if it keeps happening.";
const GENERIC_MESSAGE = "Review failed due to an unexpected error. Please retry.";

// Every stubbed failure carries this text. None of it may reach the user.
const RAW_TEXT = "RAW-GEMINI-DETAIL";

const MODEL_COUNT = 3;

function geminiErrorResponse(status: number): Response {
  return new Response(JSON.stringify({ error: { code: status, message: RAW_TEXT, status: RAW_TEXT } }), {
    status,
    headers: { "content-type": "application/json" },
  });
}

// Runs a whole review through the real SDK with every Gemini request answered
// by `respond`. Returns the message the failed review would be saved with, and
// how many requests were made (one per model tried).
async function failReview(respond: () => Promise<Response>): Promise<{ message: string; requests: number }> {
  const fetchMock = mock.method(globalThis, "fetch", respond);
  try {
    await reviewDiff([{ filePath: "a.ts", patch: "@@ -1 +1 @@\n-a\n+b" }]);
  } catch (err) {
    return { message: toUserFacingMessage(err), requests: fetchMock.mock.callCount() };
  } finally {
    fetchMock.mock.restore();
  }
  assert.fail("expected the review to fail");
}

function assertNoRawText(message: string) {
  assert.ok(!message.includes(RAW_TEXT), `message leaks raw error text: ${message}`);
}

describe("failed review messages", () => {
  it("our own timeout: tries every model, then reports a timeout", async () => {
    const { message, requests } = await failReview(async () => {
      throw new DOMException(RAW_TEXT, "AbortError");
    });
    assert.equal(message, TIMEOUT_MESSAGE);
    assert.equal(requests, MODEL_COUNT);
    assertNoRawText(message);
  });

  for (const status of [504, 408]) {
    it(`Gemini ${status}: tries every model, then reports a timeout`, async () => {
      const { message, requests } = await failReview(async () => geminiErrorResponse(status));
      assert.equal(message, TIMEOUT_MESSAGE);
      assert.equal(requests, MODEL_COUNT);
      assertNoRawText(message);
    });
  }

  it("429 on every model: reports the quota message", async () => {
    const { message, requests } = await failReview(async () => geminiErrorResponse(429));
    assert.equal(message, QUOTA_MESSAGE);
    assert.equal(requests, MODEL_COUNT);
    assertNoRawText(message);
  });

  // The full 503 path sleeps through real retry backoff (about 18s across all
  // models), so this checks the error reviewDiff ends with in that case.
  it("503 on every model: reports the timeout message", () => {
    const message = toUserFacingMessage(new GeminiReviewError(`All Gemini models unavailable (${RAW_TEXT})`, 503));
    assert.equal(message, TIMEOUT_MESSAGE);
    assertNoRawText(message);
  });

  it("unknown error: fails at once with the generic message", async () => {
    const { message, requests } = await failReview(async () => geminiErrorResponse(400));
    assert.equal(message, GENERIC_MESSAGE);
    assert.equal(requests, 1);
    assertNoRawText(message);
  });
});
