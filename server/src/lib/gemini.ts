import { GoogleGenAI, ApiError } from "@google/genai";

const PRIMARY_MODEL = "gemini-3.8-flash";
const FALLBACK_MODEL = "gemini-3.6-flash";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// `status` is the HTTP status from Gemini's API, when the failure came from
// one — lets callers tell a quota error (429) from other failures.
export class GeminiReviewError extends Error {
  constructor(message: string, readonly status?: number) {
    super(message);
    this.name = "GeminiReviewError";
  }
}

// Thrown only when a model's retries were exhausted specifically on 503
// (Gemini's "temporarily overloaded" signal) — the one case reviewDiff()
// falls back to a different model for, rather than giving up.
class ModelUnavailableError extends Error {}

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

// Retries a single model on 503 ("temporarily overloaded") with backoff.
// Any other error fails immediately — retrying a bad key or bad request
// would just waste time.
async function generateWithModel(model: string, prompt: string): Promise<string> {
  for (let attempt = 0; ; attempt++) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseJsonSchema: RESPONSE_SCHEMA,
        },
      });

      const text = response.text;
      if (!text) throw new GeminiReviewError(`${model} returned an empty response`);
      return text;
    } catch (err) {
      const isOverloaded = err instanceof ApiError && err.status === 503;

      if (isOverloaded && attempt < MAX_RETRIES) {
        await sleep(RETRY_DELAY_MS * (attempt + 1));
        continue;
      }
      if (isOverloaded) {
        throw new ModelUnavailableError(`${model} is overloaded`);
      }
      throw new GeminiReviewError(
        err instanceof Error ? err.message : `${model} request failed`,
        err instanceof ApiError ? err.status : undefined,
      );
    }
  }
}

export async function reviewDiff(files: { filePath: string; patch: string | null }[]): Promise<AiReviewResult> {
  const prompt = buildPrompt(files);

  let text: string;
  try {
    text = await generateWithModel(PRIMARY_MODEL, prompt);
  } catch (err) {
    if (!(err instanceof ModelUnavailableError)) throw err;

    // Primary model is consistently overloaded even after retries — fall
    // back to the previous-generation Flash model rather than failing outright.
    try {
      text = await generateWithModel(FALLBACK_MODEL, prompt);
    } catch (fallbackErr) {
      if (fallbackErr instanceof ModelUnavailableError) {
        throw new GeminiReviewError(`Both ${PRIMARY_MODEL} and ${FALLBACK_MODEL} are currently overloaded`);
      }
      throw fallbackErr;
    }
  }

  try {
    return JSON.parse(text) as AiReviewResult;
  } catch {
    throw new GeminiReviewError("Gemini returned malformed JSON");
  }
}
