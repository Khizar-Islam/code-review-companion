import { Router } from "express";
import { prisma } from "../lib/prisma";

export const usersRouter = Router();

// POST /api/users - { email, name } -> upserts a user by email.
// Called from NextAuth's jwt callback on sign-in so the same Google account
// always maps to the same User row (and the same review history).
usersRouter.post("/", async (req, res) => {
  const { email, name } = req.body;

  if (!email) {
    return res.status(400).json({ error: "email is required" });
  }

  const user = await prisma.user.upsert({
    where: { email },
    update: { name },
    create: { email, name },
  });

  res.status(200).json(user);
});
