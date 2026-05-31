export type ProblemDifficulty = "easy" | "medium" | "hard";

export type ProblemSummary = {
  id: string;
  title: string;
  platform: string;
  difficulty: ProblemDifficulty;
  tags: string[];
  solvedAt?: string;
};

export const PROBLEMS_QUERY_KEY = ["problems"] as const;
