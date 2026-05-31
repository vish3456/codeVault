// apps/api/src/features/ai/ai.mock.ts

import type { CoachInsightsCore, ProgressiveHints } from "./ai.schemas.js";

export interface UserCoachProfile {
  totalProblems: number;
  avgRating: number;
  avgAttempts: number;
  mistakesByCategory: Record<string, number>;
  topTags: Array<{ name: string; count: number }>;
  recentMistakes: Array<{ description: string; category: string }>;
  lowRatedProblems: Array<{ title: string; rating: number; tags: string[] }>;
}

/**
 * Builds contextual coach insights from the user's logged competitive programming data.
 */
export function buildMockInsights(profile: UserCoachProfile): CoachInsightsCore {
  const mistakeTotal = Object.values(profile.mistakesByCategory).reduce(
    (sum, count) => sum + count,
    0,
  );

  let readinessScore = 35;
  readinessScore += Math.min(profile.totalProblems * 3, 30);
  readinessScore += Math.min(profile.avgRating * 4, 20);
  if (profile.avgAttempts <= 1.5) readinessScore += 10;
  if (mistakeTotal > 0 && mistakeTotal < 5) readinessScore += 5;
  readinessScore = Math.min(100, Math.max(10, Math.round(readinessScore)));

  const weaknessMap: CoachInsightsCore["weaknessMap"] = [];

  for (const [category, count] of Object.entries(profile.mistakesByCategory)) {
    if (count === 0) continue;
    const severity =
      count >= 5 ? "high" : count >= 2 ? ("medium" as const) : ("low" as const);
    weaknessMap.push({
      category: formatCategory(category),
      severity,
      description: `You've logged ${count} mistake${count > 1 ? "s" : ""} in ${formatCategory(category).toLowerCase()}. This pattern often shows up when rushing edge cases or skipping dry-runs.`,
      actionItems: actionItemsForCategory(category),
    });
  }

  if (weaknessMap.length === 0 && profile.totalProblems > 0) {
    weaknessMap.push({
      category: "Consistency",
      severity: "low",
      description:
        "No mistakes logged yet — great discipline! Start logging failures to unlock sharper diagnostics.",
      actionItems: [
        "Log at least one mistake per failed or partial solve.",
        "Tag problems with the DSA pattern you used.",
      ],
    });
  }

  if (weaknessMap.length === 0) {
    weaknessMap.push({
      category: "Getting Started",
      severity: "medium",
      description:
        "Your vault is empty. Log a few solved problems with tags and mistakes to unlock personalized coaching.",
      actionItems: [
        "Add 3–5 recent solves with difficulty and tags.",
        "Rate each solve honestly (1–5).",
      ],
    });
  }

  const topicClusters: CoachInsightsCore["topicClusters"] = profile.topTags.map(
    (tag) => {
      const proficiency = Math.min(
        100,
        Math.round(40 + tag.count * 12 + profile.avgRating * 8),
      );
      return {
        topic: tag.name,
        proficiency,
        problemCount: tag.count,
        recommendation:
          proficiency >= 75
            ? `Strong exposure to ${tag.name}. Try mixed hard problems combining ${tag.name} with adjacent patterns.`
            : proficiency >= 50
              ? `Growing in ${tag.name}. Solve 2 medium problems this week and log mistakes.`
              : `${tag.name} needs depth. Pick one editorial-free medium problem and write a 3-line recurrence/loop invariant before coding.`,
      };
    },
  );

  if (topicClusters.length === 0 && profile.totalProblems > 0) {
    topicClusters.push({
      topic: "General DSA",
      proficiency: readinessScore,
      problemCount: profile.totalProblems,
      recommendation:
        "Add tags (e.g. DP, Graphs, Two Pointers) to problems for finer topic clustering.",
    });
  }

  const readinessAnalysis = buildReadinessNarrative(profile, readinessScore);

  return {
    readinessScore,
    readinessAnalysis,
    weaknessMap,
    topicClusters,
  };
}

/**
 * Generates progressive hints from problem metadata and user context.
 */
export function buildMockHints(
  problemTitle: string,
  difficulty: string | null,
  tags: string[],
  mistakes: string[],
): Omit<ProgressiveHints, "problemId"> {
  const primaryTag = tags[0] ?? inferPatternFromTitle(problemTitle);
  const diffLabel = difficulty?.toLowerCase() ?? "unknown";

  return {
    problemTitle,
    levels: [
      {
        level: 1,
        title: "High-Level Observation",
        content: `For "${problemTitle}" (${diffLabel}): identify the structural property first — ordering, monotonicity, parity, or bounded range. ${primaryTag ? `Given your tags (${tags.join(", ") || primaryTag}), ask: does the answer depend on all elements or only on a sliding/compressed view?` : "Write one sentence: what invariant must stay true after each step?"}`,
      },
      {
        level: 2,
        title: "Algorithmic Strategy",
        content: primaryTag.includes("DP") || primaryTag.includes("Dynamic")
          ? `Define state clearly: dp[i] = best answer using prefix up to i. List transitions before coding. Target ${diffLabel} constraints: if n ≤ 10⁴, O(n log n) or O(n) is usually expected.`
          : primaryTag.includes("Graph") || primaryTag.includes("Tree")
            ? `Model as nodes/edges; choose BFS for unweighted shortest path, DFS for components/cycles. Check disconnected components and 1-indexed vs 0-indexed labels.`
            : `Consider two-pointer, binary search on answer, or hash map for complement lookups. For ${diffLabel} problems, prove why a greedy choice is safe before implementing.`,
      },
      {
        level: 3,
        title: "Code Blueprint / Pseudocode",
        content: `Pseudocode skeleton:\n1. Parse input → build core structure (array / graph / prefix sums)\n2. Initialize pointers / dp table / visited\n3. Loop: update state while maintaining invariant\n4. Return aggregated answer\nAvoid copying full solutions — implement from this outline.${mistakes.length > 0 ? `\n\nYou previously struggled with: ${mistakes.slice(0, 2).join("; ")} — double-check those areas.` : ""}`,
      },
      {
        level: 4,
        title: "Common Pitfalls",
        content: `Watch for: integer overflow (use BigInt or 64-bit), off-by-one in loops, empty input, single-element cases, and ${diffLabel === "hard" ? "time limit — avoid O(n²) if n > 10⁴" : "not handling duplicates"}. ${mistakes.length > 0 ? `Your logged mistakes suggest reviewing: ${mistakes.join("; ")}.` : "Log mistakes after each attempt to get tailored pitfall warnings."}`,
      },
    ],
  };
}

/**
 * Mock chat reply grounded in user profile.
 */
export function buildMockChatReply(
  message: string,
  profile: UserCoachProfile,
): string {
  const lower = message.toLowerCase();

  if (lower.includes("dp") || lower.includes("dynamic programming")) {
    return `Based on your vault (${profile.totalProblems} problems, avg rating ${profile.avgRating.toFixed(1)}): focus on defining state and base cases. ${profile.topTags.some((t) => t.name.toLowerCase().includes("dp")) ? "You have DP-tagged problems — re-solve one medium without editorial in 45 minutes." : "Tag your next DP solve and log the recurrence you used."}`;
  }

  if (lower.includes("interview") || lower.includes("mock")) {
    return `Mock interview tip: explain brute force → optimized approach → complexity. Your readiness indicators suggest ${profile.avgRating >= 3.5 ? "practicing hard problems under 35-minute timers" : "solidifying mediums with 2 attempts max before reading hints"}.`;
  }

  if (lower.includes("debug") || lower.includes("wrong answer")) {
    const topMistake = Object.entries(profile.mistakesByCategory).sort(
      (a, b) => b[1] - a[1],
    )[0];
    return topMistake
      ? `Your most logged mistake category is ${formatCategory(topMistake[0])} (${topMistake[1]}×). For WA/TLE: print small cases, check bounds, then complexity.`
      : "For debugging: use a minimal failing case, trace invariants line-by-line, then check overflow and index bounds.";
  }

  const recent = profile.recentMistakes[0];
  if (recent) {
    return `You asked: "${message.slice(0, 80)}${message.length > 80 ? "…" : ""}". Recent mistake pattern (${formatCategory(recent.category)}): "${recent.description.slice(0, 120)}". Try re-solving a similar tagged problem with a written invariant before coding.`;
  }

  return `Coach note: you've logged ${profile.totalProblems} problems with average ${profile.avgAttempts.toFixed(1)} attempts and rating ${profile.avgRating.toFixed(1)}/5. ${profile.topTags.length > 0 ? `Strongest tag exposure: ${profile.topTags.map((t) => t.name).join(", ")}.` : "Add tags to unlock topic-specific advice."} Ask about a specific pattern (e.g. "two pointers", "graphs") for a focused drill plan.`;
}

function formatCategory(category: string): string {
  return category
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function actionItemsForCategory(category: string): string[] {
  const map: Record<string, string[]> = {
    LOGIC: [
      "Write invariants on paper before coding.",
      "Re-solve one missed problem without editorial.",
    ],
    EDGE_CASE: [
      "Add a checklist: empty, n=1, duplicates, max values.",
      "Create 5 custom tests per problem.",
    ],
    COMPLEXITY: [
      "Estimate complexity before implementing.",
      "Practice one binary-search-on-answer problem.",
    ],
    SYNTAX: [
      "Use a language template file for fast IO and common imports.",
    ],
    IMPLEMENTATION: [
      "Implement in small functions; test each helper.",
    ],
    OTHER: [
      "Log the exact failing case when you make a mistake.",
    ],
  };
  return map[category] ?? map["OTHER"]!;
}

function buildReadinessNarrative(
  profile: UserCoachProfile,
  score: number,
): string {
  if (profile.totalProblems === 0) {
    return "Start logging solves to generate a readiness score. Aim for 10+ tagged problems for meaningful signal.";
  }
  if (score >= 75) {
    return `Strong portfolio (${profile.totalProblems} problems). You're averaging ${profile.avgRating.toFixed(1)}/5 confidence — push company-specific hard sets and timed mocks.`;
  }
  if (score >= 50) {
    return `Solid foundation with ${profile.totalProblems} logged problems. Focus on mistake categories you repeat and tighten attempt counts on mediums.`;
  }
  return `Building phase: ${profile.totalProblems} problems logged. Increase tagging, log mistakes honestly, and target consistent 3+ self-ratings before hard ramp-up.`;
}

function inferPatternFromTitle(title: string): string {
  const lower = title.toLowerCase();
  if (lower.includes("tree") || lower.includes("graph")) return "Graphs";
  if (lower.includes("substring") || lower.includes("subarray")) return "Sliding Window";
  if (lower.includes("path") || lower.includes("grid")) return "BFS/DFS";
  return "Arrays & Hashing";
}
