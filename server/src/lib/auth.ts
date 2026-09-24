import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";

// The web app and this API share API_AUTH_SECRET. NextAuth's session callback
// mints a short-lived HS256 token carrying the signed-in user's id; the API
// trusts that id instead of whatever userId a request body or URL claims.
// Issuer/audience must match what web/lib/apiToken.ts signs with.
const ISSUER = "code-review-web";
const AUDIENCE = "code-review-api";

// Fail at startup rather than on the first request — a missing secret would
// otherwise mean every call 401s with no obvious cause.
const secret = process.env.API_AUTH_SECRET;
if (!secret) {
  throw new Error("API_AUTH_SECRET is not set");
}

declare global {
  namespace Express {
    interface Request {
      userId?: string;
    }
  }
}

type Scope = "user" | "user-sync";

function verifyBearer(req: Request, scope: Scope): jwt.JwtPayload | null {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) return null;

  try {
    const payload = jwt.verify(header.slice("Bearer ".length), secret!, {
      algorithms: ["HS256"],
      issuer: ISSUER,
      audience: AUDIENCE,
    });
    if (typeof payload === "string" || payload.scope !== scope) return null;
    return payload;
  } catch {
    return null;
  }
}

// For routes acting on behalf of a signed-in user — sets req.userId.
export function requireUser(req: Request, res: Response, next: NextFunction) {
  const payload = verifyBearer(req, "user");
  if (!payload?.sub) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  req.userId = payload.sub;
  next();
}

// For POST /api/users, which NextAuth calls server-side during sign-in —
// before any user id exists to put in a user token.
export function requireUserSync(req: Request, res: Response, next: NextFunction) {
  if (!verifyBearer(req, "user-sync")) {
    return res.status(401).json({ error: "Not authenticated" });
  }
  next();
}
