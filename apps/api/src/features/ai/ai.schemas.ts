// apps/api/src/features/ai/ai.schemas.ts

import { z } from "zod";

export const coachChatBodySchema = z.object({
  message: z.string().min(1).max(4000),
  history: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().max(4000),
      }),
    )
    .max(20)
    .optional()
    .default([]),
});

export type CoachChatBody = z.infer<typeof coachChatBodySchema>;

export const performanceVisualSchema = z.object({
  headline: z.string(),
  trend: z.enum(["improving", "steady", "needs_focus"]),
  narrative: z.string(),
  highlights: z.array(z.string()),
  difficultyMix: z.object({
    easy: z.number().int().nonnegative(),
    medium: z.number().int().nonnegative(),
    hard: z.number().int().nonnegative(),
  }),
  mistakesByCategory: z.record(z.string(), z.number().int().nonnegative()),
  platformMix: z.array(
    z.object({
      name: z.string(),
      count: z.number().int().nonnegative(),
    }),
  ),
  avgRating: z.number(),
  avgAttempts: z.number(),
  totalSolved: z.number().int().nonnegative(),
  revisionsDue: z.number().int().nonnegative(),
  mistakeRate: z.number().nonnegative(),
  hardProblemShare: z.number().min(0).max(100),
});

export type PerformanceVisual = z.infer<typeof performanceVisualSchema>;

/** Core insights from AI/mock before performance visuals are attached. */
export const coachInsightsCoreSchema = z.object({
  readinessScore: z.number().min(0).max(100),
  readinessAnalysis: z.string(),
  weaknessMap: z.array(
    z.object({
      category: z.string(),
      severity: z.enum(["low", "medium", "high"]),
      description: z.string(),
      actionItems: z.array(z.string()),
    }),
  ),
  topicClusters: z.array(
    z.object({
      topic: z.string(),
      proficiency: z.number().min(0).max(100),
      problemCount: z.number().int().nonnegative(),
      recommendation: z.string(),
    }),
  ),
});

export const coachInsightsSchema = coachInsightsCoreSchema.extend({
  performanceVisual: performanceVisualSchema,
});

export type CoachInsightsCore = z.infer<typeof coachInsightsCoreSchema>;
export type CoachInsights = z.infer<typeof coachInsightsSchema>;

export const progressiveHintsSchema = z.object({
  problemId: z.string(),
  problemTitle: z.string(),
  levels: z.array(
    z.object({
      level: z.number().int().min(1).max(4),
      title: z.string(),
      content: z.string(),
    }),
  ),
});

export type ProgressiveHints = z.infer<typeof progressiveHintsSchema>;
