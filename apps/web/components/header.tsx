"use client";

import { useAuth, signOutUser } from "@/features/auth";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Brain, LogOut, Menu } from "lucide-react";
import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CalendarClock,
  Home,
  ListChecks,
  FileText,
  AlertTriangle,
  Tags,
} from "lucide-react";
import { cn } from "@/lib/utils";

const mobileNavItems = [
  { label: "Dashboard", href: "/dashboard", icon: Home },
  { label: "Problems", href: "/dashboard/problems", icon: ListChecks },
  { label: "Notes", href: "/dashboard/notes", icon: FileText },
  { label: "Mistakes", href: "/dashboard/mistakes", icon: AlertTriangle },
  { label: "Revision", href: "/dashboard/revision", icon: CalendarClock },
  { label: "Tags", href: "/dashboard/tags", icon: Tags },
] as const;

export function Header() {
  const { user } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();

  const initials = user?.displayName
    ? user.displayName
        .split(" ")
        .map((n) => n[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : user?.email?.[0]?.toUpperCase() ?? "U";

  return (
    <>
      <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b bg-card/80 px-4 backdrop-blur-md lg:px-6">
        {/* Mobile menu */}
        <button
          className="lg:hidden"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Toggle navigation"
        >
          <Menu className="h-5 w-5" />
        </button>

        {/* Mobile brand */}
        <div className="flex items-center gap-2 lg:hidden">
          <Brain className="h-5 w-5 text-violet-600" />
          <span className="font-bold">CodeVault</span>
        </div>

        {/* Spacer for desktop */}
        <div className="hidden lg:block" />

        {/* User area */}
        <div className="flex items-center gap-3">
          <div className="hidden text-right text-sm sm:block">
            <p className="font-medium">{user?.displayName ?? "User"}</p>
            <p className="text-xs text-muted-foreground">{user?.email}</p>
          </div>
          <Avatar className="h-9 w-9">
            {user?.photoURL && <AvatarImage src={user.photoURL} />}
            <AvatarFallback className="bg-gradient-to-br from-violet-500 to-indigo-500 text-white text-xs">
              {initials}
            </AvatarFallback>
          </Avatar>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              void signOutUser();
            }}
            title="Sign out"
            className="h-9 w-9"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </header>

      {/* Mobile nav overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setMobileOpen(false)}
          />
          <nav className="relative z-50 w-64 bg-card h-full border-r p-4 space-y-1">
            <div className="flex items-center gap-2 mb-6 px-3">
              <Brain className="h-5 w-5 text-violet-600" />
              <span className="font-bold text-lg">CodeVault</span>
            </div>
            {mobileNavItems.map(({ label, href, icon: Icon }) => {
              const isActive =
                href === "/dashboard"
                  ? pathname === "/dashboard"
                  : pathname.startsWith(href);
              return (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setMobileOpen(false)}
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
        </div>
      )}
    </>
  );
}
