"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Plus, Search, FileText, Trash2, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface NoteDTO {
  id: string;
  title: string;
  content: string;
  problem: { id: string; title: string } | null;
  createdAt: string;
  updatedAt: string;
}

interface PaginatedNotes {
  items: NoteDTO[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export default function NotesPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newContent, setNewContent] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["notes", search],
    queryFn: () => {
      const params = new URLSearchParams({ pageSize: "50" });
      if (search) params.set("search", search);
      return apiClient<PaginatedNotes>(`/notes?${params.toString()}`);
    },
    retry: false,
  });

  const createMutation = useMutation({
    mutationFn: () =>
      apiClient("/notes", {
        method: "POST",
        body: JSON.stringify({ title: newTitle, content: newContent }),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["notes"] });
      void queryClient.invalidateQueries({ queryKey: ["stats"] });
      toast({ title: "Note created!" });
      setNewTitle("");
      setNewContent("");
      setShowCreate(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (noteId: string) =>
      apiClient(`/notes/${noteId}`, { method: "DELETE" }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["notes"] });
      void queryClient.invalidateQueries({ queryKey: ["stats"] });
      toast({ title: "Note deleted." });
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Notes</h1>
          <p className="text-sm text-muted-foreground">
            Capture insights, patterns, and learnings.
          </p>
        </div>
        <Button onClick={() => setShowCreate(!showCreate)}>
          {showCreate ? <X className="mr-2 h-4 w-4" /> : <Plus className="mr-2 h-4 w-4" />}
          {showCreate ? "Cancel" : "New Note"}
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
                  placeholder="Note title..."
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                />
                <Textarea
                  placeholder="Write your note..."
                  rows={5}
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                />
                <Button
                  onClick={() => createMutation.mutate()}
                  disabled={!newTitle || !newContent || createMutation.isPending}
                >
                  Save Note
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search notes..."
          className="pl-10"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Notes list */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 w-full rounded-lg" />
          ))}
        </div>
      ) : data && data.items.length > 0 ? (
        <div className="space-y-3">
          {data.items.map((note, i) => (
            <motion.div
              key={note.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
            >
              <Card className="transition-shadow hover:shadow-md">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <h3 className="font-medium">{note.title}</h3>
                      </div>
                      <p className="line-clamp-2 text-sm text-muted-foreground">
                        {note.content}
                      </p>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span>
                          {new Date(note.updatedAt).toLocaleDateString()}
                        </span>
                        {note.problem && (
                          <>
                            <span>·</span>
                            <span>📎 {note.problem.title}</span>
                          </>
                        )}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      onClick={() => deleteMutation.mutate(note.id)}
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
            <p className="text-muted-foreground">
              {search ? `No notes matching "${search}".` : "No notes yet."}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
