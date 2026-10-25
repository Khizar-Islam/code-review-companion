import "dotenv/config";
import express from "express";
import cors from "cors";
import { reviewsRouter } from "./routes/reviews";
import { usersRouter } from "./routes/users";
import { requireUser, requireUserSync } from "./lib/auth";
import { ipLimiter } from "./lib/rateLimit";
import { apiNotFound, errorHandler } from "./lib/errorHandler";

const app = express();
const port = process.env.PORT || 4000;

// Comma-separated, so local dev and the deployed site can both be allowed.
const webOrigins = process.env.WEB_ORIGIN?.split(",").map((o) => o.trim()).filter(Boolean);
if (!webOrigins?.length) {
  throw new Error("WEB_ORIGIN is not set");
}

// On Render the API sits behind one proxy, so the caller's address is the last entry in
// X-Forwarded-For. Without this every visitor would look like the proxy and share one limit.
// Render sets both NODE_ENV=production and RENDER=true; either one is enough.
if (process.env.NODE_ENV === "production" || process.env.RENDER === "true") app.set("trust proxy", 1);

app.use(cors({ origin: webOrigins }));
app.use(express.json());

app.use("/api", ipLimiter);
app.use("/api/reviews", requireUser, reviewsRouter);
app.use("/api/users", requireUserSync, usersRouter);

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

// After every route: unmatched /api paths and thrown errors answer in JSON too.
app.use("/api", apiNotFound);
app.use(errorHandler);

app.listen(port, () => {
  console.log(`Server listening on http://localhost:${port}`);
});
