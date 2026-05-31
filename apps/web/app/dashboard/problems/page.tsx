"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import Link from "next/link";
import { Plus, Search, ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";
import { motion } from "framer-motion";

interface ProblemDTO {
  id: string;
  title: string;
  difficulty: string | null;
  url: string | null;
  platform: { id: string; name: string; slug: string };
  userProblem: {
    solveDate: string;
    language: string;
    attempts: number;
    rating: number;
  } | null;
  tags: Array<{ id: string; name: string; color: string | null }>;
}

interface PaginatedProblems {
  items: ProblemDTO[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

function DifficultyBadge({ difficulty }: { difficulty: string | null }) {
  if (!difficulty) return <Badge variant="secondary">unknown</Badge>;
  const variant =
    difficulty === "EASY"
      ? "success"
      : difficulty === "MEDIUM"
        ? "warning"
        : "destructive";
  return <Badge variant={variant as "success" | "warning" | "destructive"}>{difficulty.toLowerCase()}</Badge>;
}

function RatingStars({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <span
          key={star}
          className={star <= rating ? "text-amber-400" : "text-muted-foreground/30"}
        >
          ★
        </span>
      ))}
    </div>
  );
}

export default function ProblemsPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // Simple debounce
  const handleSearch = (value: string) => {
    setSearch(value);
    setTimeout(() => {
      setDebouncedSearch(value);
      setPage(1);
    }, 300);
  };

  const { data, isLoading } = useQuery({
    queryKey: ["problems", page, debouncedSearch],
    queryFn: () => {
      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: "20",
      });
      if (debouncedSearch) params.set("search", debouncedSearch);
      return apiClient<PaginatedProblems>(`/problems?${params.toString()}`);
    },
    retry: false,
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Problems</h1>
          <p className="text-sm text-muted-foreground">
            Track your solved problems across platforms.
          </p>
        </div>
        <Button asChild>
          <Link href="/dashboard/problems/new">
            <Plus className="mr-2 h-4 w-4" /> Log Problem
          </Link>
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search problems..."
          className="pl-10"
          value={search}
          onChange={(e) => handleSearch(e.target.value)}
        />
      </div>

      {/* Problems list */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-20 w-full rounded-lg" />
          ))}
        </div>
      ) : data && data.items.length > 0 ? (
        <>
          <div className="space-y-3">
            {data.items.map((problem, i) => (
              <motion.div
                key={problem.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, delay: i * 0.03 }}
              >
                <Link href={`/dashboard/problems/${problem.id}`}>
                  <Card className="transition-all hover:shadow-md hover:border-primary/20">
                    <CardContent className="flex items-center gap-4 p-4">
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium">{problem.title}</h3>
                          <DifficultyBadge difficulty={problem.difficulty} />
                        </div>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          <span>{problem.platform.name}</span>
                          {problem.userProblem && (
                            <>
                              <span>·</span>
                              <span>{problem.userProblem.language}</span>
                              <span>·</span>
                              <span>
                                {new Date(problem.userProblem.solveDate).toLocaleDateString()}
                              </span>
                            </>
                          )}
                        </div>
                        {problem.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 pt-1">
                            {problem.tags.map((tag) => (
                              <Badge
                                key={tag.id}
                                variant="outline"
                                className="text-[10px] px-1.5 py-0"
                                style={
                                  tag.color
                                    ? {
                                        borderColor: tag.color,
                                        color: tag.color,
                                      }
                                    : undefined
                                }
                              >
                                {tag.name}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                      {problem.userProblem && (
                        <RatingStars rating={problem.userProblem.rating} />
                      )}
                    </CardContent>
                  </Card>
                </Link>
              </motion.div>
            ))}
          </div>

          {/* Pagination */}
          {data.totalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm text-muted-foreground">
                Page {data.page} of {data.totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= data.totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">
              {debouncedSearch
                ? `No problems found for "${debouncedSearch}".`
                : "No problems logged yet."}
            </p>
            {!debouncedSearch && (
              <Button className="mt-4" asChild>
                <Link href="/dashboard/problems/new">
                  <Plus className="mr-2 h-4 w-4" /> Log your first problem
                </Link>
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
