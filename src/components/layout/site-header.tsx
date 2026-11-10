"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import { GraduationCap, Moon, Sun, Menu } from "lucide-react";
import { Suspense, useState } from "react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useProgress } from "@/lib/client/store";
import { cn } from "@/lib/utils";
import { TutorLauncher } from "@/components/tutor/tutor-launcher";

const NAV = [
  { href: "/", label: "Learn" },
  { href: "/markets", label: "Markets" },
  { href: "/portfolio", label: "Portfolio" },
  { href: "/activity", label: "Activity" },
  { href: "/glossary", label: "Glossary" },
];

export function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2 font-semibold" aria-label="FSX home">
      <svg viewBox="0 0 32 32" className="size-8" aria-hidden="true">
        <rect width="32" height="32" rx="8" className="fill-primary" />
        <ellipse cx="16" cy="16" rx="11" ry="7" className="fill-none stroke-primary-foreground" strokeWidth="1.5" transform="rotate(-30 16 16)" />
        <path d="M7 21 L13 15 L17 18 L25 10" className="fill-none stroke-learn" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <span className="leading-tight">
        <span className="block text-base">FSX</span>
        <span className="text-muted-foreground hidden text-[11px] font-normal sm:block">Fantasy Stock Exchange</span>
      </span>
    </Link>
  );
}

function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
      aria-label="Toggle light or dark theme"
    >
      <Sun className="hidden dark:block" />
      <Moon className="dark:hidden" />
    </Button>
  );
}

function LearnModeToggle() {
  const { progress, update } = useProgress();
  return (
    <div className="flex items-center gap-2">
      <Switch
        id="learn-mode"
        checked={progress.learnMode}
        onCheckedChange={(v) => update((p) => ({ ...p, learnMode: v }))}
      />
      <Label htmlFor="learn-mode" className="flex items-center gap-1 text-sm">
        <GraduationCap className="text-learn size-4" aria-hidden="true" />
        Learn mode
      </Label>
    </div>
  );
}

function NavLinks(props: { onNavigate?: () => void }) {
  // usePathname is request data: render plain links in the static shell, active state after.
  return (
    <Suspense fallback={<NavLinksInner pathname={null} {...props} />}>
      <ActiveNavLinks {...props} />
    </Suspense>
  );
}

function ActiveNavLinks(props: { onNavigate?: () => void }) {
  return <NavLinksInner pathname={usePathname()} {...props} />;
}

function NavLinksInner({ pathname, onNavigate }: { pathname: string | null; onNavigate?: () => void }) {
  return (
    <>
      {NAV.map((n) => {
        const active = pathname === null ? false : n.href === "/" ? pathname === "/" || pathname.startsWith("/learn") || pathname === "/start" : pathname.startsWith(n.href);
        return (
          <Link
            key={n.href}
            href={n.href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={cn(
              "rounded-md px-3 py-2 text-sm font-medium transition-colors",
              active ? "bg-secondary text-secondary-foreground" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {n.label}
          </Link>
        );
      })}
    </>
  );
}

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  return (
    <header className="bg-background/90 sticky top-0 z-40 border-b backdrop-blur">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:rounded focus:bg-card focus:p-2">
        Skip to content
      </a>
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-4">
        <Logo />
        <nav aria-label="Main" className="hidden items-center gap-1 md:flex">
          <NavLinks />
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <div className="hidden sm:block">
            <LearnModeToggle />
          </div>
          <TutorLauncher />
          <ThemeToggle />
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger render={<Button variant="ghost" size="icon" className="md:hidden" aria-label="Open menu" />}>
              <Menu />
            </SheetTrigger>
            <SheetContent side="right" className="w-72 p-4">
              <SheetTitle>Menu</SheetTitle>
              <nav aria-label="Main" className="mt-4 flex flex-col gap-1">
                <NavLinks onNavigate={() => setOpen(false)} />
              </nav>
              <div className="mt-6">
                <LearnModeToggle />
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
