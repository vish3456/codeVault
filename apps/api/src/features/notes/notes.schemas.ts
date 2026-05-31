// apps/api/src/features/notes/notes.schemas.ts

import { z } from "zod";

export const createNoteBodySchema = z.object({
  title: z.string().min(1, "title is required").max(200),
  content: z.string().min(1, "content is required"),
  problemId: z.string().optional(),
});

export type CreateNoteBody = z.infer<typeof createNoteBodySchema>;

export const updateNoteBodySchema = z.object({
  title: z.string().min(1).max(200).optional(),
  content: z.string().min(1).optional(),
});

export type UpdateNoteBody = z.infer<typeof updateNoteBodySchema>;

export const listNotesQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
  problemId: z.string().optional(),
  search: z.string().optional(),
});

export type ListNotesQuery = z.infer<typeof listNotesQuerySchema>;
