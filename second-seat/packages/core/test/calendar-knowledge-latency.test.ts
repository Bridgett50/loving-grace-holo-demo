import { describe, expect, it } from "vitest";
import {
  answerFromKnowledge,
  dueForAutoJoin,
  extractActionItems,
  LatencyMonitor,
  resolveJoinMode,
  summarizeTranscript,
  type CalendarEvent,
  type JoinRule,
  type KnowledgeDoc,
} from "../src";

const ev = (over: Partial<CalendarEvent> = {}): CalendarEvent => ({
  id: "e1",
  title: "Weekly sync",
  startsAt: "2026-10-14T17:00:00Z",
  endsAt: "2026-10-14T17:30:00Z",
  platform: "zoom",
  joinUrl: "https://zoom.us/j/1",
  organizerEmail: "pat@acme.com",
  attendeeEmails: ["a@x.com", "b@x.com", "c@x.com"],
  ...over,
});

const rules: JoinRule[] = [
  { id: "r1", name: "Standups: listen", mode: "listen", titleKeywords: ["standup", "sync"], priority: 1 },
  { id: "r2", name: "1:1s: skip", mode: "skip", maxAttendees: 1, priority: 5 },
  { id: "r3", name: "Acme: join", mode: "join", organizerDomains: ["acme.com"], priority: 3 },
];

describe("calendar rules", () => {
  it("uses the highest-priority matching rule", () => {
    expect(resolveJoinMode(ev(), rules).mode).toBe("join");
    expect(resolveJoinMode(ev({ organizerEmail: "x@other.com" }), rules).mode).toBe("listen");
    expect(resolveJoinMode(ev({ attendeeEmails: ["a@x.com"] }), rules).mode).toBe("skip");
  });

  it("per-meeting overrides win, and default is skip", () => {
    expect(resolveJoinMode(ev({ modeOverride: "skip" }), rules).mode).toBe("skip");
    expect(resolveJoinMode(ev({ title: "Board", organizerEmail: "x@y.com" }), rules).mode).toBe("skip");
  });

  it("skips meetings without a link", () => {
    expect(resolveJoinMode(ev({ joinUrl: undefined }), rules).mode).toBe("skip");
  });

  it("auto-join picks events within the lead window, once", () => {
    const now = new Date("2026-10-14T16:59:30Z");
    expect(dueForAutoJoin([ev()], rules, now).map((r) => r.event.id)).toEqual(["e1"]);
    expect(dueForAutoJoin([ev()], rules, now, 60_000, new Set(["e1"]))).toEqual([]);
    expect(dueForAutoJoin([ev()], rules, new Date("2026-10-14T16:50:00Z"))).toEqual([]);
  });
});

describe("answers from the owner's notes", () => {
  const docs: KnowledgeDoc[] = [
    { id: "d1", twinId: "t", title: "Launch plan", content: "The Holo Lab kiosk launches in March in Atlanta.\n\nBudget questions go to Grace directly.", source: "upload", createdAt: "" },
    { id: "d2", twinId: "t", title: "Team", content: "Jordan leads hardware. Priya leads the voice pipeline.", source: "note", createdAt: "" },
  ];
  const persona = { deferralPhrase: "I don't have that in my notes; I'll check with Grace." };

  it("answers grounded in the notes and cites the source", () => {
    const a = answerFromKnowledge("When does the kiosk launch?", docs, persona);
    expect(a.confident).toBe(true);
    expect(a.answer).toMatch(/March/);
    expect(a.sources[0].title).toBe("Launch plan");
  });

  it("defers instead of guessing", () => {
    const a = answerFromKnowledge("What's the quarterly revenue?", docs, persona);
    expect(a.confident).toBe(false);
    expect(a.answer).toBe(persona.deferralPhrase);
  });

  it("defers when a note only shares incidental words with the question", () => {
    const notes: KnowledgeDoc[] = [
      { id: "d3", twinId: "t", title: "Pilot notes", content: "The kiosk launch is March at the Atlanta site, then two more sites in April.", source: "note", createdAt: "" },
    ];
    const a = answerFromKnowledge("What does Grace think about hiring two more engineers in Q1?", notes, persona);
    expect(a.confident).toBe(false);
  });
});

describe("summary", () => {
  it("extracts action items with owners and due dates", () => {
    const items = extractActionItems([
      { at: "", speaker: "Jordan", text: "I'll send the hardware quote by Friday.", isTwin: false },
      { at: "", speaker: "Priya", text: "Can you share the voice sample checklist?", isTwin: false },
    ]);
    expect(items[0]).toMatchObject({ owner: "Jordan", due: "Friday" });
    expect(items[0].text).toBe("Send the hardware quote");
    expect(items[1].owner).toBe("You");
  });

  it("assigns 'you' to the owner or the named person, and skips twin lines and binding requests", () => {
    const items = extractActionItems(
      [
        { at: "", speaker: "Priya", text: "Can you share the voice sample checklist?", isTwin: false },
        { at: "", speaker: "Maya", text: "Jordan, can you send the floor plan?", isTwin: false },
        { at: "", speaker: "Pat", text: "Grace, can you agree to the revised contract terms today?", isTwin: false },
        { at: "", speaker: "Grace (AI Twin)", text: "I'm checking with Grace and I'll come back to it.", isTwin: true },
      ],
      "Grace Lee",
    );
    expect(items.map((i) => i.owner)).toEqual(["Grace Lee", "Jordan"]);
  });

  it("keeps the flagged-for-owner list", () => {
    const s = summarizeTranscript([{ at: "", speaker: "Pat", text: "We decided to ship in March.", isTwin: false }], ["Pat asked to sign the SOW"]);
    expect(s.decisions.length).toBe(1);
    expect(s.flaggedForOwner).toEqual(["Pat asked to sign the SOW"]);
  });
});

describe("latency budget (< 1 s)", () => {
  it("is ok under budget", () => {
    const m = new LatencyMonitor();
    for (let i = 0; i < 3; i++) m.record({ sttMs: 150, llmMs: 300, ttsMs: 150, avatarMs: 120 });
    expect(m.decide()).toBe("ok");
  });

  it("falls back to voice-only when the avatar pushes it over budget", () => {
    const m = new LatencyMonitor();
    for (let i = 0; i < 3; i++) m.record({ sttMs: 200, llmMs: 350, ttsMs: 200, avatarMs: 600 });
    expect(m.decide()).toBe("fallback_voice_only");
  });

  it("reports over budget when even voice-only is too slow", () => {
    const m = new LatencyMonitor();
    for (let i = 0; i < 3; i++) m.record({ sttMs: 400, llmMs: 900, ttsMs: 300, avatarMs: 100 });
    expect(m.decide()).toBe("over_budget");
  });
});
