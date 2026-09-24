import "dotenv/config";
import express from "express";
import cors from "cors";
import { reviewsRouter } from "./routes/reviews";
import { usersRouter } from "./routes/users";
import { requireUser, requireUserSync } from "./lib/auth";

const app = express();
const port = process.env.PORT || 4000;

// Comma-separated, so local dev and the deployed site can both be allowed.
const webOrigins = process.env.WEB_ORIGIN?.split(",").map((o) => o.trim()).filter(Boolean);
if (!webOrigins?.length) {
  throw new Error("WEB_ORIGIN is not set");
}

app.use(cors({ origin: webOrigins }));
app.use(express.json());

app.use("/api/reviews", requireUser, reviewsRouter);
app.use("/api/users", requireUserSync, usersRouter);

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.listen(port, () => {
  console.log(`Server listening on http://localhost:${port}`);
});
