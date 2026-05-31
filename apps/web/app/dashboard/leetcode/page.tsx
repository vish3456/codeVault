"use client";

import Link from "next/link";
import { Code2, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLeetCodeStatus } from "@/features/import";
import { LeetCodeSummaryView } from "@/features/import/components/leetcode-summary";

export default function LeetCodeDashboardPage() {
  const { data: status } = useLeetCodeStatus();

  if (!status?.connected) {
    return (
      <div className="mx-auto max-w-lg space-y-4 py-16 text-center">
        <Code2 className="mx-auto h-12 w-12 text-orange-500" />
        <h1 className="text-xl font-bold">LeetCode not connected</h1>
        <p className="text-sm text-muted-foreground">
          Link your LeetCode username to import and cluster your solved problems.
        </p>
        <Button asChild className="bg-gradient-to-r from-orange-500 to-amber-600">
          <Link href="/onboarding/leetcode">Connect LeetCode</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">LeetCode Import</h1>
          <p className="text-sm text-muted-foreground">
            Clustered summary of @{status.username} · {status.importedCount}{" "}
            problems
          </p>
        </div>
        <Button variant="outline" size="sm" asChild>
          <Link href="/onboarding/leetcode">
            <Settings className="mr-1 h-3 w-3" />
            Reconnect / Re-sync
          </Link>
        </Button>
      </div>
      <LeetCodeSummaryView />
    </div>
  );
}
