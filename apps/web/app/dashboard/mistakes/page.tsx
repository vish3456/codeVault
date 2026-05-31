"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, X, AlertTriangle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface MistakeDTO {
  id: string;
  description: string;
  category: string;
  problem: { id: string; title: string } | null;
  createdAt: string;
}

interface PaginatedMistakes {
  items: MistakeDTO[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

const CATEGORIES = [
  "LOGIC",
  "SYNTAX",
  "COMPLEXITY",
  "EDGE_CASE",
  "IMPLEMENTATION",
  "OTHER",
] as const;

const categoryColors: Record<string, string> = {
  LOGIC: "info",
  SYNTAX: "warning",
  COMPLEXITY: "destructive",
  EDGE_CASE: "success",
  IMPLEMENTATION: "secondary",
  OTHER: "outline",
};

export default function MistakesPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<string>("OTHER");
  const [filterCategory, setFilterCategory] = useState<string>("");

  const { data, isLoading } = useQuery({
    queryKey: ["mistakes", filterCategory],
    queryFn: () => {
      const params = new URLSearchParams({ pageSize: "50" });
      if (filterCategory) params.set("category", filterCategory);
      return apiClient<PaginatedMistakes>(`/mistakes?${params.toString()}`);
    },
    retry: false,
  });

  const createMutation = useMutation({
    mutationFn: () =>
      apiClient("/mistakes", {
        method: "POST",
        body: JSON.stringify({ description, category }),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["mistakes"] });
      void queryClient.invalidateQueries({ queryKey: ["stats"] });
      toast({ title: "Mistake logged!" });
      setDescription("");
      setCategory("OTHER");
      setShowCreate(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      apiClient(`/mistakes/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["mistakes"] });
      void queryClient.invalidateQueries({ queryKey: ["stats"] });
      toast({ title: "Mistake removed." });
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Mistakes</h1>
          <p className="text-sm text-muted-foreground">
            Track and learn from your mistakes.
          </p>
        </div>
        <Button onClick={() => setShowCreate(!showCreate)}>
          {showCreate ? <X className="mr-2 h-4 w-4" /> : <Plus className="mr-2 h-4 w-4" />}
          {showCreate ? "Cancel" : "Log Mistake"}
        </Button>
      </div>

      {/* Create form */}
      <AnimatePresence>
        {showCreate && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
          >
            <Card>
              <CardContent className="space-y-4 pt-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Category</label>
                  <select
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c.replace(/_/g, " ")}
                      </option>
                    ))}
                  </select>
                </div>
                <Textarea
                  placeholder="Describe the mistake..."
                  rows={4}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
                <Button
                  onClick={() => createMutation.mutate()}
                  disabled={!description || createMutation.isPending}
                >
                  Log Mistake
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Filter */}
      <div className="flex flex-wrap gap-2">
        <Button
          variant={filterCategory === "" ? "default" : "outline"}
          size="sm"
          onClick={() => setFilterCategory("")}
        >
          All
        </Button>
        {CATEGORIES.map((c) => (
          <Button
            key={c}
            variant={filterCategory === c ? "default" : "outline"}
            size="sm"
            onClick={() => setFilterCategory(c)}
          >
            {c.replace(/_/g, " ")}
          </Button>
        ))}
      </div>

      {/* Mistakes list */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-20 w-full rounded-lg" />
          ))}
        </div>
      ) : data && data.items.length > 0 ? (
        <div className="space-y-3">
          {data.items.map((mistake, i) => (
            <motion.div
              key={mistake.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
            >
              <Card className="transition-shadow hover:shadow-md">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 text-amber-500" />
                        <Badge
                          variant={
                            (categoryColors[mistake.category] ?? "outline") as
                              | "info"
                              | "warning"
                              | "destructive"
                              | "success"
                              | "secondary"
                              | "outline"
                          }
                        >
                          {mistake.category.replace(/_/g, " ")}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {new Date(mistake.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-sm">{mistake.description}</p>
                      {mistake.problem && (
                        <p className="text-xs text-muted-foreground">
                          📎 {mistake.problem.title}
                        </p>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      onClick={() => deleteMutation.mutate(mistake.id)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">No mistakes logged yet.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
