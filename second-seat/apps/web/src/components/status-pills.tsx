import { CheckCircle2, CircleAlert } from "lucide-react";
import type { SessionState } from "@second-seat/core";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export function Check({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span className="flex items-center gap-1.5 text-sm">
      {ok ? <CheckCircle2 className="size-4 text-success" /> : <CircleAlert className="size-4 text-warning" />}
      <span className={cn(!ok && "text-muted-foreground")}>{label}</span>
    </span>
  );
}

const STATE_LABEL: Record<SessionState, { label: string; tone: string }> = {
  preflight: { label: "Pre-flight", tone: "bg-muted text-foreground" },
  blocked: { label: "Blocked", tone: "bg-destructive/15 text-destructive" },
  joining: { label: "Joining", tone: "bg-warning/20 text-foreground" },
  waiting_for_media: { label: "Waiting for video + audio", tone: "bg-warning/20 text-foreground" },
  live: { label: "Live", tone: "bg-success/20 text-foreground" },
  voice_only: { label: "Live · voice only", tone: "bg-success/20 text-foreground" },
  listen_only: { label: "Listening only", tone: "bg-secondary text-secondary-foreground" },
  ended: { label: "Ended", tone: "bg-muted text-foreground" },
  failed: { label: "Failed · refunded", tone: "bg-destructive/15 text-destructive" },
  refunded: { label: "Ended · not billed", tone: "bg-muted text-foreground" },
};

export function SessionStateBadge({ state, className }: { state: SessionState; className?: string }) {
  const s = STATE_LABEL[state];
  const pulsing = state === "live" || state === "voice_only" || state === "listen_only";
  return (
    <Badge variant="outline" className={cn("gap-1.5 border-transparent", s.tone, className)}>
      {pulsing && <span className="size-1.5 animate-pulse rounded-full bg-success" />}
      {s.label}
    </Badge>
  );
}

export const PLATFORM_LABEL: Record<string, string> = { google_meet: "Google Meet", zoom: "Zoom", teams: "Teams", demo: "Demo meeting" };

export const MODE_LABEL: Record<string, string> = { join: "Join & speak", listen: "Listen only", skip: "Skip" };
