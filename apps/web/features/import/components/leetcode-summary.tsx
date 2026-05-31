// apps/web/features/import/components/leetcode-summary.tsx

"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronDown,
  ExternalLink,
  HelpCircle,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useLeetCodeSummary,
  useSyncLeetCode,
  useToggleDoubtful,
  type LeetCodeSummary,
} from "../leetcode";

function DifficultyBadge({ difficulty }: { difficulty: string | null }) {
  if (!difficulty) return <Badge variant="secondary">—</Badge>;
  const variant =
    difficulty === "EASY"
      ? "success"
      : difficulty === "MEDIUM"
        ? "warning"
        : "destructive";
  return (
    <Badge variant={variant as "success" | "warning" | "destructive"}>
      {difficulty.toLowerCase()}
    </Badge>
  );
}

interface LeetCodeSummaryViewProps {
  showSyncButton?: boolean;
  onContinue?: () => void;
}

/**
 * Clustered LeetCode import summary with doubtful-question toggles.
 */
export function LeetCodeSummaryView({
  showSyncButton = true,
  onContinue,
}: LeetCodeSummaryViewProps) {
  const { data: summary, isLoading, isError, refetch } = useLeetCodeSummary(true);
  const syncMutation = useSyncLeetCode();
  const toggleMutation = useToggleDoubtful();
  const [expandedClusters, setExpandedClusters] = useState<Set<string>>(new Set());

  const toggleCluster = (name: string) => {
    setExpandedClusters((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (isError || !summary) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          Could not load LeetCode summary. Sync your account first.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <SummaryHeader
        summary={summary}
        showSyncButton={showSyncButton}
        isSyncing={syncMutation.isPending}
        onSync={() => syncMutation.mutate()}
      />

      {summary.clusters.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            No problems imported yet. Run sync to pull your accepted submissions.
          </CardContent>
        </Card>
      ) : (
        summary.clusters.map((cluster) => {
          const isExpanded =
            expandedClusters.has(cluster.name) ||
            summary.clusters.length <= 3;

          return (
            <Card
              key={cluster.name}
              className="overflow-hidden border-orange-500/20"
            >
              <CardHeader
                className="cursor-pointer bg-gradient-to-r from-orange-500/5 to-amber-500/5"
                onClick={() => toggleCluster(cluster.name)}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <CardTitle className="text-base">{cluster.name}</CardTitle>
                    <p className="line-clamp-2 text-xs text-muted-foreground">
                      {cluster.description}
                    </p>
                    <div className="flex flex-wrap gap-2 pt-1">
                      <Badge variant="outline">
                        {cluster.problemCount} problems
                      </Badge>
                      <Badge variant="outline">
                        ~{cluster.avgAttempts} avg attempts to AC
                      </Badge>
                    </div>
                  </div>
                  <ChevronDown
                    className={`h-5 w-5 shrink-0 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                  />
                </div>
              </CardHeader>

              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                  >
                    <CardContent className="space-y-2 pt-0">
                      {cluster.problems.map((problem) => (
                        <div
                          key={problem.userProblemId}
                          className={`flex flex-wrap items-center gap-3 rounded-lg border p-3 transition-colors ${
                            problem.isDoubtful
                              ? "border-amber-500/40 bg-amber-500/10"
                              : "bg-muted/30"
                          }`}
                        >
                          <label className="flex cursor-pointer items-center gap-2">
                            <input
                              type="checkbox"
                              checked={problem.isDoubtful}
                              disabled={toggleMutation.isPending}
                              onChange={(event) =>
                                toggleMutation.mutate({
                                  userProblemId: problem.userProblemId,
                                  isDoubtful: event.target.checked,
                                })
                              }
                              className="h-4 w-4 rounded border-muted-foreground accent-amber-500"
                            />
                            <span className="flex items-center gap-1 text-xs font-medium text-amber-700 dark:text-amber-400">
                              <HelpCircle className="h-3 w-3" />
                              Doubtful
                            </span>
                          </label>

                          <div className="min-w-0 flex-1">
                            <p className="font-medium leading-tight">
                              {problem.title}
                            </p>
                            {problem.problemSummary && (
                              <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
                                {problem.problemSummary}
                              </p>
                            )}
                          </div>

                          <DifficultyBadge difficulty={problem.difficulty} />

                          <Badge
                            variant="secondary"
                            className="shrink-0 tabular-nums"
                          >
                            {problem.attempts} attempt
                            {problem.attempts !== 1 ? "s" : ""} to AC
                          </Badge>

                          {problem.url && (
                            <Button variant="ghost" size="icon" asChild>
                              <a
                                href={problem.url}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                <ExternalLink className="h-4 w-4" />
                              </a>
                            </Button>
                          )}
                        </div>
                      ))}
                    </CardContent>
                  </motion.div>
                )}
              </AnimatePresence>
            </Card>
          );
        })
      )}

      <div className="flex flex-wrap gap-3">
        <Button variant="outline" onClick={() => void refetch()}>
          Refresh view
        </Button>
        {onContinue && (
          <Button onClick={onContinue}>Continue to Dashboard</Button>
        )}
      </div>
    </div>
  );
}

function SummaryHeader({
  summary,
  showSyncButton,
  isSyncing,
  onSync,
}: {
  summary: LeetCodeSummary;
  showSyncButton: boolean;
  isSyncing: boolean;
  onSync: () => void;
}) {
  return (
    <Card className="border-orange-500/30 bg-gradient-to-br from-orange-500/10 via-card to-amber-500/5">
      <CardContent className="p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm text-muted-foreground">LeetCode profile</p>
            <h2 className="text-xl font-bold">@{summary.username}</h2>
            <p className="mt-2 max-w-xl text-sm text-muted-foreground">
              {summary.totalImported} accepted problems grouped by topic /
              description. Mark doubtful questions to revisit in revision.
            </p>
          </div>
          {showSyncButton && (
            <Button
              variant="outline"
              disabled={isSyncing}
              onClick={onSync}
              className="border-orange-500/40"
            >
              {isSyncing ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="mr-2 h-4 w-4" />
              )}
              Re-sync from LeetCode
            </Button>
          )}
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: "Imported", value: summary.totalImported },
            { label: "Total AC attempts*", value: summary.totalAttempts },
            { label: "Doubtful marked", value: summary.doubtfulCount },
            {
              label: "Topic clusters",
              value: summary.clusters.length,
            },
          ].map((stat) => (
            <div
              key={stat.label}
              className="rounded-lg border bg-background/60 p-3 text-center"
            >
              <p className="text-2xl font-bold">{stat.value}</p>
              <p className="text-[10px] text-muted-foreground">{stat.label}</p>
            </div>
          ))}
        </div>
        <p className="mt-2 text-[10px] text-muted-foreground">
          *Attempts estimated from your public AC submission history on LeetCode.
        </p>
      </CardContent>
    </Card>
  );
}
