import type { CalendarEvent, JoinMode, JoinRule } from "./types";

export interface ResolvedEvent {
  event: CalendarEvent;
  mode: JoinMode;
  /** Why this mode was chosen, for display. */
  because: string;
}

function domainOf(email?: string): string | undefined {
  return email?.split("@")[1]?.toLowerCase();
}

export function ruleMatches(rule: JoinRule, event: CalendarEvent): boolean {
  const title = event.title.toLowerCase();
  if (rule.titleKeywords?.length && !rule.titleKeywords.some((k) => title.includes(k.toLowerCase()))) return false;
  if (rule.organizerDomains?.length) {
    const d = domainOf(event.organizerEmail);
    if (!d || !rule.organizerDomains.map((x) => x.toLowerCase()).includes(d)) return false;
  }
  const count = event.attendeeEmails.length;
  if (rule.minAttendees !== undefined && count < rule.minAttendees) return false;
  if (rule.maxAttendees !== undefined && count > rule.maxAttendees) return false;
  if (rule.platforms?.length && !rule.platforms.includes(event.platform)) return false;
  return true;
}

/** Per-event override wins, then the highest-priority matching rule, then the default (skip). */
export function resolveJoinMode(event: CalendarEvent, rules: JoinRule[], defaultMode: JoinMode = "skip"): ResolvedEvent {
  if (event.modeOverride) return { event, mode: event.modeOverride, because: "Set for this meeting" };
  if (!event.joinUrl && event.platform !== "demo") return { event, mode: "skip", because: "No meeting link" };
  const match = [...rules].sort((a, b) => b.priority - a.priority).find((r) => ruleMatches(r, event));
  if (match) return { event, mode: match.mode, because: `Rule: ${match.name}` };
  return { event, mode: defaultMode, because: "Default" };
}

/** Events the scheduler should launch now: starting within `leadMs` (or already started, not ended). */
export function dueForAutoJoin(events: CalendarEvent[], rules: JoinRule[], now: Date, leadMs = 60_000, alreadyLaunched: Set<string> = new Set()): ResolvedEvent[] {
  const t = now.getTime();
  return events
    .filter((e) => !alreadyLaunched.has(e.id))
    .filter((e) => {
      const start = Date.parse(e.startsAt);
      const end = Date.parse(e.endsAt);
      return start - leadMs <= t && t < end;
    })
    .map((e) => resolveJoinMode(e, rules))
    .filter((r) => r.mode !== "skip");
}
