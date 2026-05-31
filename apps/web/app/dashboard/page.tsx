"use client";

import { useAuth } from "@/features/auth";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import {
  ListChecks,
  FileText,
  AlertTriangle,
  CalendarClock,
  ArrowRight,
  TrendingUp,
  Zap,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { motion } from "framer-motion";

interface OverviewStats {
  totalProblems: number;
  byDifficulty: { easy: number; medium: number; hard: number };
  byPlatform: Array<{ platformId: string; platformName: string; count: number }>;
  totalNotes: number;
  totalMistakes: number;
  mistakesByCategory: Record<string, number>;
  revisionsDueToday: number;
  recentProblems: Array<{
    id: string;
    title: string;
    difficulty: string | null;
    solveDate: string;
    platform: string;
  }>;
}

interface RevisionStats {
  dueToday: number;
  upcoming7Days: number;
  completed: number;
  total: number;
}

const fadeUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
};

function DifficultyBadge({ difficulty }: { difficulty: string | null }) {
  if (!difficulty) return null;
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

export default function DashboardPage() {
  const { user } = useAuth();

  const { data: overviewData, isLoading: overviewLoading } = useQuery({
    queryKey: ["stats", "overview"],
    queryFn: () =>
      apiClient<{ stats: OverviewStats }>("/stats/overview").then(
        (r) => r.stats,
      ),
    retry: false,
  });

  const { data: revisionData, isLoading: revisionLoading } = useQuery({
    queryKey: ["revisions", "stats"],
    queryFn: () =>
      apiClient<{ stats: RevisionStats }>("/revisions/stats").then(
        (r) => r.stats,
      ),
    retry: false,
  });

  const stats = overviewData;
  const revision = revisionData;
  const isLoading = overviewLoading || revisionLoading;

  const statCards = [
    {
      label: "Problems Solved",
      value: stats?.totalProblems ?? 0,
      icon: ListChecks,
      href: "/dashboard/problems",
      gradient: "from-violet-500 to-indigo-500",
    },
    {
      label: "Notes",
      value: stats?.totalNotes ?? 0,
      icon: FileText,
      href: "/dashboard/notes",
      gradient: "from-cyan-500 to-blue-500",
    },
    {
      label: "Mistakes Logged",
      value: stats?.totalMistakes ?? 0,
      icon: AlertTriangle,
      href: "/dashboard/mistakes",
      gradient: "from-amber-500 to-orange-500",
    },
    {
      label: "Revisions Due",
      value: revision?.dueToday ?? 0,
      icon: CalendarClock,
      href: "/dashboard/revision",
      gradient: "from-emerald-500 to-teal-500",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Greeting */}
      <motion.div {...fadeUp} transition={{ duration: 0.4 }}>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          Welcome back{user?.displayName ? `, ${user.displayName.split(" ")[0]}` : ""}! 👋
        </h1>
        <p className="mt-1 text-muted-foreground">
          Here&apos;s your competitive programming overview.
        </p>
      </motion.div>

      {/* Stat cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((card, i) => (
          <motion.div
            key={card.label}
            {...fadeUp}
            transition={{ duration: 0.4, delay: 0.05 * (i + 1) }}
          >
            <Link href={card.href}>
              <Card className="group relative overflow-hidden transition-shadow hover:shadow-lg">
                <div
                  className={`absolute inset-0 bg-gradient-to-br ${card.gradient} opacity-[0.06] transition-opacity group-hover:opacity-[0.12]`}
                />
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {card.label}
                  </CardTitle>
                  <card.icon className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <Skeleton className="h-8 w-16" />
                  ) : (
                    <div className="text-3xl font-bold">{card.value}</div>
                  )}
                </CardContent>
              </Card>
            </Link>
          </motion.div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Difficulty breakdown */}
        <motion.div {...fadeUp} transition={{ duration: 0.4, delay: 0.25 }}>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <TrendingUp className="h-4 w-4" />
                Difficulty Breakdown
              </CardTitle>
              <CardDescription>
                Problems solved by difficulty level
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-3">
                  <Skeleton className="h-8 w-full" />
                  <Skeleton className="h-8 w-full" />
                  <Skeleton className="h-8 w-full" />
                </div>
              ) : (
                <div className="space-y-3">
                  {[
                    { label: "Easy", count: stats?.byDifficulty.easy ?? 0, color: "bg-emerald-500" },
                    { label: "Medium", count: stats?.byDifficulty.medium ?? 0, color: "bg-amber-500" },
                    { label: "Hard", count: stats?.byDifficulty.hard ?? 0, color: "bg-red-500" },
                  ].map((d) => {
                    const total = stats?.totalProblems ?? 1;
                    const pct = total > 0 ? (d.count / total) * 100 : 0;
                    return (
                      <div key={d.label} className="space-y-1">
                        <div className="flex items-center justify-between text-sm">
                          <span className="font-medium">{d.label}</span>
                          <span className="text-muted-foreground">
                            {d.count} ({Math.round(pct)}%)
                          </span>
                        </div>
                        <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                          <div
                            className={`h-full rounded-full ${d.color} transition-all duration-700`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Recent problems */}
        <motion.div {...fadeUp} transition={{ duration: 0.4, delay: 0.3 }}>
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Zap className="h-4 w-4" />
                    Recent Activity
                  </CardTitle>
                  <CardDescription>
                    Your latest solved problems
                  </CardDescription>
                </div>
                <Button variant="ghost" size="sm" asChild>
                  <Link href="/dashboard/problems">
                    View all <ArrowRight className="ml-1 h-3 w-3" />
                  </Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : stats?.recentProblems && stats.recentProblems.length > 0 ? (
                <div className="space-y-3">
                  {stats.recentProblems.map((p) => (
                    <Link
                      key={p.id}
                      href={`/dashboard/problems/${p.id}`}
                      className="flex items-center justify-between rounded-lg border p-3 transition-colors hover:bg-muted/50"
                    >
                      <div className="space-y-1">
                        <p className="text-sm font-medium leading-none">
                          {p.title}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {p.platform} · {new Date(p.solveDate).toLocaleDateString()}
                        </p>
                      </div>
                      <DifficultyBadge difficulty={p.difficulty} />
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  No problems solved yet. Start by{" "}
                  <Link
                    href="/dashboard/problems/new"
                    className="text-primary underline-offset-4 hover:underline"
                  >
                    logging your first problem
                  </Link>
                  !
                </p>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Revision overview */}
      {revision && revision.total > 0 && (
        <motion.div {...fadeUp} transition={{ duration: 0.4, delay: 0.35 }}>
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <CalendarClock className="h-4 w-4" />
                    Revision Queue
                  </CardTitle>
                  <CardDescription>
                    Spaced repetition status
                  </CardDescription>
                </div>
                <Button variant="outline" size="sm" asChild>
                  <Link href="/dashboard/revision">
                    Start reviewing <ArrowRight className="ml-1 h-3 w-3" />
                  </Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-4">
                <div className="text-center">
                  <p className="text-2xl font-bold text-red-500">{revision.dueToday}</p>
                  <p className="text-xs text-muted-foreground">Due today</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-amber-500">{revision.upcoming7Days}</p>
                  <p className="text-xs text-muted-foreground">Next 7 days</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-emerald-500">{revision.completed}</p>
                  <p className="text-xs text-muted-foreground">Reviewed</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold">{revision.total}</p>
                  <p className="text-xs text-muted-foreground">Total items</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  );
}
