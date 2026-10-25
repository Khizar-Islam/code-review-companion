import "dotenv/config";
import express from "express";
import cors from "cors";
import { reviewsRouter } from "./routes/reviews";
import { usersRouter } from "./routes/users";
import { requireUser, requireUserSync } from "./lib/auth";
import { ipLimiter } from "./lib/rateLimit";
import { parseTrustProxyHops } from "./lib/trustProxy";
import { apiNotFound, errorHandler } from "./lib/errorHandler";

const app = express();
const port = process.env.PORT || 4000;

// Comma-separated, so local dev and the deployed site can both be allowed.
const webOrigins = process.env.WEB_ORIGIN?.split(",").map((o) => o.trim()).filter(Boolean);
if (!webOrigins?.length) {
  throw new Error("WEB_ORIGIN is not set");
}

// In production the API sits behind proxies, so req.ip has to skip past them to reach the
// visitor's address in X-Forwarded-For. Without this every visitor would look like a proxy and
// share one limit. TRUST_PROXY_HOPS says how many proxies there are (see lib/trustProxy.ts).
// Render sets both NODE_ENV=production and RENDER=true; either one is enough.
if (process.env.NODE_ENV === "production" || process.env.RENDER === "true") {
  app.set("trust proxy", parseTrustProxyHops(process.env.TRUST_PROXY_HOPS));
}

app.use(cors({ origin: webOrigins }));
app.use(express.json());

app.use("/api", ipLimiter);
app.use("/api/reviews", requireUser, reviewsRouter);
app.use("/api/users", requireUserSync, usersRouter);

app.get("/health", (req, res) => {
  // TEMPORARY - remove after measuring. Logs what Express sees as the caller's address, to
  // check how many proxies are in front of the API. ?probe= tags a request so it's easy to
  // find in the logs.
  console.log(
    "[ip-diag] " +
      JSON.stringify({
        probe: typeof req.query.probe === "string" ? req.query.probe.slice(0, 100) : null,
        ip: req.ip,
        ips: req.ips,
        xForwardedFor: req.get("x-forwarded-for") ?? null,
        trustProxy: app.get("trust proxy"),
      }),
  );
  res.json({ status: "ok" });
});

// After every route: unmatched /api paths and thrown errors answer in JSON too.
app.use("/api", apiNotFound);
app.use(errorHandler);

app.listen(port, () => {
  console.log(`Server listening on http://localhost:${port}`);
});
