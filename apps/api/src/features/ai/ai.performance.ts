// apps/api/src/features/ai/ai.performance.ts

import { prisma } from "../../lib/prisma.js";
import type { PerformanceVisual } from "./ai.schemas.js";
import type { UserCoachProfile } from "./ai.mock.js";

interface DifficultyCounts {
  easy: number;
  medium: number;
  hard: number;
}

/**
 * Builds chart-ready performance metrics and a coach narrative from live DB stats.
 */
export async function buildPerformanceVisual(
  userId: string,
  profile: UserCoachProfile,
  readinessScore: number,
): Promise<PerformanceVisual> {
  const [easyCount, mediumCount, hardCount, platformGroups, revisionsDue] =
    await Promise.all([
      prisma.userProblem.count({
        where: { userId, problem: { difficulty: "EASY" } },
      }),
      prisma.userProblem.count({
        where: { userId, problem: { difficulty: "MEDIUM" } },
      }),
      prisma.userProblem.count({
        where: { userId, problem: { difficulty: "HARD" } },
      }),
      prisma.userProblem.findMany({
        where: { userId },
        select: {
          problem: {
            select: { platform: { select: { name: true } } },
          },
        },
      }),
      prisma.revision.count({
        where: { userId, nextReviewAt: { lte: new Date() } },
      }),
    ]);

  const difficultyMix: DifficultyCounts = {
    easy: easyCount,
    medium: mediumCount,
    hard: hardCount,
  };

  const platformMap = new Map<string, number>();
  for (const row of platformGroups) {
    const name = row.problem.platform.name;
    platformMap.set(name, (platformMap.get(name) ?? 0) + 1);
  }
  const platformMix = Array.from(platformMap.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);

  const total = profile.totalProblems;
  const hardPct = total > 0 ? Math.round((hardCount / total) * 100) : 0;
  const mistakeTotal = Object.values(profile.mistakesByCategory).reduce(
    (sum, count) => sum + count,
    0,
  );
  const mistakeRate =
    total > 0 ? Math.round((mistakeTotal / total) * 100) / 100 : 0;

  const trend = inferTrend(profile, readinessScore, hardPct, revisionsDue);
  const headline = buildHeadline(trend, profile, hardPct);
  const narrative = buildNarrative(
    profile,
    difficultyMix,
    platformMix,
    readinessScore,
    mistakeTotal,
    revisionsDue,
    trend,
  );
  const highlights = buildHighlights(
    profile,
    difficultyMix,
    mistakeTotal,
    revisionsDue,
    hardPct,
  );

  return {
    headline,
    trend,
    narrative,
    highlights,
    difficultyMix,
    mistakesByCategory: profile.mistakesByCategory,
    platformMix,
    avgRating: Math.round(profile.avgRating * 10) / 10,
    avgAttempts: Math.round(profile.avgAttempts * 10) / 10,
    totalSolved: total,
    revisionsDue,
    mistakeRate,
    hardProblemShare: hardPct,
  };
}

function inferTrend(
  profile: UserCoachProfile,
  readinessScore: number,
  hardPct: number,
  revisionsDue: number,
): PerformanceVisual["trend"] {
  if (profile.totalProblems === 0) return "needs_focus";
  if (readinessScore >= 70 && profile.avgRating >= 3.5 && hardPct >= 20) {
    return "improving";
  }
  if (readinessScore >= 45 && profile.avgRating >= 2.5) return "steady";
  if (revisionsDue > 5 || profile.avgRating < 2.5) return "needs_focus";
  return "steady";
}

function buildHeadline(
  trend: PerformanceVisual["trend"],
  profile: UserCoachProfile,
  hardPct: number,
): string {
  if (profile.totalProblems === 0) return "Fresh Start — Build Your Baseline";
  if (trend === "improving") {
    return hardPct >= 30
      ? "Interview Trajectory — Hard-Problem Momentum"
      : "Rising Performer — Consistent Growth";
  }
  if (trend === "steady") return "Steady Grinder — Solid Foundation";
  return "Focus Sprint — Sharpen Weak Spots";
}

function buildNarrative(
  profile: UserCoachProfile,
  difficulty: DifficultyCounts,
  platforms: Array<{ name: string; count: number }>,
  readinessScore: number,
  mistakeTotal: number,
  revisionsDue: number,
  trend: PerformanceVisual["trend"],
): string {
  if (profile.totalProblems === 0) {
    return "Your performance canvas is blank. Log your first 5 solves with difficulty, tags, and honest ratings — the coach will paint a full visual profile from your data.";
  }

  const total = profile.totalProblems;
  const easyPct = Math.round((difficulty.easy / total) * 100);
  const medPct = Math.round((difficulty.medium / total) * 100);
  const hardPct = Math.round((difficulty.hard / total) * 100);
  const topPlatform = platforms[0]?.name ?? "multiple platforms";
  const topTag =
    profile.topTags[0]?.name ?? "untagged patterns";

  const trendLine =
    trend === "improving"
      ? "Your trajectory points upward"
      : trend === "steady"
        ? "You're maintaining a healthy practice rhythm"
        : "Your profile signals it's time for a focused correction sprint";

  return `${trendLine}. You've solved ${total} problems with an average self-rating of ${profile.avgRating.toFixed(1)}/5 across ~${profile.avgAttempts.toFixed(1)} attempts each. Your difficulty spread looks like ${easyPct}% easy, ${medPct}% medium, and ${hardPct}% hard — ${hardPct < 15 ? "pushing more hard problems will stretch interview readiness" : hardPct >= 35 ? "a strong hard-problem ratio for interview prep" : "a balanced mix for steady growth"}. Most activity clusters on ${topPlatform}, with ${topTag} as your top tagged theme. You've logged ${mistakeTotal} mistake${mistakeTotal === 1 ? "" : "s"} (${mistakeTotal > 0 ? "excellent for targeted drills" : "start logging failures to unlock sharper visuals"}). Readiness sits at ${readinessScore}/100${revisionsDue > 0 ? `, with ${revisionsDue} revision${revisionsDue === 1 ? "" : "s"} due today` : ""}.`;
}

function buildHighlights(
  profile: UserCoachProfile,
  difficulty: DifficultyCounts,
  mistakeTotal: number,
  revisionsDue: number,
  hardPct: number,
): string[] {
  const highlights: string[] = [];

  if (profile.avgRating >= 4) {
    highlights.push(`High confidence solves (avg ${profile.avgRating.toFixed(1)}★)`);
  } else if (profile.avgRating < 2.5 && profile.totalProblems > 0) {
    highlights.push("Low self-ratings — revisit mediums before new hards");
  }

  if (hardPct >= 25) highlights.push(`${hardPct}% of portfolio is Hard difficulty`);
  if (difficulty.easy > difficulty.hard * 2 && profile.totalProblems >= 5) {
    highlights.push("Easy-heavy mix — add mediums to bridge the gap");
  }

  if (mistakeTotal >= 3) {
    highlights.push(`${mistakeTotal} mistakes logged for pattern analysis`);
  }

  if (revisionsDue > 0) {
    highlights.push(`${revisionsDue} spaced-repetition items due today`);
  }

  if (profile.topTags.length > 0) {
    highlights.push(
      `Top focus: ${profile.topTags
        .slice(0, 3)
        .map((tag) => tag.name)
        .join(", ")}`,
    );
  }

  if (highlights.length === 0) {
    highlights.push("Keep logging solves to unlock richer performance highlights");
  }

  return highlights.slice(0, 5);
}
