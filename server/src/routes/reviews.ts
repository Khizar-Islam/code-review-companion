import { Router } from "express";
import { prisma } from "../lib/prisma";

export const reviewsRouter = Router();

// POST /api/reviews - { prUrl } -> creates a pending review row
// GitHub fetch + AI review are wired up in later build steps; for now this
// just persists the request so the CRUD layer and seeded UI have something real to hit.
reviewsRouter.post("/", async (req, res) => {
  const { prUrl, userId } = req.body;

  if (!prUrl || !userId) {
    return res.status(400).json({ error: "prUrl and userId are required" });
  }

  const review = await prisma.review.create({
    data: { prUrl, userId, status: "pending" },
  });

  res.status(201).json(review);
});

// GET /api/reviews/user/:userId - history list, newest first
// Declared before /:id so "user" isn't swallowed as a review id.
reviewsRouter.get("/user/:userId", async (req, res) => {
  const reviews = await prisma.review.findMany({
    where: { userId: req.params.userId },
    include: { findings: true },
    orderBy: { createdAt: "desc" },
  });

  res.json(reviews);
});

// GET /api/reviews/:id - one review with all findings and diffed files
reviewsRouter.get("/:id", async (req, res) => {
  const review = await prisma.review.findUnique({
    where: { id: req.params.id },
    include: { findings: true, files: true },
  });

  if (!review) {
    return res.status(404).json({ error: "Review not found" });
  }

  res.json(review);
});

// DELETE /api/reviews/:id
reviewsRouter.delete("/:id", async (req, res) => {
  await prisma.review.delete({ where: { id: req.params.id } });
  res.status(204).send();
});
