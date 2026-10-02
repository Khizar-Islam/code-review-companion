import "server-only";
import jwt from "jsonwebtoken";

// Tokens the Express API accepts in place of a trusted userId. Signed with
// API_AUTH_SECRET, which only this Next.js server and the API know — the
// browser only ever holds the short-lived signed result.
// Issuer/audience must match what server/src/lib/auth.ts verifies.
const ISSUER = "code-review-web";
const AUDIENCE = "code-review-api";

// Short, because a fresh one is minted on every session read (see the
// session callback in lib/auth.ts) — nothing needs to hold one for long.
const USER_TOKEN_TTL = "15m";
const USER_SYNC_TOKEN_TTL = "1m";

function secret(): string {
  const value = process.env.API_AUTH_SECRET;
  if (!value) throw new Error("API_AUTH_SECRET is not set");
  return value;
}

// Identifies the signed-in user to the API.
export function mintUserToken(userId: string): string {
  return jwt.sign({ scope: "user" }, secret(), {
    algorithm: "HS256",
    subject: userId,
    issuer: ISSUER,
    audience: AUDIENCE,
    expiresIn: USER_TOKEN_TTL,
  });
}

// Authorizes the sign-in upsert to POST /api/users, which runs before a
// user id exists to put in a user token.
export function mintUserSyncToken(): string {
  return jwt.sign({ scope: "user-sync" }, secret(), {
    algorithm: "HS256",
    issuer: ISSUER,
    audience: AUDIENCE,
    expiresIn: USER_SYNC_TOKEN_TTL,
  });
}
