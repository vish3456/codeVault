// apps/web/features/ai/ai.ts

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";

export interface WeaknessItem {
  category: string;
  severity: "low" | "medium" | "high";
  description: string;
  actionItems: string[];
}

export interface TopicCluster {
  topic: string;
  proficiency: number;
  problemCount: number;
  recommendation: string;
}

export interface PerformanceVisual {
  headline: string;
  trend: "improving" | "steady" | "needs_focus";
  narrative: string;
  highlights: string[];
  difficultyMix: { easy: number; medium: number; hard: number };
  mistakesByCategory: Record<string, number>;
  platformMix: Array<{ name: string; count: number }>;
  avgRating: number;
  avgAttempts: number;
  totalSolved: number;
  revisionsDue: number;
  mistakeRate: number;
  hardProblemShare: number;
}

export interface CoachInsights {
  readinessScore: number;
  readinessAnalysis: string;
  performanceVisual: PerformanceVisual;
  weaknessMap: WeaknessItem[];
  topicClusters: TopicCluster[];
}

export interface CoachInsightsResponse {
  insights: CoachInsights;
  source: "gemini" | "mock";
  generatedAt: string;
}

export interface HintLevel {
  level: number;
  title: string;
  content: string;
}

export interface ProgressiveHintsResponse {
  hints: {
    problemId: string;
    problemTitle: string;
    levels: HintLevel[];
  };
  source: "gemini" | "mock";
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export const AI_INSIGHTS_KEY = ["ai", "insights"] as const;
export const AI_HINTS_KEY = (problemId: string) =>
  ["ai", "hints", problemId] as const;

export async function fetchAiInsights(): Promise<CoachInsightsResponse> {
  return apiClient<CoachInsightsResponse>("/ai/insights");
}

export async function refreshAiInsights(): Promise<CoachInsightsResponse> {
  return apiClient<CoachInsightsResponse>("/ai/insights/refresh", {
    method: "POST",
  });
}

export async function sendCoachMessage(
  message: string,
  history: ChatMessage[],
): Promise<{ reply: string; source: "gemini" | "mock" }> {
  return apiClient("/ai/coach/chat", {
    method: "POST",
    body: JSON.stringify({ message, history }),
  });
}

export async function fetchProblemHints(
  problemId: string,
): Promise<ProgressiveHintsResponse> {
  return apiClient<ProgressiveHintsResponse>(
    `/ai/problems/${problemId}/hints`,
  );
}

export function useAiInsights() {
  return useQuery({
    queryKey: AI_INSIGHTS_KEY,
    queryFn: fetchAiInsights,
    staleTime: 60_000,
  });
}

export function useRefreshAiInsights() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: refreshAiInsights,
    onSuccess: (data) => {
      queryClient.setQueryData(AI_INSIGHTS_KEY, data);
    },
  });
}

export function useProblemHints(problemId: string, enabled: boolean) {
  return useQuery({
    queryKey: AI_HINTS_KEY(problemId),
    queryFn: () => fetchProblemHints(problemId),
    enabled: enabled && Boolean(problemId),
    staleTime: 300_000,
  });
}
