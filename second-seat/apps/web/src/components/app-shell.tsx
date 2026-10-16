"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarClock, Home, Menu, MessageCircleQuestion, Plug, Radio, Sparkles, UserRound } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Wordmark } from "@/components/brand";
import { cn } from "@/lib/utils";
import { BRAND } from "@/lib/brand";

const NAV = [
  { href: "/", label: "Home", icon: Home },
  { href: "/twin", label: "My twin", icon: UserRound },
  { href: "/meetings", label: "Meetings", icon: CalendarClock },
  { href: "/sessions", label: "Sessions", icon: Radio },
  { href: "/ask", label: "Ask", icon: MessageCircleQuestion },
  { href: "/skills", label: "Skills", icon: Sparkles },
  { href: "/connections", label: "Connections", icon: Plug },
];

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const path = usePathname();
  return (
    <>
      {NAV.map(({ href, label, icon: Icon }) => {
        const active = href === "/" ? path === "/" : path.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors",
              active ? "bg-secondary text-secondary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            <Icon className="size-4" />
            {label}
          </Link>
        );
      })}
    </>
  );
}

export function AppShell({ children, demoMode, botOnline }: { children: React.ReactNode; demoMode: boolean; botOnline: boolean }) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-30 border-b bg-background/85 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 sm:px-6">
          <Link href="/" aria-label={`${BRAND.name} home`}>
            <Wordmark />
          </Link>
          <nav className="ml-6 hidden items-center gap-1 lg:flex" aria-label="Main">
            <NavLinks />
          </nav>
          <div className="ml-auto flex items-center gap-2">
            {demoMode && (
              <Badge variant="secondary" className="hidden sm:inline-flex">
                Demo mode
              </Badge>
            )}
            <Badge variant="outline" className="gap-1.5" title={botOnline ? "Bot service connected" : "Bot service offline"}>
              <span className={cn("size-2 rounded-full", botOnline ? "bg-success" : "bg-destructive")} />
              <span className="hidden sm:inline">{botOnline ? "Demo live" : "Demo offline"}</span>
            </Badge>
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Open menu">
                  <Menu />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-72">
                <SheetHeader>
                  <SheetTitle>
                    <Wordmark />
                  </SheetTitle>
                </SheetHeader>
                <nav className="flex flex-col gap-1 px-4" aria-label="Mobile">
                  <NavLinks />
                </nav>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>
      {!botOnline && (
        <div className="border-b bg-warning/15 px-4 py-2 text-center text-sm">
          The bot service isn&apos;t running, so your twin can&apos;t join meetings. Start it with <code className="rounded bg-muted px-1">pnpm dev:bot</code>.
        </div>
      )}
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6">{children}</main>
      <footer className="border-t py-6 text-center text-xs text-muted-foreground">
        {BRAND.name} always discloses that it is an AI twin. Contract and payment capabilities are forbidden in its code, and it only runs for its verified owner.
      </footer>
    </div>
  );
}
