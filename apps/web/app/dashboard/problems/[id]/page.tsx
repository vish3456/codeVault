"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import Link from "next/link";
import {
  ArrowLeft,
  ExternalLink,
  CalendarClock,
  Trash2,
  BrainCircuit,
  ChevronDown,
  ChevronUp,
  Sparkles,
  CheckCircle2,
  Lock,
} from "lucide-react";
import type { ProblemHintResponse } from "@/features/ai";

interface ProblemDetail {
  id: string;
  title: string;
  externalId: string;
  difficulty: string | null;
  url: string | null;
  platform: { id: string; name: string; slug: string };
  userProblem: {
    id: string;
    solveDate: string;
    language: string;
    attempts: number;
    rating: number;
  } | null;
  tags: Array<{ id: string; name: string; color: string | null }>;
  createdAt: string;
  updatedAt: string;
}

function DifficultyBadge({ difficulty }: { difficulty: string | null }) {
  if (!difficulty) return <Badge variant="secondary">unknown</Badge>;
  const variant =
    difficulty === "EASY"
      ? "success"
      : difficulty === "MEDIUM"
        ? "warning"
        : "destructive";
  return <Badge variant={variant as "success" | "warning" | "destructive"} className="text-sm">{difficulty.toLowerCase()}</Badge>;
}

export default function ProblemDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const problemId = params["id"] as string;

  const [showHints, setShowHints] = useState(false);
  const [unlockedLevel, setUnlockedLevel] = useState(0);

  const { data: hintsData, isLoading: isHintsLoading } = useQuery({
    queryKey: ["ai", "problems", "hints", problemId],
    queryFn: () =>
      apiClient<{ hints: ProblemHintResponse }>(`/ai/problems/${problemId}/hints`).then(
        (r) => r.hints,
      ),
    enabled: showHints,
    retry: false,
  });

  const { data, isLoading } = useQuery({
    queryKey: ["problems", problemId],
    queryFn: () =>
      apiClient<{ problem: ProblemDetail }>(`/problems/${problemId}`).then(
        (r) => r.problem,
      ),
    retry: false,
  });

  const deleteMutation = useMutation({
    mutationFn: () =>
      apiClient(`/problems/${problemId}`, { method: "DELETE" }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["problems"] });
      void queryClient.invalidateQueries({ queryKey: ["stats"] });
      toast({ title: "Problem removed from your log." });
      router.push("/dashboard/problems");
    },
  });

  const addRevisionMutation = useMutation({
    mutationFn: () =>
      apiClient("/revisions", {
        method: "POST",
        body: JSON.stringify({ problemId }),
      }),
    onSuccess: () => {
      toast({
        title: "Added to revision queue",
        description: "You'll be reminded to review this problem.",
      });
    },
  });

  if (isLoading) {
    return (
      <div className="mx-auto max-w-3xl space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="mx-auto max-w-3xl space-y-4">
        <p className="text-muted-foreground">Problem not found.</p>
        <Button variant="outline" asChild>
          <Link href="/dashboard/problems">Back to problems</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/dashboard/problems">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight">{data.title}</h1>
            <DifficultyBadge difficulty={data.difficulty} />
          </div>
          <p className="text-sm text-muted-foreground">
            {data.platform.name} · #{data.externalId}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {data.url && (
            <Button variant="outline" size="sm" asChild>
              <a href={data.url} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="mr-1 h-3 w-3" /> Open
              </a>
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => addRevisionMutation.mutate()}
            disabled={addRevisionMutation.isPending}
          >
            <CalendarClock className="mr-1 h-3 w-3" /> Add to Revision
          </Button>
        </div>
      </div>

      {/* Solve details */}
      {data.userProblem && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Your Solve</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-4">
              <div>
                <p className="text-xs text-muted-foreground">Language</p>
                <p className="font-medium">{data.userProblem.language}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Solve Date</p>
                <p className="font-medium">
                  {new Date(data.userProblem.solveDate).toLocaleDateString()}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Attempts</p>
                <p className="font-medium">{data.userProblem.attempts}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Self Rating</p>
                <div className="flex items-center gap-0.5">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <span
                      key={star}
                      className={
                        star <= data.userProblem!.rating
                          ? "text-amber-400"
                          : "text-muted-foreground/30"
                      }
                    >
                      ★
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tags */}
      {data.tags.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Tags</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {data.tags.map((tag) => (
                <Badge
                  key={tag.id}
                  variant="outline"
                  style={
                    tag.color
                      ? { borderColor: tag.color, color: tag.color }
                      : undefined
                  }
                >
                  {tag.name}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 💡 AI Coach Progressive Hints Collapsible Card */}
      <Card className="border-violet-500/20 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-violet-500/[0.01] to-indigo-500/[0.01] pointer-events-none" />
        <CardHeader
          className="flex flex-row items-center justify-between cursor-pointer py-4 hover:bg-muted/10 transition-colors"
          onClick={() => setShowHints(!showHints)}
        >
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded bg-violet-500/10 text-violet-500">
              <BrainCircuit className="h-4 w-4" />
            </div>
            <div>
              <CardTitle className="text-base font-bold">AI Coach Progressive Hints</CardTitle>
              <CardDescription className="text-xs">
                Unlock high-level observation to code blueprint, without solution spoiling.
              </CardDescription>
            </div>
          </div>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            {showHints ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        </CardHeader>

        {showHints && (
          <CardContent className="border-t p-5 space-y-4">
            {isHintsLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-20 w-full" />
              </div>
            ) : !hintsData ? (
              <div className="py-4 text-center text-xs text-muted-foreground">
                <Sparkles className="inline-block mr-1 h-3.5 w-3.5 text-violet-500 animate-pulse" />
                Initializing hints engine...
              </div>
            ) : (
              <div className="space-y-4">
                {/* HINT 1: OBSERVATION */}
                <div className="rounded-lg border p-4 transition-all">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-violet-500">LEVEL 1: HIGH-LEVEL OBSERVATION</span>
                    {unlockedLevel >= 1 ? (
                      <Badge variant="outline" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 text-[10px]">UNLOCKED</Badge>
                    ) : (
                      <Badge variant="outline" className="bg-muted text-muted-foreground text-[10px]">LOCKED</Badge>
                    )}
                  </div>

                  {unlockedLevel >= 1 ? (
                    <p className="mt-2 text-xs text-foreground leading-relaxed whitespace-pre-wrap">{hintsData.hints.observation}</p>
                  ) : (
                    <div className="mt-3 flex items-center justify-between">
                      <p className="text-[11px] text-muted-foreground">Stuck on where to begin? Get a conceptual observation nudge.</p>
                      <Button
                        size="sm"
                        className="bg-violet-600 hover:bg-violet-500 text-white text-[11px] h-7 px-3"
                        onClick={() => setUnlockedLevel(1)}
                      >
                        <Lock className="mr-1 h-3 w-3" /> Reveal Observation
                      </Button>
                    </div>
                  )}
                </div>

                {/* HINT 2: STRATEGY */}
                <div className="rounded-lg border p-4 transition-all">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-violet-500">LEVEL 2: ALGORITHMIC STRATEGY</span>
                    {unlockedLevel >= 2 ? (
                      <Badge variant="outline" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 text-[10px]">UNLOCKED</Badge>
                    ) : (
                      <Badge variant="outline" className="bg-muted text-muted-foreground text-[10px]">LOCKED</Badge>
                    )}
                  </div>

                  {unlockedLevel >= 2 ? (
                    <p className="mt-2 text-xs text-foreground leading-relaxed whitespace-pre-wrap">{hintsData.hints.strategy}</p>
                  ) : (
                    <div className="mt-3 flex items-center justify-between">
                      <p className="text-[11px] text-muted-foreground">What standard algorithms or models apply here? Let&apos;s check.</p>
                      <Button
                        size="sm"
                        className="bg-violet-600 hover:bg-violet-500 text-white text-[11px] h-7 px-3"
                        disabled={unlockedLevel < 1}
                        onClick={() => setUnlockedLevel(2)}
                      >
                        <Lock className="mr-1 h-3 w-3" /> Reveal Strategy
                      </Button>
                    </div>
                  )}
                </div>

                {/* HINT 3: CODE BLUEPRINT / TEMPLATE */}
                <div className="rounded-lg border p-4 transition-all">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-violet-500">LEVEL 3: PSEUDOCODE BLUEPRINT</span>
                    {unlockedLevel >= 3 ? (
                      <Badge variant="outline" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 text-[10px]">UNLOCKED</Badge>
                    ) : (
                      <Badge variant="outline" className="bg-muted text-muted-foreground text-[10px]">LOCKED</Badge>
                    )}
                  </div>

                  {unlockedLevel >= 3 ? (
                    <div className="mt-3">
                      <p className="text-[11px] text-muted-foreground mb-2">Use this structured structural design to implement the algorithm:</p>
                      <pre className="rounded bg-muted/60 p-3 font-mono text-[10.5px] leading-relaxed overflow-x-auto border text-foreground">
                        <code>{hintsData.hints.blueprint}</code>
                      </pre>
                    </div>
                  ) : (
                    <div className="mt-3 flex items-center justify-between">
                      <p className="text-[11px] text-muted-foreground">Need support structuring the actual loop conditions and collections?</p>
                      <Button
                        size="sm"
                        className="bg-violet-600 hover:bg-violet-500 text-white text-[11px] h-7 px-3"
                        disabled={unlockedLevel < 2}
                        onClick={() => setUnlockedLevel(3)}
                      >
                        <Lock className="mr-1 h-3 w-3" /> Reveal Blueprint
                      </Button>
                    </div>
                  )}
                </div>

                {/* COMMON PITFALLS (Unlocks when at least 1 hint is revealed) */}
                {unlockedLevel >= 1 && hintsData.pitfalls && hintsData.pitfalls.length > 0 && (
                  <div className="rounded-lg border bg-yellow-500/[0.02] border-yellow-500/10 p-4 transition-all">
                    <div className="flex items-center gap-1.5">
                      <Sparkles className="h-4 w-4 text-yellow-500" />
                      <span className="text-xs font-bold text-yellow-600">COMMON TRAPS & PITFALLS</span>
                    </div>
                    <ul className="mt-2.5 space-y-1.5 text-xs text-foreground">
                      {hintsData.pitfalls.map((pitfall: string, idx: number) => (
                        <li key={idx} className="flex items-start gap-1.5">
                          <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-yellow-500" />
                          <span>{pitfall}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Reset button */}
                {unlockedLevel > 0 && (
                  <div className="flex justify-end pt-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-[11px] h-7 text-muted-foreground hover:text-foreground"
                      onClick={() => setUnlockedLevel(0)}
                    >
                      Hide & Lock All Hints
                    </Button>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        )}
      </Card>

      <Separator />

      {/* Danger zone */}
      <Card className="border-destructive/20">
        <CardContent className="flex items-center justify-between p-4">
          <div>
            <p className="text-sm font-medium">Remove from your log</p>
            <p className="text-xs text-muted-foreground">
              This removes your solve record. The problem remains in the database.
            </p>
          </div>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => deleteMutation.mutate()}
            disabled={deleteMutation.isPending}
          >
            <Trash2 className="mr-1 h-3 w-3" /> Delete
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
