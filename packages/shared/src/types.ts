// packages/shared/src/types.ts

/** Supported competitive programming platforms. */
export type PlatformSlug =
  | "leetcode"
  | "codeforces"
  | "codechef"
  | "atcoder"
  | "hackerrank"
  | "other";

/** Problem difficulty levels aligned with the Prisma `Difficulty` enum. */
export type Difficulty = "EASY" | "MEDIUM" | "HARD";

/** Languages used when solving problems, aligned with Prisma `SolveLanguage`. */
export type SolveLanguage =
  | "CPP"
  | "C"
  | "PYTHON"
  | "JAVA"
  | "JAVASCRIPT"
  | "TYPESCRIPT"
  | "GO"
  | "RUST"
  | "KOTLIN"
  | "OTHER";

/** Spaced-repetition interval stages: Day 1 → 3 → 7 → 15 → 30. */
export type RevisionIntervalStage =
  | "DAY_1"
  | "DAY_3"
  | "DAY_7"
  | "DAY_15"
  | "DAY_30";

/** AI insight categories stored per user. */
export type AIInsightType =
  | "WEAKNESS_MAP"
  | "READINESS_SCORE"
  | "TOPIC_CLUSTERS";

/** Mistake classification aligned with Prisma `MistakeCategory`. */
export type MistakeCategory =
  | "LOGIC"
  | "SYNTAX"
  | "COMPLEXITY"
  | "EDGE_CASE"
  | "IMPLEMENTATION"
  | "OTHER";

/** User self-rating for a solved problem (1 = struggled, 5 = mastered). */
export type ProblemRating = 1 | 2 | 3 | 4 | 5;

/** Parsed weakness map insight — topic → proficiency score (0–100). */
export interface WeaknessMapInsight {
  readonly topics: ReadonlyArray<{
    readonly tag: string;
    readonly score: number;
    readonly problemCount: number;
  }>;
  readonly generatedAt: string;
}

/** Parsed readiness score insight for interview/contest prep. */
export interface ReadinessScoreInsight {
  readonly overallScore: number;
  readonly breakdown: Readonly<Record<Difficulty, number>>;
  readonly recommendedFocus: ReadonlyArray<string>;
  readonly generatedAt: string;
}

/** Parsed topic cluster insight grouping related problem tags. */
export interface TopicClusterInsight {
  readonly clusters: ReadonlyArray<{
    readonly id: string;
    readonly label: string;
    readonly tags: ReadonlyArray<string>;
    readonly strength: number;
  }>;
  readonly generatedAt: string;
}

/** Union of all parsed AI insight payloads keyed by type. */
export interface ParsedAIInsights {
  readonly WEAKNESS_MAP?: WeaknessMapInsight;
  readonly READINESS_SCORE?: ReadinessScoreInsight;
  readonly TOPIC_CLUSTERS?: TopicClusterInsight;
}

/** Pagination input shared across list endpoints. */
export interface PaginationInput {
  readonly page?: number;
  readonly pageSize?: number;
}

/** Paginated list response wrapper. */
export interface PaginatedResponse<T> {
  readonly items: ReadonlyArray<T>;
  readonly total: number;
  readonly page: number;
  readonly pageSize: number;
  readonly totalPages: number;
}

/** Sort direction for list queries. */
export type SortDirection = "asc" | "desc";

/** Base fields present on all user-scoped entities. */
export interface UserScoped {
  readonly userId: string;
}

/** ISO 8601 timestamp pair for auditable records. */
export interface Timestamps {
  readonly createdAt: string;
  readonly updatedAt: string;
}
