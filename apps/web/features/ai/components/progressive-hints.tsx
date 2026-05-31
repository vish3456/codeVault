// apps/web/features/ai/components/progressive-hints.tsx

"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Lightbulb, Loader2, Sparkles } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useProblemHints } from "../ai";

interface ProgressiveHintsProps {
  problemId: string;
}

/**
 * Step-by-step AI Coach hints — avoids revealing full solutions at once.
 */
export function ProgressiveHints({ problemId }: ProgressiveHintsProps) {
  const [expanded, setExpanded] = useState(false);
  const [unlockedLevel, setUnlockedLevel] = useState(0);

  const { data, isLoading, isFetching, refetch } = useProblemHints(
    problemId,
    expanded,
  );

  const hints = data?.hints;
  const source = data?.source ?? "mock";

  return (
    <Card className="overflow-hidden border-violet-500/20 bg-gradient-to-br from-violet-500/5 via-transparent to-indigo-500/5">
      <CardHeader
        className="cursor-pointer"
        onClick={() => setExpanded((prev) => !prev)}
      >
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Lightbulb className="h-4 w-4 text-violet-500" />
            AI Coach Progressive Hints
          </CardTitle>
          <div className="flex items-center gap-2">
            {expanded && (
              <Badge variant="outline" className="text-xs">
                {source === "gemini" ? "Gemini" : "Smart Coach"}
              </Badge>
            )}
            <ChevronDown
              className={`h-4 w-4 transition-transform ${expanded ? "rotate-180" : ""}`}
            />
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          Unlock observations step-by-step — no full solution spoilers.
        </p>
      </CardHeader>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
          >
            <CardContent className="space-y-3 pt-0">
              {isLoading || isFetching ? (
                <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Coach is analyzing your problem…
                </div>
              ) : hints ? (
                <>
                  {hints.levels.map((level) => {
                    const isUnlocked = level.level <= unlockedLevel;
                    const isNext = level.level === unlockedLevel + 1;

                    return (
                      <div
                        key={level.level}
                        className={`rounded-lg border p-4 transition-all ${
                          isUnlocked
                            ? "border-violet-500/30 bg-background/80"
                            : "border-dashed border-muted bg-muted/30"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-medium">
                            {level.level}. {level.title}
                          </p>
                          {isNext && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="shrink-0 border-violet-500/40"
                              onClick={() =>
                                setUnlockedLevel((prev) =>
                                  Math.max(prev, level.level),
                                )
                              }
                            >
                              <Sparkles className="mr-1 h-3 w-3" />
                              Reveal
                            </Button>
                          )}
                        </div>
                        <AnimatePresence>
                          {isUnlocked && (
                            <motion.p
                              initial={{ opacity: 0, y: 4 }}
                              animate={{ opacity: 1, y: 0 }}
                              className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground"
                            >
                              {level.content}
                            </motion.p>
                          )}
                        </AnimatePresence>
                        {!isUnlocked && !isNext && (
                          <p className="mt-1 text-xs text-muted-foreground/60">
                            Unlock previous hints first
                          </p>
                        )}
                      </div>
                    );
                  })}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full text-xs"
                    onClick={() => void refetch()}
                  >
                    Regenerate hints
                  </Button>
                </>
              ) : (
                <p className="py-4 text-center text-sm text-muted-foreground">
                  Could not load hints. Try again.
                </p>
              )}
            </CardContent>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
}
