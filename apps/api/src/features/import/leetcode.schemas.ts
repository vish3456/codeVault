// apps/api/src/features/import/leetcode.schemas.ts

import { z } from "zod";

export const connectLeetCodeBodySchema = z.object({
  username: z
    .string()
    .min(1)
    .max(64)
    .regex(/^[a-zA-Z0-9_-]+$/, "Invalid LeetCode username"),
});

export type ConnectLeetCodeBody = z.infer<typeof connectLeetCodeBodySchema>;

export const toggleDoubtfulBodySchema = z.object({
  isDoubtful: z.boolean(),
});

export type ToggleDoubtfulBody = z.infer<typeof toggleDoubtfulBodySchema>;

export const manualImportBodySchema = z.object({
  problems: z.array(
    z.object({
      title: z.string(),
      titleSlug: z.string(),
      status: z.string(),
      difficulty: z.string().optional(),
      id: z.number().optional(),
    }),
  ),
});

export type ManualImportBody = z.infer<typeof manualImportBodySchema>;

