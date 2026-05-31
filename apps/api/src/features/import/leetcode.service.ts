// apps/api/src/features/import/leetcode.service.ts

import type { Difficulty, SolveLanguage } from "@prisma/client";
import { prisma } from "../../lib/prisma.js";
import { ok, err, type Result } from "../../lib/result.js";
import {
  aggregateSubmissions,
  fetchProblemCatalog,
  fetchProblemDescription,
  fetchRecentAcSubmissions,
  resolveTopicCluster,
  verifyLeetCodeUser,
} from "../../lib/leetcode.js";
import type { ConnectLeetCodeBody, ManualImportBody } from "./leetcode.schemas.js";

export interface LeetCodeStatusDTO {
  connected: boolean;
  username: string | null;
  syncedAt: string | null;
  importedCount: number;
  doubtfulCount: number;
}

export interface ClusteredProblemDTO {
  userProblemId: string;
  problemId: string;
  title: string;
  difficulty: string | null;
  attempts: number;
  isDoubtful: boolean;
  solveDate: string;
  url: string | null;
  problemSummary: string | null;
}

export interface ProblemClusterDTO {
  name: string;
  description: string;
  problemCount: number;
  avgAttempts: number;
  problems: ClusteredProblemDTO[];
}

export interface LeetCodeSummaryDTO {
  username: string;
  totalImported: number;
  doubtfulCount: number;
  totalAttempts: number;
  syncedAt: string | null;
  clusters: ProblemClusterDTO[];
}

/**
 * Returns LeetCode link status for the current user.
 */
export async function getLeetCodeStatus(
  userId: string,
): Promise<Result<LeetCodeStatusDTO, Error>> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        leetcodeUsername: true,
        leetcodeSyncedAt: true,
      },
    });

    if (!user) {
      return err(new Error("User not found"));
    }

    const platform = await prisma.platform.findUnique({
      where: { slug: "leetcode" },
    });

    let importedCount = 0;
    let doubtfulCount = 0;

    if (platform) {
      importedCount = await prisma.userProblem.count({
        where: {
          userId,
          problem: { platformId: platform.id },
        },
      });
      doubtfulCount = await prisma.userProblem.count({
        where: {
          userId,
          isDoubtful: true,
          problem: { platformId: platform.id },
        },
      });
    }

    return ok({
      connected: Boolean(user.leetcodeUsername),
      username: user.leetcodeUsername,
      syncedAt: user.leetcodeSyncedAt?.toISOString() ?? null,
      importedCount,
      doubtfulCount,
    });
  } catch (error) {
    return err(error instanceof Error ? error : new Error(String(error)));
  }
}

/**
 * Links a LeetCode username to the CodeVault user.
 */
export async function connectLeetCode(
  userId: string,
  body: ConnectLeetCodeBody,
): Promise<Result<LeetCodeStatusDTO, Error>> {
  try {
    const username = body.username.trim();
    const exists = await verifyLeetCodeUser(username);
    if (!exists) {
      return err(new Error(`LeetCode user "${username}" not found`));
    }

    await prisma.user.update({
      where: { id: userId },
      data: { leetcodeUsername: username },
    });

    return getLeetCodeStatus(userId);
  } catch (error) {
    return err(error instanceof Error ? error : new Error(String(error)));
  }
}

/**
 * Syncs accepted LeetCode problems into the user's vault.
 */
export async function syncLeetCode(
  userId: string,
): Promise<Result<{ imported: number; updated: number }, Error>> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { leetcodeUsername: true },
    });

    if (!user?.leetcodeUsername) {
      return err(new Error("Connect a LeetCode username first"));
    }

    const username = user.leetcodeUsername;
    const platform = await prisma.platform.findUnique({
      where: { slug: "leetcode" },
    });

    if (!platform) {
      return err(new Error("LeetCode platform not configured"));
    }

    const [submissions, catalog] = await Promise.all([
      fetchRecentAcSubmissions(username),
      fetchProblemCatalog(),
    ]);

    const aggregated = aggregateSubmissions(submissions);
    let imported = 0;
    let updated = 0;

    const slugsToEnrich = Array.from(aggregated.keys()).slice(0, 30);
    const descriptionMap = new Map<string, string>();
    await Promise.all(
      slugsToEnrich.map(async (slug) => {
        const description = await fetchProblemDescription(slug);
        descriptionMap.set(slug, description);
      }),
    );

    for (const [, entry] of aggregated) {
      const meta = catalog.get(entry.titleSlug);
      const difficulty = mapDifficulty(meta?.difficulty);
      const { cluster, summary } = resolveTopicCluster(
        entry.title,
        meta?.topicTags ?? [],
      );
      const description =
        descriptionMap.get(entry.titleSlug) ??
        meta?.contentSnippet ??
        summary;

      const problem = await prisma.problem.upsert({
        where: {
          platformId_externalId: {
            platformId: platform.id,
            externalId: entry.titleSlug,
          },
        },
        create: {
          platformId: platform.id,
          externalId: entry.titleSlug,
          title: meta?.title ?? entry.title,
          difficulty,
          url: `https://leetcode.com/problems/${entry.titleSlug}/`,
        },
        update: {
          title: meta?.title ?? entry.title,
          difficulty,
          url: `https://leetcode.com/problems/${entry.titleSlug}/`,
        },
      });

      const existing = await prisma.userProblem.findUnique({
        where: {
          userId_problemId: { userId, problemId: problem.id },
        },
      });

      await prisma.userProblem.upsert({
        where: {
          userId_problemId: { userId, problemId: problem.id },
        },
        create: {
          userId,
          problemId: problem.id,
          solveDate: new Date(entry.latestTs),
          language: mapLanguage(entry.lang),
          attempts: entry.attempts,
          rating: estimateRating(entry.attempts),
          topicCluster: cluster,
          problemSummary: description,
        },
        update: {
          solveDate: new Date(entry.latestTs),
          language: mapLanguage(entry.lang),
          attempts: entry.attempts,
          topicCluster: cluster,
          problemSummary: description,
        },
      });

      if (existing) {
        updated += 1;
      } else {
        imported += 1;
      }
    }

    await prisma.user.update({
      where: { id: userId },
      data: { leetcodeSyncedAt: new Date() },
    });

    return ok({ imported, updated });
  } catch (error) {
    return err(error instanceof Error ? error : new Error(String(error)));
  }
}

/**
 * Returns imported LeetCode problems grouped by topic cluster.
 */
export async function getLeetCodeSummary(
  userId: string,
): Promise<Result<LeetCodeSummaryDTO, Error>> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { leetcodeUsername: true, leetcodeSyncedAt: true },
    });

    if (!user?.leetcodeUsername) {
      return err(new Error("LeetCode account not connected"));
    }

    const platform = await prisma.platform.findUnique({
      where: { slug: "leetcode" },
    });

    if (!platform) {
      return err(new Error("LeetCode platform not configured"));
    }

    const userProblems = await prisma.userProblem.findMany({
      where: {
        userId,
        problem: { platformId: platform.id },
      },
      include: {
        problem: {
          select: {
            id: true,
            title: true,
            difficulty: true,
            url: true,
          },
        },
      },
      orderBy: { solveDate: "desc" },
    });

    const clusterMap = new Map<string, ProblemClusterDTO>();

    for (const userProblem of userProblems) {
      const clusterName = userProblem.topicCluster ?? "Uncategorized";
      let cluster = clusterMap.get(clusterName);
      if (!cluster) {
        cluster = {
          name: clusterName,
          description: userProblem.problemSummary ?? clusterName,
          problemCount: 0,
          avgAttempts: 0,
          problems: [],
        };
        clusterMap.set(clusterName, cluster);
      }

      cluster.problems.push({
        userProblemId: userProblem.id,
        problemId: userProblem.problem.id,
        title: userProblem.problem.title,
        difficulty: userProblem.problem.difficulty,
        attempts: userProblem.attempts,
        isDoubtful: userProblem.isDoubtful,
        solveDate: userProblem.solveDate.toISOString(),
        url: userProblem.problem.url,
        problemSummary: userProblem.problemSummary,
      });
      cluster.problemCount += 1;
    }

    const clusters = Array.from(clusterMap.values())
      .map((cluster) => {
        const totalAttempts = cluster.problems.reduce(
          (sum, problem) => sum + problem.attempts,
          0,
        );
        return {
          ...cluster,
          avgAttempts:
            cluster.problemCount > 0
              ? Math.round((totalAttempts / cluster.problemCount) * 10) / 10
              : 0,
          description:
            cluster.problems[0]?.problemSummary?.slice(0, 120) ??
            cluster.description,
        };
      })
      .sort((a, b) => b.problemCount - a.problemCount);

    const doubtfulCount = userProblems.filter((up) => up.isDoubtful).length;
    const totalAttempts = userProblems.reduce(
      (sum, up) => sum + up.attempts,
      0,
    );

    return ok({
      username: user.leetcodeUsername,
      totalImported: userProblems.length,
      doubtfulCount,
      totalAttempts,
      syncedAt: user.leetcodeSyncedAt?.toISOString() ?? null,
      clusters,
    });
  } catch (error) {
    return err(error instanceof Error ? error : new Error(String(error)));
  }
}

/**
 * Marks or unmarks a problem as doubtful for review.
 */
export async function toggleDoubtful(
  userId: string,
  userProblemId: string,
  isDoubtful: boolean,
): Promise<Result<ClusteredProblemDTO, Error>> {
  try {
    const userProblem = await prisma.userProblem.update({
      where: { id: userProblemId, userId },
      data: { isDoubtful },
      include: {
        problem: {
          select: {
            id: true,
            title: true,
            difficulty: true,
            url: true,
          },
        },
      },
    });

    return ok({
      userProblemId: userProblem.id,
      problemId: userProblem.problem.id,
      title: userProblem.problem.title,
      difficulty: userProblem.problem.difficulty,
      attempts: userProblem.attempts,
      isDoubtful: userProblem.isDoubtful,
      solveDate: userProblem.solveDate.toISOString(),
      url: userProblem.problem.url,
      problemSummary: userProblem.problemSummary,
    });
  } catch {
    return err(new Error("Problem not found"));
  }
}

function mapDifficulty(
  value: string | undefined,
): Difficulty | null {
  if (!value) return null;
  const upper = value.toUpperCase();
  if (upper === "EASY" || upper === "MEDIUM" || upper === "HARD") {
    return upper as Difficulty;
  }
  return null;
}

function mapLanguage(lang: string): SolveLanguage {
  const normalized = lang.toLowerCase();
  const map: Record<string, SolveLanguage> = {
    cpp: "CPP",
    c: "C",
    python: "PYTHON",
    python3: "PYTHON",
    java: "JAVA",
    javascript: "JAVASCRIPT",
    typescript: "TYPESCRIPT",
    golang: "GO",
    go: "GO",
    rust: "RUST",
    kotlin: "KOTLIN",
  };
  return map[normalized] ?? "OTHER";
}

function estimateRating(attempts: number): number {
  if (attempts <= 1) return 4;
  if (attempts <= 2) return 3;
  if (attempts <= 4) return 2;
  return 1;
}

/**
 * Manually imports a list of solved/attempted problems from the bookmarklet payload.
 */
export async function importManualLeetCode(
  userId: string,
  body: ManualImportBody,
): Promise<Result<{ imported: number; updated: number }, Error>> {
  try {
    const platform = await prisma.platform.findUnique({
      where: { slug: "leetcode" },
    });

    if (!platform) {
      return err(new Error("LeetCode platform not configured"));
    }

    const catalog = await fetchProblemCatalog();
    let imported = 0;
    let updated = 0;

    for (const entry of body.problems) {
      const meta = catalog.get(entry.titleSlug);
      // Determine difficulty
      const diffString = meta?.difficulty ?? entry.difficulty;
      const difficulty = mapDifficulty(diffString);

      // Determine topic clusters
      const { cluster, summary } = resolveTopicCluster(
        entry.title,
        meta?.topicTags ?? [],
      );

      const description = meta?.contentSnippet ?? summary;

      const problem = await prisma.problem.upsert({
        where: {
          platformId_externalId: {
            platformId: platform.id,
            externalId: entry.titleSlug,
          },
        },
        create: {
          platformId: platform.id,
          externalId: entry.titleSlug,
          title: meta?.title ?? entry.title,
          difficulty,
          url: `https://leetcode.com/problems/${entry.titleSlug}/`,
        },
        update: {
          title: meta?.title ?? entry.title,
          difficulty,
          url: `https://leetcode.com/problems/${entry.titleSlug}/`,
        },
      });

      const existing = await prisma.userProblem.findUnique({
        where: {
          userId_problemId: { userId, problemId: problem.id },
        },
      });

      // Default logic for language, attempts, and rating based on status
      const isAc = entry.status === "ac";
      const defaultAttempts = isAc ? 1 : 2;
      const defaultRating = isAc ? 4 : 3;

      await prisma.userProblem.upsert({
        where: {
          userId_problemId: { userId, problemId: problem.id },
        },
        create: {
          userId,
          problemId: problem.id,
          solveDate: new Date(),
          language: "OTHER",
          attempts: defaultAttempts,
          rating: defaultRating,
          topicCluster: cluster,
          problemSummary: description,
          isDoubtful: false,
        },
        update: {
          // If already solved or customized, preserve user stats.
          attempts: existing ? existing.attempts : defaultAttempts,
          rating: existing ? existing.rating : defaultRating,
          topicCluster: cluster,
          problemSummary: description,
        },
      });

      if (existing) {
        updated += 1;
      } else {
        imported += 1;
      }
    }

    await prisma.user.update({
      where: { id: userId },
      data: { leetcodeSyncedAt: new Date() },
    });

    return ok({ imported, updated });
  } catch (error) {
    return err(error instanceof Error ? error : new Error(String(error)));
  }
}

