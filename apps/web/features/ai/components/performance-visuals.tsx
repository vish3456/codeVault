// apps/web/features/ai/components/performance-visuals.tsx

"use client";

import { motion } from "framer-motion";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Layers,
  Star,
  TrendingDown,
  TrendingUp,
  Minus,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { PerformanceVisual } from "../ai";

const MISTAKE_COLORS: Record<string, string> = {
  LOGIC: "bg-violet-500",
  EDGE_CASE: "bg-amber-500",
  COMPLEXITY: "bg-cyan-500",
  SYNTAX: "bg-blue-500",
  IMPLEMENTATION: "bg-indigo-500",
  OTHER: "bg-slate-500",
};

const DIFFICULTY_COLORS = {
  easy: { bar: "bg-emerald-500", stroke: "#10b981" },
  medium: { bar: "bg-amber-500", stroke: "#f59e0b" },
  hard: { bar: "bg-red-500", stroke: "#ef4444" },
} as const;

function formatCategory(category: string): string {
  return category
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function TrendIcon({ trend }: { trend: PerformanceVisual["trend"] }) {
  if (trend === "improving") {
    return <TrendingUp className="h-5 w-5 text-emerald-500" />;
  }
  if (trend === "needs_focus") {
    return <TrendingDown className="h-5 w-5 text-amber-500" />;
  }
  return <Minus className="h-5 w-5 text-violet-500" />;
}

function DonutChart({
  segments,
}: {
  segments: Array<{ label: string; value: number; stroke: string; dot: string }>;
}) {
  const total = segments.reduce((sum, segment) => sum + segment.value, 0);
  if (total === 0) {
    return (
      <div className="flex h-36 items-center justify-center text-sm text-muted-foreground">
        No difficulty data yet
      </div>
    );
  }

  let cumulative = 0;
  const radius = 42;
  const circumference = 2 * Math.PI * radius;

  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-center sm:justify-center sm:gap-8">
      <div className="relative h-36 w-36">
        <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
          <circle
            cx="50"
            cy="50"
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth="12"
            className="text-muted/30"
          />
          {segments.map((segment) => {
            const pct = segment.value / total;
            const dash = pct * circumference;
            const offset = cumulative * circumference;
            cumulative += pct;
            return (
              <motion.circle
                key={segment.label}
                cx="50"
                cy="50"
                r={radius}
                fill="none"
                strokeWidth="12"
                strokeLinecap="round"
                strokeDasharray={`${dash} ${circumference - dash}`}
                strokeDashoffset={-offset}
                stroke={segment.stroke}
                initial={{ strokeDasharray: `0 ${circumference}` }}
                animate={{
                  strokeDasharray: `${dash} ${circumference - dash}`,
                }}
                transition={{ duration: 0.9, ease: "easeOut" }}
              />
            );
          })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold">{total}</span>
          <span className="text-[10px] text-muted-foreground">solved</span>
        </div>
      </div>
      <div className="space-y-2">
        {segments.map((segment) => (
          <div key={segment.label} className="flex items-center gap-2 text-sm">
            <span
              className={`h-2.5 w-2.5 rounded-full ${segment.dot}`}
            />
            <span className="font-medium">{segment.label}</span>
            <span className="text-muted-foreground">
              {segment.value} (
              {total > 0 ? Math.round((segment.value / total) * 100) : 0}%)
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

interface PerformanceVisualsProps {
  visual: PerformanceVisual;
}

/**
 * Rich visual breakdown of competitive programming performance.
 */
export function PerformanceVisuals({ visual }: PerformanceVisualsProps) {
  const mistakeEntries = Object.entries(visual.mistakesByCategory).filter(
    ([, count]) => count > 0,
  );
  const maxMistakes = Math.max(
    ...mistakeEntries.map(([, count]) => count),
    1,
  );

  const difficultySegments = [
    {
      label: "Easy",
      value: visual.difficultyMix.easy,
      stroke: DIFFICULTY_COLORS.easy.stroke,
      dot: DIFFICULTY_COLORS.easy.bar,
    },
    {
      label: "Medium",
      value: visual.difficultyMix.medium,
      stroke: DIFFICULTY_COLORS.medium.stroke,
      dot: DIFFICULTY_COLORS.medium.bar,
    },
    {
      label: "Hard",
      value: visual.difficultyMix.hard,
      stroke: DIFFICULTY_COLORS.hard.stroke,
      dot: DIFFICULTY_COLORS.hard.bar,
    },
  ];

  const trendLabel =
    visual.trend === "improving"
      ? "Improving"
      : visual.trend === "needs_focus"
        ? "Needs focus"
        : "Steady";

  return (
    <div className="space-y-6">
      {/* Narrative hero */}
      <Card className="overflow-hidden border-violet-500/25 bg-gradient-to-br from-violet-600/10 via-indigo-500/5 to-cyan-500/10">
        <CardContent className="p-6">
          <div className="flex flex-wrap items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 shadow-lg shadow-violet-500/20">
              <Activity className="h-6 w-6 text-white" />
            </div>
            <div className="min-w-0 flex-1 space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg font-bold tracking-tight">
                  {visual.headline}
                </h2>
                <Badge
                  variant="outline"
                  className="gap-1 border-violet-500/40 bg-violet-500/10"
                >
                  <TrendIcon trend={visual.trend} />
                  {trendLabel}
                </Badge>
              </div>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {visual.narrative}
              </p>
              {visual.highlights.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {visual.highlights.map((highlight) => (
                    <span
                      key={highlight}
                      className="rounded-full border border-white/10 bg-background/60 px-3 py-1 text-xs font-medium backdrop-blur-sm"
                    >
                      {highlight}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Quick metrics strip */}
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              {
                label: "Avg rating",
                value: `${visual.avgRating}★`,
                icon: Star,
                color: "text-amber-500",
              },
              {
                label: "Avg attempts",
                value: visual.avgAttempts.toFixed(1),
                icon: BarChart3,
                color: "text-violet-500",
              },
              {
                label: "Hard share",
                value: `${visual.hardProblemShare}%`,
                icon: Layers,
                color: "text-red-500",
              },
              {
                label: "Revisions due",
                value: String(visual.revisionsDue),
                icon: AlertTriangle,
                color: "text-emerald-500",
              },
            ].map((metric) => (
              <div
                key={metric.label}
                className="rounded-lg border bg-background/50 p-3 text-center backdrop-blur-sm"
              >
                <metric.icon
                  className={`mx-auto mb-1 h-4 w-4 ${metric.color}`}
                />
                <p className="text-lg font-bold">{metric.value}</p>
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                  {metric.label}
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Difficulty donut */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Difficulty Portfolio</CardTitle>
          </CardHeader>
          <CardContent>
            <DonutChart segments={difficultySegments} />
          </CardContent>
        </Card>

        {/* Platform mix */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Platform Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            {visual.platformMix.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No platform data yet
              </p>
            ) : (
              <div className="space-y-3">
                {visual.platformMix.map((platform) => {
                  const pct =
                    visual.totalSolved > 0
                      ? (platform.count / visual.totalSolved) * 100
                      : 0;
                  return (
                    <div key={platform.name} className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="font-medium">{platform.name}</span>
                        <span className="text-muted-foreground">
                          {platform.count} ({Math.round(pct)}%)
                        </span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-muted">
                        <motion.div
                          className="h-full rounded-full bg-gradient-to-r from-violet-500 to-indigo-500"
                          initial={{ width: 0 }}
                          animate={{ width: `${pct}%` }}
                          transition={{ duration: 0.7 }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Mistake heatmap bars */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Mistake Pattern Heatmap</CardTitle>
          </CardHeader>
          <CardContent>
            {mistakeEntries.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                Log mistakes to see your error pattern visualization
              </p>
            ) : (
              <div className="space-y-3">
                {mistakeEntries
                  .sort((a, b) => b[1] - a[1])
                  .map(([category, count]) => (
                    <div key={category} className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="font-medium">
                          {formatCategory(category)}
                        </span>
                        <span className="text-muted-foreground">{count}</span>
                      </div>
                      <div className="h-3 overflow-hidden rounded-full bg-muted">
                        <motion.div
                          className={`h-full rounded-full ${MISTAKE_COLORS[category] ?? "bg-slate-500"}`}
                          initial={{ width: 0 }}
                          animate={{
                            width: `${(count / maxMistakes) * 100}%`,
                          }}
                          transition={{ duration: 0.6 }}
                        />
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
