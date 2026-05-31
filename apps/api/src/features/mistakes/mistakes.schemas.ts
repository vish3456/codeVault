// apps/api/src/features/mistakes/mistakes.schemas.ts

import { z } from "zod";

export const createMistakeBodySchema = z.object({
  problemId: z.string().optional(),
  userProblemId: z.string().optional(),
  description: z.string().min(1, "description is required"),
  category: z
    .enum(["LOGIC", "SYNTAX", "COMPLEXITY", "EDGE_CASE", "IMPLEMENTATION", "OTHER"])
    .default("OTHER"),
});

export type CreateMistakeBody = z.infer<typeof createMistakeBodySchema>;

export const listMistakesQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
  category: z
    .enum(["LOGIC", "SYNTAX", "COMPLEXITY", "EDGE_CASE", "IMPLEMENTATION", "OTHER"])
    .optional(),
  problemId: z.string().optional(),
});

export type ListMistakesQuery = z.infer<typeof listMistakesQuerySchema>;
