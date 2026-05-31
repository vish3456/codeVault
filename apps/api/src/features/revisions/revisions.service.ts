// apps/api/src/features/revisions/revisions.service.ts

import type { RevisionIntervalStage } from "@prisma/client";
import { prisma } from "../../lib/prisma.js";
import { ok, err, type Result } from "../../lib/result.js";
import type { CreateRevisionBody } from "./revisions.schemas.js";

const INTERVAL_STAGES: RevisionIntervalStage[] = [
  "DAY_1",
  "DAY_3",
  "DAY_7",
  "DAY_15",
  "DAY_30",
];

const INTERVAL_DAYS: Record<RevisionIntervalStage, number> = {
  DAY_1: 1,
  DAY_3: 3,
  DAY_7: 7,
  DAY_15: 15,
  DAY_30: 30,
};

function getNextStage(current: RevisionIntervalStage): RevisionIntervalStage {
  const idx = INTERVAL_STAGES.indexOf(current);
  if (idx < 0 || idx >= INTERVAL_STAGES.length - 1) return current;
  return INTERVAL_STAGES[idx + 1]!;
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

export interface RevisionDTO {
  id: string;
  problemId: string | null;
  noteId: string | null;
  intervalStage: string;
  nextReviewAt: string;
  lastReviewedAt: string | null;
  createdAt: string;
  problem: { id: string; title: string; difficulty: string | null } | null;
  note: { id: string; title: string } | null;
}

export interface RevisionStats {
  dueToday: number;
  upcoming7Days: number;
  completed: number;
  total: number;
}

const revisionInclude = {
  problem: { select: { id: true, title: true, difficulty: true } },
  note: { select: { id: true, title: true } },
} as const;

function toDTO(r: {
  id: string;
  problemId: string | null;
  noteId: string | null;
  intervalStage: RevisionIntervalStage;
  nextReviewAt: Date;
  lastReviewedAt: Date | null;
  createdAt: Date;
  problem: { id: string; title: string; difficulty: string | null } | null;
  note: { id: string; title: string } | null;
}): RevisionDTO {
  return {
    id: r.id,
    problemId: r.problemId,
    noteId: r.noteId,
    intervalStage: r.intervalStage,
    nextReviewAt: r.nextReviewAt.toISOString(),
    lastReviewedAt: r.lastReviewedAt?.toISOString() ?? null,
    createdAt: r.createdAt.toISOString(),
    problem: r.problem,
    note: r.note,
  };
}

/**
 * Creates a new revision schedule for a problem or note.
 */
export async function createRevision(
  userId: string,
  body: CreateRevisionBody,
): Promise<Result<RevisionDTO, Error>> {
  try {
    const revision = await prisma.revision.create({
      data: {
        userId,
        problemId: body.problemId ?? null,
        noteId: body.noteId ?? null,
        intervalStage: "DAY_1",
        nextReviewAt: addDays(new Date(), 1),
      },
      include: revisionInclude,
    });
    return ok(toDTO(revision));
  } catch (error) {
    return err(error instanceof Error ? error : new Error(String(error)));
  }
}

/**
 * Returns revisions that are due for review (nextReviewAt <= now).
 */
export async function getDueRevisions(
  userId: string,
): Promise<Result<RevisionDTO[], Error>> {
  try {
    const revisions = await prisma.revision.findMany({
      where: {
        userId,
        nextReviewAt: { lte: new Date() },
      },
      include: revisionInclude,
      orderBy: { nextReviewAt: "asc" },
    });
    return ok(revisions.map(toDTO));
  } catch (error) {
    return err(error instanceof Error ? error : new Error(String(error)));
  }
}

/**
 * Marks a revision as reviewed and advances to the next interval stage.
 */
export async function completeRevision(
  userId: string,
  revisionId: string,
  quality: "easy" | "medium" | "hard",
): Promise<Result<RevisionDTO, Error>> {
  try {
    const existing = await prisma.revision.findFirst({
      where: { id: revisionId, userId },
    });

    if (!existing) {
      return err(new Error("Revision not found"));
    }

    const now = new Date();
    let nextStage: RevisionIntervalStage;

    if (quality === "easy") {
      // Skip a stage if answered easily
      nextStage = getNextStage(getNextStage(existing.intervalStage));
    } else if (quality === "hard") {
      // Stay at current stage
      nextStage = existing.intervalStage;
    } else {
      // Normal progression
      nextStage = getNextStage(existing.intervalStage);
    }

    const nextReviewAt = addDays(now, INTERVAL_DAYS[nextStage] ?? 1);

    const revision = await prisma.revision.update({
      where: { id: revisionId },
      data: {
        intervalStage: nextStage,
        nextReviewAt,
        lastReviewedAt: now,
      },
      include: revisionInclude,
    });

    return ok(toDTO(revision));
  } catch (error) {
    return err(error instanceof Error ? error : new Error(String(error)));
  }
}

/**
 * Returns revision statistics for the user.
 */
export async function getRevisionStats(
  userId: string,
): Promise<Result<RevisionStats, Error>> {
  try {
    const now = new Date();
    const endOfDay = new Date(now);
    endOfDay.setUTCHours(23, 59, 59, 999);

    const in7Days = addDays(now, 7);

    const [dueToday, upcoming7Days, completed, total] = await Promise.all([
      prisma.revision.count({
        where: { userId, nextReviewAt: { lte: endOfDay } },
      }),
      prisma.revision.count({
        where: { userId, nextReviewAt: { lte: in7Days, gt: endOfDay } },
      }),
      prisma.revision.count({
        where: { userId, lastReviewedAt: { not: null } },
      }),
      prisma.revision.count({ where: { userId } }),
    ]);

    return ok({ dueToday, upcoming7Days, completed, total });
  } catch (error) {
    return err(error instanceof Error ? error : new Error(String(error)));
  }
}
