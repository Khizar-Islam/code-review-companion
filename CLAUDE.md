# AI Code Review Companion — Project Context

Read this whole file before writing any code. This is a portfolio project for a
3rd-year Software Engineering student (Khizar) actively job hunting — it needs to be
genuinely impressive, not just functional.

---

## How to Work With Me

- I can read code fine, but I'm inexperienced with deployment, terminal debugging, and
  unfamiliar errors — explain what's happening when something breaks, don't just fix
  it silently.
- Before writing code, give me a plan and let me confirm or adjust it first.
- Work incrementally — plumbing before polish (see Build Order below). Don't jump
  straight to the flashy landing page before the core app actually works.
- When something fails, walk through diagnosing it with me rather than guessing at a
  fix blind.
- I'm using free-tier services only where possible (Neon for Postgres, Gemini for AI).
  Flag anything that might require payment before setting it up.
- Check if you have any relevant built-in skills (e.g. ones related to visual design
  taste, or scroll-based web experiences) before building the landing page — I've
  heard there may be skills useful for this kind of ambitious UI work, worth checking
  what's available before building from scratch.

---

## Core Concept

Paste a GitHub PR link → tool fetches the full diff across all changed files → AI
reviews it with real cross-file diff context → findings render as inline, line-
anchored comments directly on the diff, categorized by severity → review is saved to
a personal history.

**The pitch, for reference (don't oversell this back to me, but keep it in mind for
what to prioritize building well):**
1. Diff-awareness — reviews real GitHub diffs with before/after context, not pasted
   text blobs
2. Structured, line-anchored output — inline comments on exact lines, not a wall of
   prose
3. Persistent history — reviews are saved, so patterns across time become visible
4. Cross-file context — the AI sees the whole PR at once, catching bugs where a
   change in one file breaks something in another
5. One-click workflow — paste a link, done, vs. manually pasting code into a chatbot
   every time

## Tech Stack

- Frontend: Next.js (App Router), TypeScript, Tailwind CSS v4, Framer Motion
- Backend: Node.js + Express
- Database: PostgreSQL (Neon, free tier) + Prisma
- AI: Gemini API — **verify the current free-tier model name before writing the AI
  service code**, these get deprecated for new API keys faster than their official
  shutdown dates suggest (learned this the hard way on a previous project)
- GitHub integration: GitHub REST API for fetching PR diffs (Personal Access Token to
  start; OAuth App later if multi-user GitHub linking is needed)
- Diff rendering: `react-diff-view` or `diff2html`
- Auth: NextAuth.js + Google OAuth (with Prisma adapter)

**Known gotcha carried over from a previous project**: NextAuth's Prisma adapter
hardcodes the model names `Account`, `Session`, `VerificationToken` — these cannot be
renamed via config. Plan schema model names around this from the start (e.g. don't
name anything else `Session`).

## Database Schema (Prisma)

```prisma
model User {
  id        String   @id @default(uuid())
  email     String   @unique
  name      String?
  createdAt DateTime @default(now())
  reviews   Review[]
}

model Review {
  id             String   @id @default(uuid())
  userId         String
  user           User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  prUrl          String
  prTitle        String?
  repoName       String?
  status         String   @default("pending") // pending, completed, failed
  overallSummary String?
  createdAt      DateTime @default(now())
  findings       Finding[]
}

model Finding {
  id         String   @id @default(uuid())
  reviewId   String
  review     Review   @relation(fields: [reviewId], references: [id], onDelete: Cascade)
  filePath   String
  lineNumber Int?
  severity   String   // critical, warning, suggestion
  category   String   // bug, style, security, cross-file, performance
  message    String
  createdAt  DateTime @default(now())
}
```

## API Routes

```
POST   /api/reviews                 { prUrl } → fetches diff, triggers AI review
GET    /api/reviews/:id             get one review with all findings
GET    /api/reviews/user/:userId    list past reviews (history)
DELETE /api/reviews/:id             delete a review
```

## AI Integration Design

**Step 1 — Fetch the diff** via GitHub API:
```
GET https://api.github.com/repos/{owner}/{repo}/pulls/{pull_number}/files
```

**Step 2 — Send the full multi-file diff to Gemini**:
> "You are a senior engineer reviewing this pull request. Below is the full diff
> across all changed files. Review for bugs, security issues, style problems, and
> especially cross-file issues (e.g. a function signature changed in one file but
> not updated where it's called in another). For each finding, respond in this exact
> JSON format: [{"filePath": "...", "lineNumber": N, "severity": "critical|warning|
> suggestion", "category": "bug|style|security|cross-file|performance", "message":
> "..."}]. Also include one overallSummary field (2-3 sentences).
>
> DIFF:
> {full multi-file diff text}"

**Step 3 — Parse the JSON response**, save `Review` + `Finding` rows, return to frontend.

## Frontend Page Structure

```
/app
  /page.tsx                    Landing page — see "Ambitious Landing Page" below
  /reviews/page.tsx            History — list of past reviews
  /reviews/new/page.tsx        Paste a PR URL, trigger review
  /reviews/[reviewId]/page.tsx The actual diff view with inline AI comments
  /components/
    DiffViewer.tsx             renders the unified diff, syntax highlighted
    InlineComment.tsx          a finding rendered as an anchored comment bubble
    SeverityBadge.tsx          critical/warning/suggestion pill
    ReviewSummaryCard.tsx      the AI's overall summary + finding counts
    ReviewHistoryCard.tsx      one row in the history list
```

---

## Ambitious Landing Page — this is a deliberate, serious request

I want the main landing page to be genuinely spectacular — not just "nice," but the
kind of thing that makes someone stop scrolling. Think 3D elements (code blocks
floating in space, a diff visualization rendered in 3D, particles that react to
scroll or cursor movement) combined with scroll-driven storytelling, where content
transforms and reveals itself tied directly to scroll position rather than simple
fade-ins.

Reasonable tools for this: Three.js / React Three Fiber for actual 3D scenes, GSAP
with ScrollTrigger or Framer Motion's `useScroll`/`useTransform` for scroll-linked
animation.

**Be honest with me if something is a bad idea or too time-costly** — I'd rather know
upfront than discover it three hours in. But don't talk me out of the ambition
itself; help me find the most achievable version of "genuinely impressive," even if
it takes iteration to get right. This specific page is worth spending real time on.

## Animation Details — Elsewhere in the App

Beyond the landing page, animate generously throughout, not just in a few signature
moments:
- Findings populate one at a time, staggered, as if being read top to bottom (even
  though the real AI response arrives all at once — fake the pacing deliberately)
- Inline comment bubbles slide in and anchor to their line with a drawn connecting
  line (SVG path animation)
- Severity badges pulse once on appearance, color-coded, then settle
- Hovering a finding highlights its diff line(s) and vice versa — two-way connection
- Diff lines animate their background tint in on load, top to bottom
- Review history cards show an animated finding-count breakdown bar
- Clicking a history card triggers a shared-element transition (Framer Motion
  `layoutId`) into the full review page
- While waiting for a review, cycle through phrases ("Fetching diff...", "Reading
  changed files...", "Checking cross-file references...") instead of a generic spinner
- Every interactive element gets real hover/press feedback — nothing static

## Visual Design Direction — avoid generic "AI slop" UI

Avoid: glowing borders slapped on for emphasis, generic purple-to-blue gradients,
floating blurred orbs as decoration, overused glassmorphism, identical icon-in-circle
patterns everywhere. Instead: pick a genuinely considered palette and type pairing,
and let hierarchy come from typography/spacing/color restraint rather than glow
effects — the landing page's 3D/scroll spectacle is the one place to go big, not a
default applied everywhere.

## Suggested Build Order

1. DB schema + basic CRUD API (no GitHub fetch, no AI yet — seed fake review data)
2. Frontend pages with fake seeded data — get the diff viewer + inline comment
   animations right before real data flows in, since this is the hardest UI piece
3. Wire up real GitHub API fetching
4. Add the real AI review call last
5. Auth
6. **The ambitious 3D/scroll landing page — deliberately last**, once the core app
   actually works end to end
7. Polish + deploy

## Honest Scope Notes

- The diff viewer + inline comment anchoring is harder than the AI integration itself
  — budget real time for it.
- The 3D/scroll landing page is genuinely time-expensive to get right; badly executed
  versions look worse than restrained design, so expect to iterate rather than nail
  it in one pass. This is why it's last in the build order — everything else should
  work first.
