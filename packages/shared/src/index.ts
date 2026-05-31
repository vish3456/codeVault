// packages/shared/src/index.ts
export {
  loadEnv,
  validateEnvAtStartup,
  envSchema,
  type Env,
} from "./env.js";

export {
  ok,
  err,
  isOk,
  isErr,
  unwrap,
  mapResult,
  tryCatch,
  type Ok,
  type Err,
  type Result,
} from "./result.js";

export {
  REVISION_STAGES,
  REVISION_STAGE_DAYS,
  PROBLEM_RATING,
  PAGINATION_DEFAULTS,
  PLATFORM_SLUGS,
} from "./constants.js";

export type {
  PlatformSlug,
  Difficulty,
  SolveLanguage,
  RevisionIntervalStage,
  AIInsightType,
  MistakeCategory,
  ProblemRating,
  WeaknessMapInsight,
  ReadinessScoreInsight,
  TopicClusterInsight,
  ParsedAIInsights,
  PaginationInput,
  PaginatedResponse,
  SortDirection,
  UserScoped,
  Timestamps,
} from "./types.js";
