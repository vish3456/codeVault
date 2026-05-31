import Link from "next/link";
import { Brain, CalendarClock, ListChecks, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const modules = [
  {
    title: "Problems",
    description: "Track solved problems, tags, and difficulty across platforms.",
    icon: ListChecks,
    href: "#problems",
  },
  {
    title: "Revision",
    description: "Spaced repetition queue so patterns stick before contests.",
    icon: CalendarClock,
    href: "#revision",
  },
  {
    title: "AI Coach",
    description: "Pattern hints, pitfall checks, and post-mortems on demand.",
    icon: Sparkles,
    href: "#ai",
  },
] as const;

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <div className="flex items-center gap-2 font-semibold">
            <Brain className="h-5 w-5" />
            <span>CodeVault</span>
          </div>
          <nav className="flex items-center gap-2">
            <Button variant="ghost" asChild>
              <Link href="/login">Sign in</Link>
            </Button>
            <Button asChild>
              <Link href="/login">Get started</Link>
            </Button>
          </nav>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-10 px-4 py-12">
        <section className="space-y-4">
          <p className="text-sm font-medium text-muted-foreground">
            Competitive programming · Second brain
          </p>
          <h1 className="max-w-2xl text-4xl font-bold tracking-tight sm:text-5xl">
            Remember every pattern you&apos;ve ever solved.
          </h1>
          <p className="max-w-xl text-lg text-muted-foreground">
            CodeVault connects your problem log, revision schedule, and AI
            insights into one workspace built for contest prep.
          </p>
        </section>

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {modules.map(({ title, description, icon: Icon, href }) => (
            <Card key={title} id={href.replace("#", "")}>
              <CardHeader>
                <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                  <Icon className="h-5 w-5" />
                </div>
                <CardTitle>{title}</CardTitle>
                <CardDescription>{description}</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Wire-up pending backend — UI shell ready.
                </p>
              </CardContent>
            </Card>
          ))}
        </section>
      </main>

      <footer className="border-t py-6 text-center text-sm text-muted-foreground">
        CodeVault · apps/web · Next.js 15
      </footer>
    </div>
  );
}
