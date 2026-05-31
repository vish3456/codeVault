// apps/api/src/features/revisions/revisions.schemas.ts

import { z } from "zod";

export const createRevisionBodySchema = z.object({
  problemId: z.string().optional(),
  noteId: z.string().optional(),
}).refine(
  (data) => data.problemId || data.noteId,
  { message: "Either problemId or noteId is required" },
);

export type CreateRevisionBody = z.infer<typeof createRevisionBodySchema>;

export const completeRevisionBodySchema = z.object({
  quality: z.enum(["easy", "medium", "hard"]).default("medium"),
});

export type CompleteRevisionBody = z.infer<typeof completeRevisionBodySchema>;
