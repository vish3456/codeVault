export type AiInsightRequest = {
  problemId: string;
  context?: string;
};

export type AiInsightResponse = {
  summary: string;
  patterns: string[];
  pitfalls: string[];
};

export const AI_INSIGHT_QUERY_KEY = ["ai", "insight"] as const;
