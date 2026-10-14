import "server-only";
import { dueForAutoJoin } from "@second-seat/core";
import { readDb } from "./db";
import { launchSession } from "./sessions";

/**
 * Calendar auto-join. Every 15 s, for each owner with auto-join on, launches the twin for events
 * starting within the next minute whose rule resolves to "join" or "listen". Each event launches once.
 */
export async function schedulerTick(now = new Date()) {
  const db = readDb();
  for (const [ownerId, enabled] of Object.entries(db.autoJoin)) {
    if (!enabled) continue;
    const due = dueForAutoJoin(db.events[ownerId] ?? [], db.rules[ownerId] ?? [], now, 60_000, new Set(Object.keys(db.launched)));
    for (const { event, mode } of due) {
      try {
        await launchSession({
          ownerId,
          platform: event.platform,
          joinUrl: event.joinUrl,
          title: event.title,
          eventId: event.id,
          mode: mode === "listen" ? "listen_only" : "full",
          voiceOnlyFallback: true,
          capMinutes: Math.min(60, Math.max(5, Math.round((Date.parse(event.endsAt) - Date.parse(event.startsAt)) / 60_000))),
        });
        console.log(`[auto-join] launched twin for "${event.title}" (${mode})`);
      } catch (e) {
        console.warn(`[auto-join] could not launch "${event.title}": ${(e as Error).message}`);
      }
    }
  }
}

let started = false;
export function startScheduler() {
  if (started) return;
  started = true;
  setInterval(() => void schedulerTick().catch(() => undefined), 15_000);
}
