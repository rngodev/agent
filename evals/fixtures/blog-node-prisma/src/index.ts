import express from "express";
import { PrismaClient } from "@prisma/client";

const app = express();
app.use(express.json());

const prisma = new PrismaClient();

app.get("/posts", async (req, res) => {
  const posts = await prisma.post.findMany({ where: { status: "PUBLISHED" } });
  res.json(posts);
});

app.get("/posts/:id", async (req, res) => {
  const post = await prisma.post.findUnique({ where: { id: req.params.id } });
  if (!post) return res.status(404).json({ error: "not found" });
  res.json(post);
});

app.post("/posts", async (req, res) => {
  const { title, body, authorId } = req.body;
  const post = await prisma.post.create({ data: { title, body, authorId } });
  res.status(201).json(post);
});

app.post("/posts/:id/comments", async (req, res) => {
  const { body, authorId } = req.body;
  const comment = await prisma.comment.create({
    data: { body, authorId, postId: req.params.id },
  });
  res.status(201).json(comment);
});

app.listen(3000, () => console.log("scribble listening on :3000"));
