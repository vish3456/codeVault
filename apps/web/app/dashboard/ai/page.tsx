"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Sparkles } from "lucide-react";

export default function AICoachPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">AI Coach</h1>
        <p className="text-sm text-muted-foreground">
          Pattern hints, pitfall checks, and post-mortems on demand.
        </p>
      </div>

      <Card>
        <CardContent className="py-16 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-violet-500/20 to-indigo-500/20">
            <Sparkles className="h-8 w-8 text-violet-500" />
          </div>
          <h2 className="text-lg font-semibold">Coming Soon</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
            AI-powered weakness mapping, readiness scores, and topic clustering
            are being built. Stay tuned!
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
