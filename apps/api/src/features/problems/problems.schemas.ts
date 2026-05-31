// apps/api/src/features/problems/problems.schemas.ts

import { z } from "zod";

export const createProblemBodySchema = z.object({
  platformId: z.string().min(1, "platformId is required"),
  externalId: z.string().min(1, "externalId is required"),
  title: z.string().min(1, "title is required"),
  difficulty: z.enum(["EASY", "MEDIUM", "HARD"]).optional(),
  url: z.string().url().optional(),
  language: z.enum([
    "CPP", "C", "PYTHON", "JAVA", "JAVASCRIPT",
    "TYPESCRIPT", "GO", "RUST", "KOTLIN", "OTHER",
  ]),
  solveDate: z.string().datetime().optional(),
  attempts: z.number().int().positive().default(1),
  rating: z.number().int().min(1).max(5),
  tagIds: z.array(z.string()).optional(),
});

export type CreateProblemBody = z.infer<typeof createProblemBodySchema>;

export const updateProblemBodySchema = z.object({
  title: z.string().min(1).optional(),
  difficulty: z.enum(["EASY", "MEDIUM", "HARD"]).nullish(),
  url: z.string().url().nullish(),
  language: z.enum([
    "CPP", "C", "PYTHON", "JAVA", "JAVASCRIPT",
    "TYPESCRIPT", "GO", "RUST", "KOTLIN", "OTHER",
  ]).optional(),
  rating: z.number().int().min(1).max(5).optional(),
  attempts: z.number().int().positive().optional(),
});

export type UpdateProblemBody = z.infer<typeof updateProblemBodySchema>;

export const listProblemsQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
  platformId: z.string().optional(),
  difficulty: z.enum(["EASY", "MEDIUM", "HARD"]).optional(),
  tagId: z.string().optional(),
  search: z.string().optional(),
  sortBy: z.enum(["solveDate", "title", "difficulty", "rating"]).default("solveDate"),
  sortDir: z.enum(["asc", "desc"]).default("desc"),
});

export type ListProblemsQuery = z.infer<typeof listProblemsQuerySchema>;
