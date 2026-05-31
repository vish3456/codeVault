export type RevisionCard = {
  id: string;
  problemId: string;
  title: string;
  nextReviewAt: string;
  intervalDays: number;
};

export const REVISION_QUERY_KEY = ["revision"] as const;
