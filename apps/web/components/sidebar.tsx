"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Brain,
  CalendarClock,
  Home,
  ListChecks,
  FileText,
  AlertTriangle,
  Sparkles,
  Tags,
  Code2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";

const navItems = [
  { label: "Dashboard", href: "/dashboard", icon: Home },
  { label: "Problems", href: "/dashboard/problems", icon: ListChecks },
  { label: "Notes", href: "/dashboard/notes", icon: FileText },
  { label: "Mistakes", href: "/dashboard/mistakes", icon: AlertTriangle },
  { label: "Revision", href: "/dashboard/revision", icon: CalendarClock },
  { label: "Tags", href: "/dashboard/tags", icon: Tags },
  { label: "LeetCode", href: "/dashboard/leetcode", icon: Code2 },
] as const;

const secondaryItems = [
  { label: "AI Coach", href: "/dashboard/ai", icon: Sparkles },
] as const;

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden w-64 shrink-0 border-r bg-card lg:flex lg:flex-col">
      {/* Brand */}
      <div className="flex h-16 items-center gap-2 border-b px-6">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-violet-600 to-indigo-600">
          <Brain className="h-4 w-4 text-white" />
        </div>
        <span className="text-lg font-bold tracking-tight">CodeVault</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-3 py-4">
        {navItems.map(({ label, href, icon: Icon }) => {
          const isActive =
            href === "/dashboard"
              ? pathname === "/dashboard"
              : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all",
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          );
        })}

        <Separator className="my-3" />

        {secondaryItems.map(({ label, href, icon: Icon }) => {
          const isActive = pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all",
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="border-t px-6 py-4">
        <p className="text-xs text-muted-foreground">
          CodeVault v0.1.0
        </p>
      </div>
    </aside>
  );
}
