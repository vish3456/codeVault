"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";

interface Platform {
  id: string;
  name: string;
  slug: string;
}

interface Tag {
  id: string;
  name: string;
  slug: string;
  color: string | null;
}

const LANGUAGES = [
  "CPP", "C", "PYTHON", "JAVA", "JAVASCRIPT",
  "TYPESCRIPT", "GO", "RUST", "KOTLIN", "OTHER",
] as const;

const DIFFICULTIES = ["EASY", "MEDIUM", "HARD"] as const;

export default function NewProblemPage() {
  const router = useRouter();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [form, setForm] = useState({
    platformId: "",
    externalId: "",
    title: "",
    difficulty: "" as string,
    url: "",
    language: "CPP" as string,
    solveDate: new Date().toISOString().split("T")[0]!,
    attempts: 1,
    rating: 3,
    tagIds: [] as string[],
  });

  const { data: platformsData } = useQuery({
    queryKey: ["platforms"],
    queryFn: () =>
      apiClient<{ platforms: Platform[] }>("/platforms").then(
        (r) => r.platforms,
      ),
    retry: false,
  });

  const { data: tagsData } = useQuery({
    queryKey: ["tags"],
    queryFn: () =>
      apiClient<{ tags: Tag[] }>("/tags").then((r) => r.tags),
    retry: false,
  });

  const createMutation = useMutation({
    mutationFn: () =>
      apiClient("/problems", {
        method: "POST",
        body: JSON.stringify({
          ...form,
          difficulty: form.difficulty || undefined,
          url: form.url || undefined,
          solveDate: new Date(form.solveDate).toISOString(),
          tagIds: form.tagIds.length > 0 ? form.tagIds : undefined,
        }),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["problems"] });
      void queryClient.invalidateQueries({ queryKey: ["stats"] });
      toast({ title: "Problem logged!", description: "Your solve has been recorded." });
      router.push("/dashboard/problems");
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to log problem.",
      });
    },
  });

  const toggleTag = (tagId: string) => {
    setForm((prev) => ({
      ...prev,
      tagIds: prev.tagIds.includes(tagId)
        ? prev.tagIds.filter((id) => id !== tagId)
        : [...prev.tagIds, tagId],
    }));
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/dashboard/problems">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Log Problem</h1>
          <p className="text-sm text-muted-foreground">
            Record a solved problem from any platform.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Problem Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Platform */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Platform *</label>
            <select
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              value={form.platformId}
              onChange={(e) => setForm((f) => ({ ...f, platformId: e.target.value }))}
            >
              <option value="">Select platform...</option>
              {platformsData?.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          {/* External ID */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Problem ID / Number *</label>
            <Input
              placeholder="e.g. 1 or two-sum"
              value={form.externalId}
              onChange={(e) => setForm((f) => ({ ...f, externalId: e.target.value }))}
            />
          </div>

          {/* Title */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Title *</label>
            <Input
              placeholder="e.g. Two Sum"
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            />
          </div>

          {/* URL */}
          <div className="space-y-2">
            <label className="text-sm font-medium">URL</label>
            <Input
              placeholder="https://leetcode.com/problems/two-sum"
              value={form.url}
              onChange={(e) => setForm((f) => ({ ...f, url: e.target.value }))}
            />
          </div>

          {/* Difficulty + Language */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Difficulty</label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                value={form.difficulty}
                onChange={(e) => setForm((f) => ({ ...f, difficulty: e.target.value }))}
              >
                <option value="">Select...</option>
                {DIFFICULTIES.map((d) => (
                  <option key={d} value={d}>
                    {d.charAt(0) + d.slice(1).toLowerCase()}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Language *</label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                value={form.language}
                onChange={(e) => setForm((f) => ({ ...f, language: e.target.value }))}
              >
                {LANGUAGES.map((l) => (
                  <option key={l} value={l}>
                    {l}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Date + Attempts */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Solve Date</label>
              <Input
                type="date"
                value={form.solveDate}
                onChange={(e) => setForm((f) => ({ ...f, solveDate: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Attempts</label>
              <Input
                type="number"
                min={1}
                value={form.attempts}
                onChange={(e) =>
                  setForm((f) => ({ ...f, attempts: parseInt(e.target.value) || 1 }))
                }
              />
            </div>
          </div>

          {/* Rating */}
          <div className="space-y-2">
            <label className="text-sm font-medium">
              Self Rating (1 = struggled, 5 = mastered)
            </label>
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, rating: star }))}
                  className={`text-2xl transition-colors ${
                    star <= form.rating
                      ? "text-amber-400 hover:text-amber-300"
                      : "text-muted-foreground/30 hover:text-muted-foreground/50"
                  }`}
                >
                  ★
                </button>
              ))}
            </div>
          </div>

          {/* Tags */}
          {tagsData && tagsData.length > 0 && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Tags</label>
              <div className="flex flex-wrap gap-2">
                {tagsData.map((tag) => (
                  <button
                    key={tag.id}
                    type="button"
                    onClick={() => toggleTag(tag.id)}
                    className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                      form.tagIds.includes(tag.id)
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border text-muted-foreground hover:border-primary/50"
                    }`}
                    style={
                      tag.color && form.tagIds.includes(tag.id)
                        ? { borderColor: tag.color, color: tag.color }
                        : undefined
                    }
                  >
                    {tag.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          <Button
            className="w-full"
            onClick={() => createMutation.mutate()}
            disabled={
              createMutation.isPending ||
              !form.platformId ||
              !form.externalId ||
              !form.title
            }
          >
            {createMutation.isPending && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            Log Problem
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
