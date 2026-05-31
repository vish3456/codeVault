"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import {
  CalendarClock,
  CheckCircle2,
  ChevronRight,
  Zap,
  Brain,
  Flame,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";

interface RevisionDTO {
  id: string;
  intervalStage: string;
  nextReviewAt: string;
  lastReviewedAt: string | null;
  problem: { id: string; title: string; difficulty: string | null } | null;
  note: { id: string; title: string } | null;
}

interface RevisionStats {
  dueToday: number;
  upcoming7Days: number;
  completed: number;
  total: number;
}

const stageLabels: Record<string, string> = {
  DAY_1: "Day 1",
  DAY_3: "Day 3",
  DAY_7: "Day 7",
  DAY_15: "Day 15",
  DAY_30: "Day 30",
};

export default function RevisionPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());

  const { data: dueData, isLoading: dueLoading } = useQuery({
    queryKey: ["revisions", "due"],
    queryFn: () =>
      apiClient<{ revisions: RevisionDTO[] }>("/revisions/due").then(
        (r) => r.revisions,
      ),
    retry: false,
  });

  const { data: statsData, isLoading: statsLoading } = useQuery({
    queryKey: ["revisions", "stats"],
    queryFn: () =>
      apiClient<{ stats: RevisionStats }>("/revisions/stats").then(
        (r) => r.stats,
      ),
    retry: false,
  });

  const completeMutation = useMutation({
    mutationFn: ({
      revisionId,
      quality,
    }: {
      revisionId: string;
      quality: "easy" | "medium" | "hard";
    }) =>
      apiClient(`/revisions/${revisionId}/complete`, {
        method: "POST",
        body: JSON.stringify({ quality }),
      }),
    onSuccess: (_, variables) => {
      setCompletedIds((prev) => new Set(prev).add(variables.revisionId));
      void queryClient.invalidateQueries({ queryKey: ["revisions"] });
      toast({ title: "Review recorded! 🎉" });
    },
  });

  const isLoading = dueLoading || statsLoading;
  const stats = statsData;
  const dueRevisions = dueData?.filter((r) => !completedIds.has(r.id)) ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Revision Queue</h1>
        <p className="text-sm text-muted-foreground">
          Spaced repetition to make patterns stick.
        </p>
      </div>

      {/* Stats row */}
      {stats && (
        <div className="grid gap-4 sm:grid-cols-4">
          {[
            { label: "Due Now", value: dueRevisions.length, icon: Flame, color: "text-red-500" },
            { label: "Next 7 Days", value: stats.upcoming7Days, icon: CalendarClock, color: "text-amber-500" },
            { label: "Reviewed", value: stats.completed, icon: CheckCircle2, color: "text-emerald-500" },
            { label: "Total", value: stats.total, icon: Brain, color: "text-primary" },
          ].map((s) => (
            <Card key={s.label}>
              <CardContent className="flex items-center gap-3 p-4">
                <s.icon className={`h-5 w-5 ${s.color}`} />
                <div>
                  <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Review cards */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-28 w-full rounded-lg" />
          ))}
        </div>
      ) : dueRevisions.length > 0 ? (
        <div className="space-y-4">
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <Zap className="h-5 w-5 text-amber-500" />
            Time to Review ({dueRevisions.length})
          </h2>
          <AnimatePresence mode="popLayout">
            {dueRevisions.map((revision) => (
              <motion.div
                key={revision.id}
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9, y: -20 }}
                transition={{ duration: 0.3 }}
              >
                <Card className="overflow-hidden">
                  <CardContent className="p-0">
                    <div className="flex flex-col sm:flex-row">
                      {/* Left: info */}
                      <div className="flex-1 space-y-2 p-4">
                        <div className="flex items-center gap-2">
                          {revision.problem ? (
                            <>
                              <h3 className="font-medium">
                                {revision.problem.title}
                              </h3>
                              {revision.problem.difficulty && (
                                <Badge
                                  variant={
                                    revision.problem.difficulty === "EASY"
                                      ? "success"
                                      : revision.problem.difficulty === "MEDIUM"
                                        ? "warning"
                                        : "destructive"
                                  }
                                  className="text-[10px]"
                                >
                                  {revision.problem.difficulty.toLowerCase()}
                                </Badge>
                              )}
                            </>
                          ) : revision.note ? (
                            <h3 className="font-medium">📝 {revision.note.title}</h3>
                          ) : (
                            <h3 className="font-medium text-muted-foreground">
                              Unknown item
                            </h3>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          <Badge variant="outline" className="text-[10px]">
                            {stageLabels[revision.intervalStage] ?? revision.intervalStage}
                          </Badge>
                          {revision.lastReviewedAt && (
                            <span>
                              Last reviewed:{" "}
                              {new Date(revision.lastReviewedAt).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Right: quality buttons */}
                      <div className="flex items-center gap-2 border-t p-4 sm:border-l sm:border-t-0">
                        <span className="text-xs text-muted-foreground mr-2">
                          How was it?
                        </span>
                        {([
                          { quality: "hard" as const, label: "Hard", color: "bg-red-500 hover:bg-red-600" },
                          { quality: "medium" as const, label: "Good", color: "bg-amber-500 hover:bg-amber-600" },
                          { quality: "easy" as const, label: "Easy", color: "bg-emerald-500 hover:bg-emerald-600" },
                        ] as const).map((q) => (
                          <Button
                            key={q.quality}
                            size="sm"
                            className={`${q.color} text-white`}
                            disabled={completeMutation.isPending}
                            onClick={() =>
                              completeMutation.mutate({
                                revisionId: revision.id,
                                quality: q.quality,
                              })
                            }
                          >
                            {q.label}
                          </Button>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <CheckCircle2 className="mx-auto mb-3 h-12 w-12 text-emerald-500" />
            <p className="text-lg font-medium">All caught up! 🎉</p>
            <p className="text-sm text-muted-foreground">
              No revisions due right now. Keep solving problems!
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
