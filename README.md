# Code Review Companion

Paste a GitHub pull request link and get an AI review that sits on the diff itself. Findings are anchored to the exact lines, grouped by severity, and saved to a personal history.

**Live demo:** https://code-review-companion-navy.vercel.app

> The API runs on a free host, so the first request after a quiet period can take up to a minute. Sign-in is Google only.

<!-- Add 2-3 screenshots here (docs/ folder): the landing page, a review with inline comments, the history page -->

## What it does

- **Fetches the whole PR.** Every changed file comes from the GitHub API, so the review sees the full change, not one pasted file.
- **Reviews across files.** The model gets the complete diff at once, so it can flag a change in one file that breaks a caller in another.
- **Inline findings.** Each finding has a file, a line, a severity (critical, warning, suggestion) and a category (bug, style, security, cross-file, performance), and shows up as a comment on that line of the diff.
- **History.** Past reviews are saved per user and can be reopened or deleted.
- **Landing page.** A 3D scroll scene (React Three Fiber) built from the real diff and finding components. Phones, reduced-motion users and browsers without WebGL get a static version.

## How it works

1. The web app sends the PR URL to the Express API with a signed token.
2. The API fetches the changed files from GitHub and builds one diff.
3. Gemini reviews it and returns JSON in a fixed schema (summary plus findings).
4. The review and findings are saved to Postgres and shown on the diff.

## Design decisions

- **Model fallback.** The review tries three Gemini models in order and moves on if one is overloaded, out of quota or too slow. Each request and the whole AI step have time limits.
- **Stuck reviews.** A review left pending past a time limit is treated as abandoned, so it never spins forever.
- **Auth across two hosts.** NextAuth (Google, JWT sessions) runs on the web app and the API verifies the signed token itself.
- **Overflow test.** A Playwright test checks that no page scrolls sideways at seven phone and tablet widths.

## Tech stack

| Layer | Tools |
|---|---|
| Frontend | Next.js (App Router), TypeScript, Tailwind CSS, Framer Motion, React Three Fiber, react-diff-view |
| Auth | NextAuth with Google OAuth |
| Backend | Node.js, Express, TypeScript |
| Database | PostgreSQL (Neon), Prisma |
| AI | Google Gemini |
| Hosting | Vercel (web), Render (API) |

## Project layout

```
server/       Express API: GitHub fetch, Gemini review, reviews routes
web/          Next.js app: landing page, review pages, diff viewer
render.yaml   Render service for the API
```

## Run it locally

1. Create a Postgres database (Neon works) and a Google OAuth client.
2. In `server/`, create `.env` with `DATABASE_URL`, `DIRECT_URL`, `GITHUB_TOKEN`, `GEMINI_API_KEY`, `API_AUTH_SECRET` and `WEB_ORIGIN`. Then run `npm install`, `npx prisma migrate deploy` and `npm run dev`.
3. In `web/`, create `.env.local` with `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `NEXTAUTH_SECRET`, `API_AUTH_SECRET` (same value as the server) and `NEXT_PUBLIC_API_URL`. Then run `npm install` and `npm run dev`.
4. Open http://localhost:3000.

## Known limits

- Free-tier Gemini quotas limit how many reviews can run per day.
- Very large PRs may be slow or hit model limits.
- Public repos work with the server's GitHub token; private repos are not supported.

## Author

Khizar Islam Rathore, Software Engineering student at the University of Karachi.
GitHub: github.com/Khizar-Islam | LinkedIn: linkedin.com/in/khizar-islam-rathore
