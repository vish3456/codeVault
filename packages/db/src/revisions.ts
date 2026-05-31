// packages/db/src/revisions.ts
import type { RevisionIntervalStage } from "@prisma/client";

/** Spaced-repetition interval progression: Day 1 → 3 → 7 → 15 → 30. */
export const REVISION_INTERVAL_STAGES: readonly RevisionIntervalStage[] = [
  "DAY_1",
  "DAY_3",
  "DAY_7",
  "DAY_15",
  "DAY_30",
] as const;

/** Number of days for each revision interval stage. */
export const REVISION_INTERVAL_DAYS: Record<RevisionIntervalStage, number> = {
  DAY_1: 1,
  DAY_3: 3,
  DAY_7: 7,
  DAY_15: 15,
  DAY_30: 30,
};

/**
 * Returns the next interval stage in the spaced-repetition sequence.
 * Returns `null` when the current stage is the final stage (DAY_30).
 */
export function getNextRevisionStage(
  current: RevisionIntervalStage,
): RevisionIntervalStage | null {
  const index = REVISION_INTERVAL_STAGES.indexOf(current);
  if (index === -1 || index >= REVISION_INTERVAL_STAGES.length - 1) {
    return null;
  }
  return REVISION_INTERVAL_STAGES[index + 1] ?? null;
}

/**
 * Calculates the next review date from a base date and interval stage.
 */
export function calculateNextReviewAt(
  from: Date,
  stage: RevisionIntervalStage,
): Date {
  const days = REVISION_INTERVAL_DAYS[stage] ?? 1;
  const next = new Date(from);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

/**
 * Advances a revision to its next interval stage and computes the new review date.
 * When already at DAY_30, the stage stays at DAY_30 and the interval resets to 30 days.
 */
export function advanceRevisionSchedule(
  currentStage: RevisionIntervalStage,
  reviewedAt: Date = new Date(),
): { intervalStage: RevisionIntervalStage; nextReviewAt: Date } {
  const nextStage = getNextRevisionStage(currentStage) ?? currentStage;
  return {
    intervalStage: nextStage,
    nextReviewAt: calculateNextReviewAt(reviewedAt, nextStage),
  };
}
