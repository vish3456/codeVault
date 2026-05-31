"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  Code2,
  Loader2,
  Link2,
  Sparkles,
  Check,
  ExternalLink,
  AlertTriangle,
  RefreshCw,
} from "lucide-react";
import { AuthGuard } from "@/features/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  useConnectLeetCode,
  useLeetCodeStatus,
  useSyncLeetCode,
  useManualImportLeetCode,
} from "@/features/import";
import { LeetCodeSummaryView } from "@/features/import/components/leetcode-summary";

type Step = "connect" | "sync" | "summary";

interface LeetCodeManualProblem {
  title: string;
  titleSlug: string;
  status: string;
  difficulty?: string;
  id?: number;
}

interface LeetCodeApiProblem {
  stat: {
    question__title: string;
    question__title_slug: string;
    question_id: number;
  };
  status: string | null;
  difficulty: {
    level: number;
  };
}

export default function LeetCodeOnboardingPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [username, setUsername] = useState("");
  const [step, setStep] = useState<Step>("connect");

  const [syncMethod, setSyncMethod] = useState<"auto" | "bookmarklet">("auto");
  const [pastedJson, setPastedJson] = useState("");
  const [parsedProblems, setParsedProblems] = useState<LeetCodeManualProblem[] | null>(null);
  const [jsonError, setJsonError] = useState<string | null>(null);

  const { data: status, isLoading: statusLoading } = useLeetCodeStatus();
  const connectMutation = useConnectLeetCode();
  const syncMutation = useSyncLeetCode();
  const manualSyncMutation = useManualImportLeetCode();

  const effectiveStep: Step =
    status?.connected && status.importedCount > 0
      ? step === "sync"
        ? "sync"
        : "summary"
      : status?.connected
        ? step === "connect"
          ? "sync"
          : step
        : "connect";



  function handleJsonChange(val: string) {
    setPastedJson(val);
    if (!val.trim()) {
      setParsedProblems(null);
      setJsonError(null);
      return;
    }
    try {
      let parsed = JSON.parse(val);
      
      // Auto-detect and parse the raw LeetCode api/problems/all response
      if (parsed && parsed.stat_status_pairs && Array.isArray(parsed.stat_status_pairs)) {
        parsed = parsed.stat_status_pairs
          .filter((p: LeetCodeApiProblem) => p.status === 'ac' || p.status === 'notac')
          .map((p: LeetCodeApiProblem) => ({
            title: p.stat.question__title,
            titleSlug: p.stat.question__title_slug,
            status: p.status,
            difficulty: p.difficulty.level === 1 ? 'Easy' : p.difficulty.level === 2 ? 'Medium' : 'Hard',
            id: p.stat.question_id
          }));
      }

      if (!Array.isArray(parsed)) {
        setJsonError("Data must be a list of problems.");
        setParsedProblems(null);
        return;
      }
      if (parsed.length > 0 && (!parsed[0].titleSlug || !parsed[0].title || !parsed[0].status)) {
        setJsonError("Invalid data format. Ensure you copied the entire page content.");
        setParsedProblems(null);
        return;
      }
      setJsonError(null);
      setParsedProblems(parsed);
    } catch {
      setJsonError("Invalid JSON string. Make sure you copied the entire page content.");
      setParsedProblems(null);
    }
  }

  async function handleConnect() {
    const trimmed = username.trim();
    if (!trimmed) return;

    try {
      await connectMutation.mutateAsync(trimmed);
      toast({ title: "LeetCode linked", description: `@${trimmed} connected.` });
      setStep("sync");
    } catch {
      toast({
        variant: "destructive",
        title: "Could not connect",
        description: "Check the username and try again.",
      });
    }
  }

  async function handleSync() {
    try {
      const result = await syncMutation.mutateAsync();
      toast({
        title: "Import complete",
        description: `${result.imported} new, ${result.updated} updated.`,
      });
      setStep("summary");
    } catch {
      toast({
        variant: "destructive",
        title: "Sync failed",
        description: "LeetCode may be rate-limiting. Try again shortly.",
      });
    }
  }

  async function handleManualSync() {
    if (!parsedProblems || parsedProblems.length === 0) return;
    try {
      const result = await manualSyncMutation.mutateAsync(parsedProblems);
      toast({
        title: "Import complete!",
        description: `Successfully imported ${result.imported} new and updated ${result.updated} problems.`,
      });
      setStep("summary");
    } catch {
      toast({
        variant: "destructive",
        title: "Import failed",
        description: "An error occurred during bulk import.",
      });
    }
  }

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gradient-to-b from-orange-500/5 via-background to-background px-4 py-10">
        <div className="mx-auto max-w-3xl space-y-8">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center"
          >
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-500 to-amber-600 shadow-lg animate-pulse">
              <Code2 className="h-7 w-7 text-white" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight">
              Connect your LeetCode account
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Import your solved problems, cluster them by topic, see attempts
              to accepted solutions, and mark doubtful ones.
            </p>
          </motion.div>

          {statusLoading ? (
            <Card className="backdrop-blur-sm border-orange-500/5">
              <CardContent className="flex justify-center py-16">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </CardContent>
            </Card>
          ) : effectiveStep === "connect" ? (
            <Card className="backdrop-blur-sm border-orange-500/10 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Link2 className="h-4 w-4 text-orange-500" />
                  LeetCode username
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  This links your public LeetCode profile — not a separate login.
                  CodeVault stays signed in with Google/GitHub.
                </p>
                <div className="flex gap-2">
                  <Input
                    placeholder="e.g. neetcode"
                    value={username}
                    onChange={(event) => setUsername(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") void handleConnect();
                    }}
                    className="focus-visible:ring-orange-500"
                  />
                  <Button
                    disabled={connectMutation.isPending || !username.trim()}
                    onClick={() => void handleConnect()}
                    className="bg-gradient-to-r from-orange-500 to-amber-600 hover:shadow-md hover:shadow-orange-500/10 transition-all duration-200"
                  >
                    {connectMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      "Connect"
                    )}
                  </Button>
                </div>
                <Button
                  variant="ghost"
                  className="w-full text-muted-foreground"
                  onClick={() => router.push("/dashboard")}
                >
                  Skip for now
                </Button>
              </CardContent>
            </Card>
          ) : effectiveStep === "sync" ? (
            <Card className="backdrop-blur-sm border-orange-500/10 shadow-xl overflow-hidden">
              <CardHeader className="pb-4">
                <CardTitle className="text-base flex items-center justify-between">
                  <span>Sync @{status?.username}</span>
                  <span className="text-xs font-normal text-muted-foreground bg-orange-500/5 text-orange-600 px-2 py-0.5 rounded-full border border-orange-500/10">
                    Linked Successfully
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Custom Tab Switcher */}
                <div className="flex rounded-xl bg-muted/60 p-1 mb-2 border border-border/50">
                  <button
                    onClick={() => setSyncMethod("auto")}
                    className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all duration-200 flex items-center justify-center gap-2 ${
                      syncMethod === "auto"
                        ? "bg-gradient-to-r from-orange-500 to-amber-600 text-white shadow-md shadow-orange-500/10"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <RefreshCw className={`h-4 w-4 ${syncMutation.isPending ? "animate-spin" : ""}`} />
                    Auto Sync (Recent 20)
                  </button>
                  <button
                    onClick={() => setSyncMethod("bookmarklet")}
                    className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all duration-200 flex items-center justify-center gap-2 ${
                      syncMethod === "bookmarklet"
                        ? "bg-gradient-to-r from-orange-500 to-amber-600 text-white shadow-md shadow-orange-500/10"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <Sparkles className="h-4 w-4" />
                    Complete Sync (All Solved/Attempted)
                  </button>
                </div>

                {syncMethod === "auto" ? (
                  <div className="space-y-6 py-6 text-center">
                    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-orange-500/10 border border-orange-500/20 text-orange-500">
                      <RefreshCw className={`h-8 w-8 ${syncMutation.isPending ? "animate-spin" : ""}`} />
                    </div>
                    <div className="space-y-2 animate-fade-in">
                      <h3 className="font-semibold text-lg">Instant Username Sync</h3>
                      <p className="text-sm text-muted-foreground max-w-md mx-auto leading-relaxed">
                        Pulls your 20 most recent solved problems directly from LeetCode’s public API. Instant and requires no extra actions.
                      </p>
                    </div>
                    <Button
                      size="lg"
                      disabled={syncMutation.isPending}
                      onClick={() => void handleSync()}
                      className="bg-gradient-to-r from-orange-500 to-amber-600 hover:shadow-lg hover:shadow-orange-500/20 px-8"
                    >
                      {syncMutation.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Syncing from LeetCode…
                        </>
                      ) : (
                        "Sync Recent Solved"
                      )}
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-6 text-left animate-fade-in py-2">
                    <div className="rounded-xl border border-amber-500/10 bg-amber-500/5 p-4 flex gap-3 text-sm text-amber-700 dark:text-amber-300">
                      <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
                      <div>
                        <p className="font-semibold text-xs uppercase tracking-wider">Why this is needed</p>
                        <p className="mt-1 text-xs opacity-90 leading-relaxed">
                          LeetCode’s public API strictly caps public profile submission fetches to the last 20 questions. Using our secure raw copy-paste method extracts your entire history of attempted and solved questions instantly without sharing passwords.
                        </p>
                      </div>
                    </div>

                    <div className="space-y-6">
                      <div className="space-y-2">
                        <h4 className="text-sm font-semibold flex items-center gap-2">
                          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-orange-500/15 text-orange-600 text-xs font-bold">1</span>
                          Open LeetCode’s raw problems list
                        </h4>
                        <p className="text-xs text-muted-foreground pl-7 leading-relaxed">
                          Open a new tab and go directly to: 
                          <a 
                            href="https://leetcode.com/api/problems/all/" 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="text-orange-500 inline-flex items-center gap-1 hover:underline font-semibold ml-1.5"
                          >
                            leetcode.com/api/problems/all <ExternalLink className="h-3 w-3" />
                          </a>
                        </p>
                        <p className="text-[11px] text-muted-foreground pl-7 italic">
                          (Ensure you are logged into LeetCode first. The tab will load a huge text file of problems.)
                        </p>
                      </div>

                      <div className="space-y-2">
                        <h4 className="text-sm font-semibold flex items-center gap-2">
                          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-orange-500/15 text-orange-600 text-xs font-bold">2</span>
                          Copy everything
                        </h4>
                        <p className="text-xs text-muted-foreground pl-7 leading-relaxed">
                          On that LeetCode tab, press **`Ctrl + A`** (select all) and then **`Ctrl + C`** (copy) to copy the raw text to your clipboard.
                        </p>
                      </div>

                      <div className="space-y-2">
                        <h4 className="text-sm font-semibold flex items-center gap-2">
                          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-orange-500/15 text-orange-600 text-xs font-bold">3</span>
                          Paste & Import Here
                        </h4>
                        <p className="text-xs text-muted-foreground pl-7">
                          Paste the copied text inside the box below. CodeVault will automatically extract all attempted and solved questions!
                        </p>
                        <div className="pl-7 space-y-4 pt-1">
                          <textarea
                            placeholder='Paste JSON here... e.g. {"user_name": "...", "stat_status_pairs": [...] }'
                            value={pastedJson}
                            onChange={(e) => handleJsonChange(e.target.value)}
                            className="w-full min-h-[120px] rounded-lg border border-border bg-muted/30 p-3 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-orange-500/30 transition-all placeholder:text-muted-foreground/60 leading-relaxed focus:bg-background"
                          />
                          {jsonError && (
                            <div className="text-xs text-red-500 flex items-center gap-1.5 bg-red-500/5 p-2 rounded border border-red-500/10">
                              <AlertTriangle className="h-3.5 w-3.5" />
                              {jsonError}
                            </div>
                          )}
                          {parsedProblems && (
                            <div className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1.5 bg-green-500/5 p-2 rounded border border-green-500/10">
                              <Check className="h-3.5 w-3.5" />
                              Validated! {parsedProblems.length} attempted questions detected and ready for import.
                            </div>
                          )}
                          <Button
                            size="lg"
                            disabled={!parsedProblems || manualSyncMutation.isPending}
                            onClick={() => void handleManualSync()}
                            className="w-full bg-gradient-to-r from-orange-500 to-amber-600 hover:shadow-lg hover:shadow-orange-500/20"
                          >
                            {manualSyncMutation.isPending ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Importing {parsedProblems?.length} problems…
                              </>
                            ) : (
                              `Import all ${parsedProblems ? parsedProblems.length : ""} attempted problems`
                            )}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              <div className="flex justify-end">
                <Button
                  variant="outline"
                  onClick={() => setStep("sync")}
                  className="bg-orange-500/10 border-orange-500/20 text-orange-600 hover:bg-orange-500/15 gap-2"
                >
                  <Sparkles className="h-4 w-4" />
                  Bulk Import Options (All Solved/Attempted)
                </Button>
              </div>
              <LeetCodeSummaryView
                onContinue={() => router.push("/dashboard")}
              />
            </div>
          )}
        </div>
      </div>
    </AuthGuard>
  );
}
