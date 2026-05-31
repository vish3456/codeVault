// apps/web/app/dashboard/ai/page.tsx

"use client";

import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  Sparkles,
  TrendingUp,
  BrainCircuit,
  MessageSquare,
  RefreshCw,
  Send,
  CheckCircle,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { AIInsightsResponse, ChatMessage } from "@/features/ai";

export default function AICoachPage() {
  const [activeTab, setActiveTab] = useState<"diagnostics" | "chat">("diagnostics");
  const [chatMessage, setChatMessage] = useState("");
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const chatBottomRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch insights
  const { data: insightsData, isLoading: isInsightsLoading, isRefetching: isInsightsRefetching } = useQuery({
    queryKey: ["ai", "insights"],
    queryFn: () =>
      apiClient<{ insights: AIInsightsResponse }>("/ai/insights").then((r) => r.insights),
    retry: false,
  });

  // Force refresh insights mutation
  const refreshMutation = useMutation({
    mutationFn: () =>
      apiClient<{ insights: AIInsightsResponse }>("/ai/insights/refresh", {
        method: "POST",
      }),
    onSuccess: (data) => {
      queryClient.setQueryData(["ai", "insights"], data.insights);
      toast({
        title: "Insights Refreshed!",
        description: "AI Coach has analyzed your latest practice logs.",
      });
    },
    onError: (err: unknown) => {
      const message = err instanceof Error ? err.message : "Failed to update diagnostic stats.";
      toast({
        variant: "destructive",
        title: "Refresh Failed",
        description: message,
      });
    },
  });

  // Chat message mutation
  const chatMutation = useMutation({
    mutationFn: (body: { message: string; history: ChatMessage[] }) =>
      apiClient<{ reply: string }>("/ai/coach/chat", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    onSuccess: (data, variables) => {
      setChatHistory((prev) => [
        ...prev,
        { role: "user", content: variables.message },
        { role: "model", content: data.reply },
      ]);
      setChatMessage("");
    },
    onError: (err: unknown) => {
      const message = err instanceof Error ? err.message : "Could not reach AI Coach.";
      toast({
        variant: "destructive",
        title: "Message Error",
        description: message,
      });
    },
  });

  // Scroll to chat bottom on new messages
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatHistory, chatMutation.isPending]);

  const handleSendMessage = (textToSend?: string) => {
    const finalMessage = textToSend || chatMessage;
    if (!finalMessage.trim() || chatMutation.isPending) return;

    // Trigger api mutation
    chatMutation.mutate({
      message: finalMessage,
      history: chatHistory,
    });
  };

  const suggestionChips = [
    "💡 Give me a debugging checklist for Wrong Answer (WA).",
    "📈 Provide an optimized C++ Segment Tree code template.",
    "❓ Explain typical pitfalls in dynamic programming transitions.",
    "🏆 Give me a mock interview question on DFS/BFS traversal.",
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">AI Coach</h1>
          <p className="text-sm text-muted-foreground">
            Sleek dynamic weakness mapping, performance readiness scores, and customized debugging support.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-1.5 rounded-lg border bg-muted/50 p-1 text-sm font-medium">
          <button
            onClick={() => setActiveTab("diagnostics")}
            className={`flex items-center gap-2 rounded-md px-3 py-1.5 transition-all ${
              activeTab === "diagnostics"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <TrendingUp className="h-4 w-4" />
            Diagnostics
          </button>
          <button
            onClick={() => setActiveTab("chat")}
            className={`flex items-center gap-2 rounded-md px-3 py-1.5 transition-all ${
              activeTab === "chat"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <MessageSquare className="h-4 w-4" />
            Chat
          </button>
        </div>
      </div>

      {/* Main Panel Content */}
      <AnimatePresence mode="wait">
        {activeTab === "diagnostics" ? (
          <motion.div
            key="diagnostics"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.25 }}
            className="space-y-6"
          >
            {isInsightsLoading ? (
              <div className="grid gap-6 md:grid-cols-3">
                <Skeleton className="h-80 w-full md:col-span-1" />
                <Skeleton className="h-80 w-full md:col-span-2" />
              </div>
            ) : !insightsData ? (
              <Card>
                <CardContent className="py-16 text-center">
                  <p className="text-muted-foreground">No insights profile compiled yet.</p>
                  <Button
                    onClick={() => refreshMutation.mutate()}
                    className="mt-4"
                    disabled={refreshMutation.isPending}
                  >
                    Generate Insights Profile
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-6 md:grid-cols-3">
                {/* Left Side: Score & Topic Clusters */}
                <div className="space-y-6 md:col-span-1">
                  {/* Readiness Score Card */}
                  <Card className="relative overflow-hidden border-violet-500/20">
                    <div className="absolute inset-0 bg-gradient-to-br from-violet-500/5 to-indigo-500/5" />
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                        DSA Readiness Score
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="relative flex flex-col items-center justify-center py-6 text-center">
                      {/* SVG Gauge */}
                      <div className="relative flex h-36 w-36 items-center justify-center">
                        <svg className="absolute inset-0 h-full w-full -rotate-90">
                          <circle
                            cx="72"
                            cy="72"
                            r="60"
                            className="stroke-muted/20"
                            strokeWidth="10"
                            fill="transparent"
                          />
                          <circle
                            cx="72"
                            cy="72"
                            r="60"
                            className="stroke-violet-500 transition-all duration-1000 ease-out"
                            strokeWidth="10"
                            fill="transparent"
                            strokeDasharray={2 * Math.PI * 60}
                            strokeDashoffset={
                              2 * Math.PI * 60 * (1 - insightsData.readinessScore / 100)
                            }
                            strokeLinecap="round"
                          />
                        </svg>
                        <div className="text-center">
                          <span className="text-4xl font-extrabold tracking-tight text-foreground">
                            {insightsData.readinessScore}%
                          </span>
                          <p className="text-xs font-semibold text-muted-foreground">Rating</p>
                        </div>
                      </div>

                      {/* AI Verdict */}
                      <div className="mt-6 rounded-lg bg-card/60 p-3 border text-xs text-muted-foreground">
                        <Sparkles className="inline-block mr-1 h-3.5 w-3.5 text-violet-500" />
                        <strong>Verdict:</strong> {insightsData.verdict}
                      </div>

                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-5 w-full hover:bg-violet-500/10"
                        onClick={() => refreshMutation.mutate()}
                        disabled={refreshMutation.isPending || isInsightsRefetching}
                      >
                        <RefreshCw
                          className={`mr-1 h-3 w-3 ${
                            refreshMutation.isPending || isInsightsRefetching ? "animate-spin" : ""
                          }`}
                        />
                        Force Diagnostic Recalc
                      </Button>
                    </CardContent>
                  </Card>

                  {/* Topic Clusters Card */}
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                        Topic Proficiencies
                      </CardTitle>
                      <CardDescription>Estimated DSA category strengths</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {insightsData.topicClusters.map((cluster) => {
                        const statusColors = {
                          MASTERED: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
                          IMPROVING: "bg-amber-500/10 text-amber-500 border-amber-500/20",
                          NEEDS_PRACTICE: "bg-violet-500/10 text-violet-500 border-violet-500/20",
                        };

                        return (
                          <div key={cluster.topic} className="space-y-1">
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-semibold">{cluster.topic}</span>
                              <Badge
                                variant="outline"
                                className={`text-[10px] scale-95 font-medium ${
                                  statusColors[cluster.status]
                                }`}
                              >
                                {cluster.status.replace("_", " ")}
                              </Badge>
                            </div>

                            <div className="flex items-center gap-2">
                              <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                                <div
                                  className="h-full rounded-full bg-gradient-to-r from-violet-500 to-indigo-500 transition-all duration-700"
                                  style={{ width: `${cluster.proficiency}%` }}
                                />
                              </div>
                              <span className="text-[11px] font-mono text-muted-foreground">
                                {cluster.proficiency}%
                              </span>
                            </div>
                            <p className="text-[10px] text-muted-foreground">
                              {cluster.solvedCount} solved logs in history
                            </p>
                          </div>
                        );
                      })}
                    </CardContent>
                  </Card>
                </div>

                {/* Right Side: Weakness Map & Recommendations */}
                <div className="space-y-6 md:col-span-2">
                  <Card className="h-full">
                    <CardHeader className="border-b pb-4">
                      <div className="flex items-center gap-2">
                        <div className="flex h-7 w-7 items-center justify-center rounded bg-violet-500/10 text-violet-500">
                          <BrainCircuit className="h-4 w-4" />
                        </div>
                        <div>
                          <CardTitle className="text-base font-bold">Weakness Mapping Profile</CardTitle>
                          <CardDescription>
                            AI identified logic hurdles and dynamic recommended remedies
                          </CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="divide-y p-0">
                      {insightsData.weaknesses.map((weakness, i) => {
                        const severityColors = {
                          HIGH: "bg-red-500/10 text-red-500 border-red-500/20",
                          MEDIUM: "bg-amber-500/10 text-amber-500 border-amber-500/20",
                          LOW: "bg-blue-500/10 text-blue-500 border-blue-500/20",
                        };

                        return (
                          <div
                            key={weakness.id || i}
                            className="p-5 transition-colors hover:bg-muted/10"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="space-y-1">
                                <div className="flex flex-wrap items-center gap-2">
                                  <h3 className="font-bold text-foreground">{weakness.name}</h3>
                                  <Badge
                                    variant="outline"
                                    className={`text-[10px] font-semibold tracking-wider ${
                                      severityColors[weakness.severity]
                                    }`}
                                  >
                                    {weakness.severity} SEVERITY
                                  </Badge>
                                </div>
                                <p className="text-xs font-medium text-violet-500">
                                  Category: {weakness.category}
                                </p>
                              </div>
                            </div>

                            <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
                              {weakness.description}
                            </p>

                            {/* Recommendations bullet list */}
                            <div className="mt-4 rounded-lg bg-muted/40 p-3 border">
                              <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                                Remedial Recommendations
                              </span>
                              <ul className="mt-2 space-y-2 text-xs text-foreground">
                                {weakness.recommendations.map((rec, rIdx) => (
                                  <li key={rIdx} className="flex items-start gap-2">
                                    <CheckCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-violet-500" />
                                    <span>{rec}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          </div>
                        );
                      })}
                    </CardContent>
                  </Card>
                </div>
              </div>
            )}
          </motion.div>
        ) : (
          /* Chat Tab Interface */
          <motion.div
            key="chat"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.25 }}
          >
            <Card className="flex h-[calc(100vh-210px)] min-h-[500px] flex-col overflow-hidden border-violet-500/20">
              <div className="absolute inset-0 bg-gradient-to-b from-violet-500/[0.02] to-transparent pointer-events-none" />
              
              {/* Chat Header */}
              <div className="flex items-center gap-2 border-b bg-card px-4 py-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-violet-600 to-indigo-600">
                  <Sparkles className="h-4 w-4 text-white" />
                </div>
                <div>
                  <h3 className="text-sm font-bold leading-none">Interactive DSA Companion</h3>
                  <span className="text-[10px] font-medium text-emerald-500">Live & Context-Aware</span>
                </div>
              </div>

              {/* Chat Messages Scrolling Window */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {chatHistory.length === 0 && (
                  <div className="flex h-full flex-col items-center justify-center text-center max-w-md mx-auto py-12">
                    <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-violet-500/10">
                      <BrainCircuit className="h-6 w-6 text-violet-500 animate-pulse" />
                    </div>
                    <h3 className="font-bold text-foreground">Talk to your CP Coach</h3>
                    <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                      Ask competitive programming questions, paste C++ templates for reviews, or query concepts (like segment trees or binary search states).
                    </p>

                    {/* Quick prompts chips */}
                    <div className="mt-6 flex flex-wrap gap-2 justify-center">
                      {suggestionChips.map((chip, idx) => (
                        <button
                          key={idx}
                          onClick={() => handleSendMessage(chip)}
                          className="rounded-full border bg-card px-3 py-1.5 text-[11px] text-muted-foreground shadow-sm transition-all hover:bg-violet-500/5 hover:border-violet-500/30 hover:text-foreground text-left"
                        >
                          {chip}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* History map */}
                {chatHistory.map((msg, i) => {
                  const isUser = msg.role === "user";
                  return (
                    <div
                      key={i}
                      className={`flex gap-3 max-w-[85%] ${
                        isUser ? "ml-auto flex-row-reverse" : "mr-auto"
                      }`}
                    >
                      {/* Avatar */}
                      <div
                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold border ${
                          isUser
                            ? "bg-card text-foreground"
                            : "bg-gradient-to-br from-violet-600 to-indigo-600 text-white border-transparent"
                        }`}
                      >
                        {isUser ? "ME" : <Sparkles className="h-3.5 w-3.5" />}
                      </div>

                      {/* Bubble */}
                      <div
                        className={`rounded-2xl px-4 py-2.5 text-xs leading-relaxed shadow-sm whitespace-pre-wrap ${
                          isUser
                            ? "bg-violet-500 text-white rounded-tr-none"
                            : "bg-card border rounded-tl-none text-foreground"
                        }`}
                      >
                        {msg.content}
                      </div>
                    </div>
                  );
                })}

                {/* Is Pending State */}
                {chatMutation.isPending && (
                  <div className="flex gap-3 max-w-[80%] mr-auto">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-violet-600 to-indigo-600 text-white">
                      <Sparkles className="h-3.5 w-3.5 animate-spin" />
                    </div>
                    <div className="rounded-2xl rounded-tl-none bg-card border px-4 py-2.5 shadow-sm">
                      <div className="flex items-center gap-1">
                        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground/60" />
                        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground/60 [animation-delay:0.2s]" />
                        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground/60 [animation-delay:0.4s]" />
                      </div>
                    </div>
                  </div>
                )}
                
                <div ref={chatBottomRef} />
              </div>

              {/* Chat Input Bar */}
              <div className="border-t bg-card p-3">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSendMessage();
                  }}
                  className="flex gap-2 items-center"
                >
                  <Textarea
                    value={chatMessage}
                    onChange={(e) => setChatMessage(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                    placeholder="Ask AI Coach a question..."
                    className="min-h-[40px] max-h-[120px] resize-none text-xs rounded-xl"
                  />
                  <Button
                    type="submit"
                    size="icon"
                    className="rounded-full bg-violet-600 hover:bg-violet-500 text-white h-9 w-9"
                    disabled={!chatMessage.trim() || chatMutation.isPending}
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </form>
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
