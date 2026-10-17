import "server-only";
import type { CalendarEvent, JoinRule, KnowledgeDoc } from "@second-seat/core";
import { newId } from "./db";

export function sampleKnowledge(twinId: string, firstName: string): KnowledgeDoc[] {
  const now = new Date().toISOString();
  return [
    {
      id: newId("kn"),
      twinId,
      title: "Holo Lab pilot notes (sample)",
      source: "note",
      createdAt: now,
      content: [
        "The kiosk launch timeline is March, starting with the Atlanta pilot site, then two more sites in April.",
        "Priya leads the voice pipeline work. Jordan leads the hardware and the glass-box display build.",
        `The design review is owned by Maya. ${firstName} reviews the final consent and disclosure copy personally.`,
        "The onboarding checklist and voice sample checklist live in the shared Holo Lab drive folder.",
        `Budget and hiring decisions go to ${firstName} directly and are not decided in meetings.`,
      ].join("\n\n"),
    },
  ];
}

export function defaultRules(): JoinRule[] {
  return [
    { id: newId("rule"), name: "Skip 1:1s", mode: "skip", maxAttendees: 1, priority: 10 },
    { id: newId("rule"), name: "Listen in on standups", mode: "listen", titleKeywords: ["standup", "stand-up", "all hands"], priority: 5 },
    { id: newId("rule"), name: "Join project check-ins", mode: "join", titleKeywords: ["check-in", "sync", "pilot"], priority: 3 },
  ];
}

/** Demo calendar relative to now so auto-join has something to do on every run. */
export function demoEvents(): CalendarEvent[] {
  const at = (min: number) => new Date(Date.now() + min * 60_000).toISOString();
  return [
    {
      id: newId("ev"),
      title: "Holo Lab pilot check-in",
      startsAt: at(3),
      endsAt: at(33),
      platform: "demo",
      organizerEmail: "maya@company.example",
      attendeeEmails: ["maya@company.example", "jordan@company.example", "priya@company.example", "pat@vendor.example"],
    },
    {
      id: newId("ev"),
      title: "Daily standup",
      startsAt: at(75),
      endsAt: at(90),
      platform: "google_meet",
      joinUrl: "https://meet.google.com/abc-defg-hij",
      organizerEmail: "maya@company.example",
      attendeeEmails: ["maya@company.example", "jordan@company.example", "priya@company.example"],
    },
    {
      id: newId("ev"),
      title: "Vendor sync: display hardware",
      startsAt: at(180),
      endsAt: at(210),
      platform: "zoom",
      joinUrl: "https://us02web.zoom.us/j/81234567890?pwd=demo",
      organizerEmail: "pat@vendor.example",
      attendeeEmails: ["pat@vendor.example", "jordan@company.example"],
    },
    {
      id: newId("ev"),
      title: "1:1 with Jordan",
      startsAt: at(24 * 60),
      endsAt: at(24 * 60 + 30),
      platform: "teams",
      joinUrl: "https://teams.microsoft.com/l/meetup-join/19%3ameeting_demo%40thread.v2/0",
      organizerEmail: "jordan@company.example",
      attendeeEmails: ["jordan@company.example"],
    },
  ];
}
