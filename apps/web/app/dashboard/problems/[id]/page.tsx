"use client";

import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
} from "lucide-react";

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
