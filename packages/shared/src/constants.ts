// packages/shared/src/constants.ts

import type { RevisionIntervalStage } from "./types.js";

/** Ordered spaced-repetition stages: Day 1 → 3 → 7 → 15 → 30. */
export const REVISION_STAGES: readonly RevisionIntervalStage[] = [
  "DAY_1",
  "DAY_3",
  "DAY_7",
  "DAY_15",
  "DAY_30",
] as const;

/** Calendar days associated with each revision stage. */
export const REVISION_STAGE_DAYS: Record<RevisionIntervalStage, number> = {
  DAY_1: 1,
  DAY_3: 3,
  DAY_7: 7,
  DAY_15: 15,
  DAY_30: 30,
};

/** Minimum and maximum allowed user problem self-ratings. */
export const PROBLEM_RATING = {
  MIN: 1,
  MAX: 5,
} as const;

/** Default pagination values for list endpoints. */
export const PAGINATION_DEFAULTS = {
  PAGE: 1,
  PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
} as const;

/** Known platform slugs for seeding and validation. */
export const PLATFORM_SLUGS = [
  "leetcode",
  "codeforces",
  "codechef",
  "atcoder",
  "hackerrank",
  "other",
] as const;
