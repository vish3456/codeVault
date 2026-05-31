// apps/api/src/features/stats/stats.service.ts

import { prisma } from "../../lib/prisma.js";
import { ok, err, type Result } from "../../lib/result.js";

export interface OverviewStats {
  totalProblems: number;
  byDifficulty: { easy: number; medium: number; hard: number };
  byPlatform: Array<{ platformId: string; platformName: string; count: number }>;
  totalNotes: number;
  totalMistakes: number;
  mistakesByCategory: Record<string, number>;
  revisionsDueToday: number;
  recentProblems: Array<{
    id: string;
    title: string;
    difficulty: string | null;
    solveDate: string;
    platform: string;
  }>;
}

export async function getOverview(
  userId: string,
): Promise<Result<OverviewStats, Error>> {
  try {
    const [
      totalProblems,
      easyCount,
      mediumCount,
      hardCount,
      platformCounts,
      totalNotes,
      totalMistakes,
      mistakeCounts,
      revisionsDueToday,
      recentUserProblems,
    ] = await Promise.all([
      prisma.userProblem.count({ where: { userId } }),
      prisma.userProblem.count({
        where: { userId, problem: { difficulty: "EASY" } },
      }),
      prisma.userProblem.count({
        where: { userId, problem: { difficulty: "MEDIUM" } },
      }),
      prisma.userProblem.count({
        where: { userId, problem: { difficulty: "HARD" } },
      }),
      prisma.userProblem.groupBy({
        by: ["problemId"],
        where: { userId },
        _count: true,
      }).then(async (groups) => {
        // Get unique platform counts
        const problems = await prisma.problem.findMany({
          where: { id: { in: groups.map((g) => g.problemId) } },
          select: { platformId: true, platform: { select: { name: true } } },
        });
        const platformMap = new Map<string, { name: string; count: number }>();
        for (const p of problems) {
          const entry = platformMap.get(p.platformId);
          if (entry) {
            entry.count++;
          } else {
            platformMap.set(p.platformId, {
              name: p.platform.name,
              count: 1,
            });
          }
        }
        return Array.from(platformMap.entries()).map(([id, data]) => ({
          platformId: id,
          platformName: data.name,
          count: data.count,
        }));
      }),
      prisma.note.count({ where: { userId } }),
      prisma.mistake.count({ where: { userId } }),
      prisma.mistake
        .groupBy({
          by: ["category"],
          where: { userId },
          _count: true,
        })
        .then((groups) => {
          const map: Record<string, number> = {};
          for (const g of groups) {
            map[g.category] = g._count;
          }
          return map;
        }),
      prisma.revision.count({
        where: {
          userId,
          nextReviewAt: { lte: new Date() },
        },
      }),
      prisma.userProblem.findMany({
        where: { userId },
        orderBy: { solveDate: "desc" },
        take: 5,
        include: {
          problem: {
            select: {
              id: true,
              title: true,
              difficulty: true,
              platform: { select: { name: true } },
            },
          },
        },
      }),
    ]);

    return ok({
      totalProblems,
      byDifficulty: {
        easy: easyCount,
        medium: mediumCount,
        hard: hardCount,
      },
      byPlatform: platformCounts,
      totalNotes,
      totalMistakes,
      mistakesByCategory: mistakeCounts,
      revisionsDueToday,
      recentProblems: recentUserProblems.map((up) => ({
        id: up.problem.id,
        title: up.problem.title,
        difficulty: up.problem.difficulty,
        solveDate: up.solveDate.toISOString(),
        platform: up.problem.platform.name,
      })),
    });
  } catch (error) {
    return err(error instanceof Error ? error : new Error(String(error)));
  }
}
