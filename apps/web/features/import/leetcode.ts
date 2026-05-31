// apps/web/features/import/leetcode.ts

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";

export interface LeetCodeStatus {
  connected: boolean;
  username: string | null;
  syncedAt: string | null;
  importedCount: number;
  doubtfulCount: number;
}

export interface ClusteredProblem {
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

export interface ProblemCluster {
  name: string;
  description: string;
  problemCount: number;
  avgAttempts: number;
  problems: ClusteredProblem[];
}

export interface LeetCodeSummary {
  username: string;
  totalImported: number;
  doubtfulCount: number;
  totalAttempts: number;
  syncedAt: string | null;
  clusters: ProblemCluster[];
}

export const LEETCODE_STATUS_KEY = ["leetcode", "status"] as const;
export const LEETCODE_SUMMARY_KEY = ["leetcode", "summary"] as const;

export function useLeetCodeStatus() {
  return useQuery({
    queryKey: LEETCODE_STATUS_KEY,
    queryFn: () =>
      apiClient<{ status: LeetCodeStatus }>("/import/leetcode/status").then(
        (response) => response.status,
      ),
  });
}

export function useLeetCodeSummary(enabled: boolean) {
  return useQuery({
    queryKey: LEETCODE_SUMMARY_KEY,
    queryFn: () =>
      apiClient<{ summary: LeetCodeSummary }>("/import/leetcode/summary").then(
        (response) => response.summary,
      ),
    enabled,
  });
}

export function useConnectLeetCode() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (username: string) =>
      apiClient<{ status: LeetCodeStatus }>("/import/leetcode/connect", {
        method: "POST",
        body: JSON.stringify({ username }),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: LEETCODE_STATUS_KEY });
    },
  });
}

export function useSyncLeetCode() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () =>
      apiClient<{ imported: number; updated: number }>("/import/leetcode/sync", {
        method: "POST",
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: LEETCODE_STATUS_KEY });
      void queryClient.invalidateQueries({ queryKey: LEETCODE_SUMMARY_KEY });
      void queryClient.invalidateQueries({ queryKey: ["problems"] });
      void queryClient.invalidateQueries({ queryKey: ["stats"] });
    },
  });
}

export function useToggleDoubtful() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      userProblemId,
      isDoubtful,
    }: {
      userProblemId: string;
      isDoubtful: boolean;
    }) =>
      apiClient<{ problem: ClusteredProblem }>(
        `/import/leetcode/user-problems/${userProblemId}/doubtful`,
        {
          method: "PATCH",
          body: JSON.stringify({ isDoubtful }),
        },
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: LEETCODE_SUMMARY_KEY });
      void queryClient.invalidateQueries({ queryKey: LEETCODE_STATUS_KEY });
    },
  });
}

export function useManualImportLeetCode() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (problems: Array<{ title: string; titleSlug: string; status: string; difficulty?: string; id?: number }>) =>
      apiClient<{ imported: number; updated: number }>("/import/leetcode/manual", {
        method: "POST",
        body: JSON.stringify({ problems }),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: LEETCODE_STATUS_KEY });
      void queryClient.invalidateQueries({ queryKey: LEETCODE_SUMMARY_KEY });
      void queryClient.invalidateQueries({ queryKey: ["problems"] });
      void queryClient.invalidateQueries({ queryKey: ["stats"] });
    },
  });
}
