// packages/db/src/index.ts
export { prisma, disconnectDb } from "./client.js";
export {
  REVISION_INTERVAL_STAGES,
  REVISION_INTERVAL_DAYS,
  getNextRevisionStage,
  calculateNextReviewAt,
  advanceRevisionSchedule,
} from "./revisions.js";

export type {
  User,
  Platform,
  Problem,
  UserProblem,
  Tag,
  ProblemTag,
  Note,
  Mistake,
  Revision,
  AIInsight,
  Difficulty,
  SolveLanguage,
  RevisionIntervalStage,
  AIInsightType,
  MistakeCategory,
  Prisma,
} from "@prisma/client";

export { PrismaClient } from "@prisma/client";
