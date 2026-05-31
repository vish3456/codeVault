"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Github, Loader2 } from "lucide-react";
import { motion } from "framer-motion";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/features/auth/components/auth-provider";
import { signInWithGithub, signInWithGoogle } from "@/features/auth/lib/auth-actions";

export function LoginForm() {
  const { user, configured, loading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [pending, setPending] = useState<"google" | "github" | null>(null);

  useEffect(() => {
    if (user) {
      router.push("/dashboard");
    }
  }, [user, router]);

  async function handleOAuth(provider: "google" | "github") {
    if (!configured) {
      toast({
        variant: "destructive",
        title: "Firebase not configured",
        description: "Add NEXT_PUBLIC_FIREBASE_* vars to .env.local",
      });
      return;
    }

    setPending(provider);
    try {
      if (provider === "google") {
        await signInWithGoogle();
      } else {
        await signInWithGithub();
      }
      toast({ title: "Signed in", description: "Welcome to CodeVault." });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Authentication failed";
      toast({
        variant: "destructive",
        title: "Sign-in failed",
        description: message,
      });
    } finally {
      setPending(null);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="w-full max-w-md"
    >
      <Card>
        <CardHeader>
          <CardTitle>Sign in to CodeVault</CardTitle>
          <CardDescription>
            Your AI-powered second brain for competitive programming.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="email" className="text-sm font-medium">
              Email (coming soon)
            </label>
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              disabled
            />
          </div>
          <div className="grid gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={authLoading || pending !== null}
              onClick={() => handleOAuth("google")}
            >
              {pending === "google" ? (
                <Loader2 className="animate-spin" />
              ) : null}
              Continue with Google
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={authLoading || pending !== null}
              onClick={() => handleOAuth("github")}
            >
              {pending === "github" ? (
                <Loader2 className="animate-spin" />
              ) : (
                <Github />
              )}
              Continue with GitHub
            </Button>
          </div>
          {!configured && (
            <p className="text-sm text-muted-foreground">
              Copy <code className="text-xs">.env.example</code> to{" "}
              <code className="text-xs">.env.local</code> and add Firebase client
              keys to enable OAuth.
            </p>
          )}
        </CardContent>
        <CardFooter className="justify-center text-sm text-muted-foreground">
          <Link href="/" className="hover:text-foreground underline-offset-4 hover:underline">
            Back to dashboard
          </Link>
        </CardFooter>
      </Card>
    </motion.div>
  );
}
