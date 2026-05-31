// apps/web/features/ai/index.ts

export interface WeaknessItem {
  id: string;
  name: string;
  category: string;
  severity: "HIGH" | "MEDIUM" | "LOW";
  description: string;
  recommendations: string[];
}

export interface TopicProficiency {
  topic: string;
  solvedCount: number;
  proficiency: number;
  status: "MASTERED" | "IMPROVING" | "NEEDS_PRACTICE";
}

export interface AIInsightsResponse {
  readinessScore: number;
  verdict: string;
  weaknesses: WeaknessItem[];
  topicClusters: TopicProficiency[];
  updatedAt: string;
}

export interface ProblemHintResponse {
  problemId: string;
  title: string;
  hints: {
    observation: string;
    strategy: string;
    blueprint: string;
  };
  pitfalls: string[];
}

export interface ChatMessage {
  role: "user" | "model";
  content: string;
}

export const AI_INSIGHT_QUERY_KEY = ["ai", "insights"] as const;
export const AI_COACH_CHAT_QUERY_KEY = ["ai", "coach", "chat"] as const;
export const AI_HINTS_QUERY_KEY = ["ai", "problems", "hints"] as const;
