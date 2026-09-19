import { FAN_FILES } from "@/lib/landing-sample-data";

// Decorative background texture for the landing scene — real diff patches
// from the same sample data the scroll scene itself uses (not the project's
// actual source: nothing implementation-level belongs on a public page, even
// faintly), tiled via CSS columns and rendered at near-invisible opacity.
// Purely visual noise, so it's hidden from assistive tech and can't be
// selected or clicked through to whatever's stacked above it.
//
// Real token-level syntax highlighting (keyword/string/number/function),
// not just per-line diff coloring — a lightweight regex tokenizer, not a
// real parser, but enough for the short lines here. Colors are a dedicated
// VS Code Dark+/Light+-inspired palette rather than the app's severity/
// accent tokens: those only cover red/amber/blue-gray (fine for badges,
// not enough distinct hues for keyword vs. string vs. number vs. function).
// Each has a light-mode value and a dark: override, mirroring how the rest
// of the app's tokens split across globals.css's light/dark blocks.
type TokenType = "keyword" | "string" | "comment" | "number" | "function" | "default";
type DiffRole = "hunk" | "add" | "del" | "context";

const KEYWORDS = [
  "const", "let", "var", "function", "async", "await", "return", "if", "else", "import", "export",
  "from", "new", "class", "interface", "type", "extends", "implements", "void", "true", "false",
  "null", "undefined", "this", "typeof", "of", "in", "for", "while", "try", "catch", "throw",
  "describe", "it", "expect", "default",
];

const COMMENT_RE = /\/\/.*$/;
const STRING_RE = /"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`/;
const NUMBER_RE = /\b\d+(?:\.\d+)?\b/;
const KEYWORD_RE = new RegExp(`\\b(?:${KEYWORDS.join("|")})\\b`);
const FUNCTION_RE = /\b[a-zA-Z_$][\w$]*(?=\()/;

const TOKEN_REGEX = new RegExp(
  [
    `(?<comment>${COMMENT_RE.source})`,
    `(?<string>${STRING_RE.source})`,
    `(?<number>${NUMBER_RE.source})`,
    `(?<keyword>${KEYWORD_RE.source})`,
    `(?<func>${FUNCTION_RE.source})`,
  ].join("|"),
  "g",
);

function tokenize(code: string): { text: string; type: TokenType }[] {
  const segments: { text: string; type: TokenType }[] = [];
  let lastIndex = 0;
  TOKEN_REGEX.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = TOKEN_REGEX.exec(code))) {
    if (match.index > lastIndex) segments.push({ text: code.slice(lastIndex, match.index), type: "default" });
    const groups = match.groups ?? {};
    const type: TokenType = groups.comment
      ? "comment"
      : groups.string
        ? "string"
        : groups.number
          ? "number"
          : groups.keyword
            ? "keyword"
            : "function";
    segments.push({ text: match[0], type });
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < code.length) segments.push({ text: code.slice(lastIndex), type: "default" });
  return segments;
}

const SYNTAX_COLOR: Record<TokenType, string> = {
  keyword: "text-[#0000ff]/[0.18] dark:text-[#569cd6]/[0.20]",
  string: "text-[#a31515]/[0.18] dark:text-[#ce9178]/[0.20]",
  comment: "text-[#008000]/[0.12] dark:text-[#6a9955]/[0.12]",
  number: "text-[#098658]/[0.15] dark:text-[#b5cea8]/[0.17]",
  function: "text-[#795e26]/[0.17] dark:text-[#dcdcaa]/[0.18]",
  default: "text-foreground/[0.07]",
};
const MARKER_COLOR: Record<"add" | "del", string> = {
  add: "text-accent/[0.35]",
  del: "text-severity-critical/[0.35]",
};
const HUNK_COLOR = "text-severity-suggestion/[0.14]";

function classify(line: string): DiffRole {
  if (line.startsWith("+")) return "add";
  if (line.startsWith("-")) return "del";
  if (line.startsWith("@@")) return "hunk";
  return "context";
}

type Line = { role: DiffRole; text: string };

const SNIPPET_LINES: Line[] = FAN_FILES.flatMap((file) => [
  { text: `// ${file.filePath}`, role: "context" as const },
  ...(file.patch ?? "").split("\n").map((text) => ({ text, role: classify(text) })),
  { text: "", role: "context" as const },
]);
const SNIPPET_LINES_REVERSED = [...SNIPPET_LINES].reverse();

// Just enough repeats to fill the columns without huge empty gaps — more was
// producing an obviously-tiling wallpaper (the same short block repeating
// several times within a single view). Alternating forward/reversed order
// per repeat also breaks up the "identical block" read on the repeats that
// do end up in view, without needing more source content.
const TILED_LINES = Array.from({ length: 6 }, (_, i) => (i % 2 === 0 ? SNIPPET_LINES : SNIPPET_LINES_REVERSED)).flat();

// Radial mask: most opaque toward the viewport edges, dimmer (not fully
// hidden) toward the center — a soft floor rather than a hard cutoff, so the
// pattern reads as one continuous texture behind the whole scene instead of
// two separate patches with dead space between them and the diff cards. The
// underlying text opacities above are already low, so even the "full"
// 100%-mask edges stay subtle; this mask only ever scales that down further,
// never up. Uses white (not black) for the "fully show" stop: modern
// mask-image is alpha-based (any opaque color shows), but Safari's
// -webkit-mask-image defaults to luminance-based masking, where black reads
// as hidden regardless of alpha — white has full alpha *and* full luminance,
// so it shows under both models; the partial stops use rgba() with white so
// the same holds at partial opacity too.
const EDGE_FADE_MASK =
  "radial-gradient(ellipse at center, rgba(255,255,255,0.3) 0%, rgba(255,255,255,0.55) 40%, white 85%)";

function DiffLine({ line }: { line: Line }) {
  if (line.role === "hunk") {
    return <div className={`whitespace-pre ${HUNK_COLOR}`}>{line.text}</div>;
  }
  const marker = line.role === "add" || line.role === "del" ? line.text[0] : null;
  const code = marker ? line.text.slice(1) : line.text;
  return (
    <div className="whitespace-pre">
      {marker && <span className={MARKER_COLOR[line.role as "add" | "del"]}>{marker}</span>}
      {tokenize(code).map((seg, i) => (
        <span key={i} className={SYNTAX_COLOR[seg.type]}>
          {seg.text}
        </span>
      ))}
      {!code && !marker && " "}
    </div>
  );
}

export function CodeWatermark() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 select-none overflow-hidden"
      style={{ maskImage: EDGE_FADE_MASK, WebkitMaskImage: EDGE_FADE_MASK }}
    >
      <div className="columns-2 gap-12 p-8 font-mono text-[11px] leading-relaxed lg:columns-3">
        {TILED_LINES.map((line, i) => (
          <DiffLine key={i} line={line} />
        ))}
      </div>
    </div>
  );
}
