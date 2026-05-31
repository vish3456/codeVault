"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, X, Tags as TagsIcon } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface TagDTO {
  id: string;
  name: string;
  slug: string;
  color: string | null;
  createdAt: string;
}

const PRESET_COLORS = [
  "#ef4444", "#f97316", "#eab308", "#22c55e",
  "#06b6d4", "#3b82f6", "#8b5cf6", "#ec4899",
];

export default function TagsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState<string>("");

  const { data, isLoading } = useQuery({
    queryKey: ["tags"],
    queryFn: () =>
      apiClient<{ tags: TagDTO[] }>("/tags").then((r) => r.tags),
    retry: false,
  });

  const createMutation = useMutation({
    mutationFn: () =>
      apiClient("/tags", {
        method: "POST",
        body: JSON.stringify({
          name: newName,
          color: newColor || undefined,
        }),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["tags"] });
      toast({ title: "Tag created!" });
      setNewName("");
      setNewColor("");
      setShowCreate(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (tagId: string) =>
      apiClient(`/tags/${tagId}`, { method: "DELETE" }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["tags"] });
      toast({ title: "Tag deleted." });
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Tags</h1>
          <p className="text-sm text-muted-foreground">
            Organize problems by topic, pattern, or technique.
          </p>
        </div>
        <Button onClick={() => setShowCreate(!showCreate)}>
          {showCreate ? <X className="mr-2 h-4 w-4" /> : <Plus className="mr-2 h-4 w-4" />}
          {showCreate ? "Cancel" : "New Tag"}
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
                <Input
                  placeholder="Tag name (e.g. Dynamic Programming)"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                />
                <div className="space-y-2">
                  <label className="text-sm font-medium">Color</label>
                  <div className="flex flex-wrap gap-2">
                    {PRESET_COLORS.map((color) => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => setNewColor(color)}
                        className={`h-8 w-8 rounded-full border-2 transition-all ${
                          newColor === color
                            ? "border-primary scale-110"
                            : "border-transparent hover:scale-105"
                        }`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                    <button
                      type="button"
                      onClick={() => setNewColor("")}
                      className={`h-8 w-8 rounded-full border-2 flex items-center justify-center text-xs transition-all ${
                        newColor === ""
                          ? "border-primary"
                          : "border-border hover:border-muted-foreground"
                      }`}
                    >
                      ∅
                    </button>
                  </div>
                </div>
                {newName && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Preview:</span>
                    <Badge
                      variant="outline"
                      style={newColor ? { borderColor: newColor, color: newColor } : undefined}
                    >
                      {newName}
                    </Badge>
                  </div>
                )}
                <Button
                  onClick={() => createMutation.mutate()}
                  disabled={!newName || createMutation.isPending}
                >
                  Create Tag
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tags grid */}
      {isLoading ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-16 w-full rounded-lg" />
          ))}
        </div>
      ) : data && data.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {data.map((tag, i) => (
            <motion.div
              key={tag.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
            >
              <Card className="transition-shadow hover:shadow-md">
                <CardContent className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-3">
                    <div
                      className="h-3 w-3 rounded-full"
                      style={{
                        backgroundColor: tag.color ?? "hsl(var(--muted-foreground))",
                      }}
                    />
                    <div>
                      <p className="font-medium">{tag.name}</p>
                      <p className="text-xs text-muted-foreground">{tag.slug}</p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    onClick={() => deleteMutation.mutate(tag.id)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <TagsIcon className="mx-auto mb-3 h-12 w-12 text-muted-foreground/30" />
            <p className="text-muted-foreground">No tags created yet.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
