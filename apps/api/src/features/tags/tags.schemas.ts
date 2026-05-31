// apps/api/src/features/tags/tags.schemas.ts

import { z } from "zod";

export const createTagBodySchema = z.object({
  name: z.string().min(1, "name is required").max(50),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Must be a hex color").optional(),
});

export type CreateTagBody = z.infer<typeof createTagBodySchema>;

export const updateTagBodySchema = z.object({
  name: z.string().min(1).max(50).optional(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Must be a hex color").nullish(),
});

export type UpdateTagBody = z.infer<typeof updateTagBodySchema>;

export const attachTagsBodySchema = z.object({
  tagIds: z.array(z.string().min(1)).min(1, "At least one tagId is required"),
});

export type AttachTagsBody = z.infer<typeof attachTagsBodySchema>;
