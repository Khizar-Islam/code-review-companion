import { GoogleGenAI, ApiError } from "@google/genai";

// Tried in order. The two Flash models share a small daily quota (~20/day);
// Flash-Lite is the high-quota (~500/day) last resort.
const MODELS = ["gemini-3.8-flash", "gemini-3.6-flash", "gemini-3.5-flash-lite"];

// Per-request deadline. Without one, a hung call only fails at Node's
// 5-minute header timeout. Generous enough for large multi-file diffs.
const REQUEST_TIMEOUT_MS = 60_000;

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// `status` is the HTTP status from Gemini's API, when the failure came from
// one — lets callers tell a quota error (429) from other failures.
// `timedOut` marks a failure caused by REQUEST_TIMEOUT_MS rather than Gemini.
export class GeminiReviewError extends Error {
  constructor(
    message: string,
    readonly status?: number,
    readonly timedOut = false,
  ) {
    super(message);
    this.name = "GeminiReviewError";
  }
}

// Why a model couldn't serve the request in a way the next model might not
// share: overloaded (503 after retries), out of quota (429), or timed out.
// reviewDiff() falls back to the next model on these, and only these.
type UnavailableReason = "overloaded" | "quota" | "timeout";

class ModelUnavailableError extends Error {
  constructor(
    readonly model: string,
    readonly reason: UnavailableReason,
  ) {
    super(`${model} unavailable (${reason})`);
  }
}

export interface AiFinding {
  filePath: string;
  lineNumber: number | null;
  severity: "critical" | "warning" | "suggestion";
  category: "bug" | "style" | "security" | "cross-file" | "performance";
  message: string;
}

export interface AiReviewResult {
  overallSummary: string;
  findings: AiFinding[];
}

const RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    overallSummary: { type: "string" },
    findings: {
      type: "array",
      items: {
        type: "object",
        properties: {
          filePath: { type: "string" },
          lineNumber: { anyOf: [{ type: "integer" }, { type: "null" }] },
          severity: { type: "string", enum: ["critical", "warning", "suggestion"] },
          category: { type: "string", enum: ["bug", "style", "security", "cross-file", "performance"] },
          message: { type: "string" },
        },
        required: ["filePath", "severity", "category", "message"],
      },
    },
  },
  required: ["overallSummary", "findings"],
};

function buildPrompt(files: { filePath: string; patch: string | null }[]): string {
  const diffText = files
    .filter((f) => f.patch)
    .map((f) => `FILE: ${f.filePath}\n${f.patch}`)
    .join("\n\n");

  return `You are a senior engineer reviewing this pull request. Below is the full diff across all changed files. Review for bugs, security issues, style problems, and especially cross-file issues (e.g. a function signature changed in one file but not updated where it's called in another).

For each finding, set "lineNumber" to the NEW-file line number (the line number after the change is applied, matching how GitHub review comments anchor to diffs) — not the old-file line number. Use null only if a finding doesn't anchor to one specific line.

Also include an "overallSummary" field (2-3 sentences).

DIFF:
${diffText}`;
}

const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 2000;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// The SDK aborts a request that exceeds `httpOptions.timeout`, which
// surfaces as a DOMException named "AbortError" rather than an ApiError.
function isTimeout(err: unknown): boolean {
  return err instanceof Error && err.name === "AbortError";
}

// Calls one model, retrying only on 503 ("temporarily overloaded") with
// backoff. A 429 or timeout gives up on this model at once — a daily quota
// won't recover in seconds, and a hung model is likely to hang again.
// Other errors (bad key, bad request) fail the whole review: every model
// would reject them the same way.
async function generateWithModel(model: string, prompt: string): Promise<string> {
  for (let attempt = 0; ; attempt++) {
    const startedAt = Date.now();
    const logAttempt = (outcome: string) =>
      console.log(`[gemini] ${model} attempt ${attempt + 1}: ${outcome} in ${Date.now() - startedAt}ms`);

    try {
      const response = await ai.models.generateContent({
        model,
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseJsonSchema: RESPONSE_SCHEMA,
          httpOptions: { timeout: REQUEST_TIMEOUT_MS },
        },
      });

      const text = response.text;
      if (!text) throw new GeminiReviewError(`${model} returned an empty response`);
      logAttempt("ok");
      return text;
    } catch (err) {
      if (err instanceof GeminiReviewError) {
        logAttempt("empty response");
        throw err;
      }
      if (isTimeout(err)) {
        logAttempt("timeout");
        throw new ModelUnavailableError(model, "timeout");
      }

      const status = err instanceof ApiError ? err.status : undefined;
      logAttempt(`status ${status ?? "none"}`);

      if (status === 429) throw new ModelUnavailableError(model, "quota");
      if (status === 503) {
        if (attempt < MAX_RETRIES) {
          await sleep(RETRY_DELAY_MS * (attempt + 1));
          continue;
        }
        throw new ModelUnavailableError(model, "overloaded");
      }
      throw new GeminiReviewError(err instanceof Error ? err.message : `${model} request failed`, status);
    }
  }
}

// Builds the error for when every model was unavailable. Reports quota only
// if quota was the reason for all of them — otherwise waiting for the reset
// wouldn't necessarily help. Timeout wins over overload when both occurred,
// since it's the one the user actually waited through.
function allModelsFailedError(failures: ModelUnavailableError[]): GeminiReviewError {
  const detail = failures.map((f) => `${f.model}: ${f.reason}`).join(", ");
  const message = `All Gemini models unavailable (${detail})`;

  if (failures.every((f) => f.reason === "quota")) return new GeminiReviewError(message, 429);
  if (failures.some((f) => f.reason === "timeout")) return new GeminiReviewError(message, undefined, true);
  return new GeminiReviewError(message, 503);
}

export async function reviewDiff(files: { filePath: string; patch: string | null }[]): Promise<AiReviewResult> {
  const prompt = buildPrompt(files);

  const failures: ModelUnavailableError[] = [];
  let text: string | undefined;
  for (const model of MODELS) {
    try {
      text = await generateWithModel(model, prompt);
      break;
    } catch (err) {
      if (!(err instanceof ModelUnavailableError)) throw err;
      failures.push(err);
    }
  }
  if (text === undefined) throw allModelsFailedError(failures);

  try {
    return JSON.parse(text) as AiReviewResult;
  } catch {
    throw new GeminiReviewError("Gemini returned malformed JSON");
  }
}
