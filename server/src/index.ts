import "dotenv/config";
import express from "express";
import cors from "cors";
import { reviewsRouter } from "./routes/reviews";
import { usersRouter } from "./routes/users";

const app = express();
const port = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

app.use("/api/reviews", reviewsRouter);
app.use("/api/users", usersRouter);

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.listen(port, () => {
  console.log(`Server listening on http://localhost:${port}`);
});
