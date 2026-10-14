import { describe, expect, it } from "vitest";
import { buildBrief, draftFollowUp, nameFromEmail, recall, suggestMemories, summarizeTranscript, type KnowledgeDoc, type PastMeeting, type TranscriptLine } from "../src";

const knowledge: KnowledgeDoc[] = [
  { id: "k1", twinId: "t", title: "Holo Lab pilot plan", content: "The kiosk launch timeline is March in Atlanta.\n\nPriya leads the voice pipeline work.", source: "upload", createdAt: "" },
];
const persona = { tone: "warm", role: "Founder", facts: [], restrictedTopics: ["salary"], deferralPhrase: "I'll check." };
const line = (speaker: string, text: string, isTwin = false): TranscriptLine => ({ at: "2026-10-01T15:00:00.000Z", speaker, text, isTwin });

const past: PastMeeting = {
  sessionId: "s1",
  title: "Holo Lab pilot check-in",
  at: "2026-10-01T15:00:00.000Z",
  transcript: [line("Jordan", "I'll send the updated hardware budget by Friday."), line("Maya (host)", "We decided to move the design review to next Tuesday.")],
};
past.summary = summarizeTranscript(past.transcript, ['Follow up with Pat (vendor): "What about Denver?"']);

describe("pre-meeting brief", () => {
  it("pulls what the twin knows, last time's decisions and open follow-ups", () => {
    const b = buildBrief({ event: { title: "Holo Lab pilot check-in", attendeeEmails: ["maya.lee@x.com"] }, knowledge, persona, ownerName: "Bridgett Sanders", pastMeetings: [past] });
    expect(b.attendees).toEqual(["Maya Lee"]);
    expect(b.knows.length).toBeGreaterThan(0);
    expect(b.lastTime?.sessionId).toBe("s1");
    expect(b.lastTime?.openItems[0].owner).toBe("Jordan");
    expect(b.openFollowUps[0]).toMatch(/Denver/);
    expect(b.willDefer[0]).toMatch(/Contracts/);
    expect(b.readiness.label).toBe("Ready");
  });

  it("is honest when the twin has nothing to go on", () => {
    const b = buildBrief({ event: { title: "Board compensation review", attendeeEmails: [] }, knowledge: [], persona, ownerName: "Bridgett", pastMeetings: [] });
    expect(b.knows).toEqual([]);
    expect(b.readiness.label).toBe("Needs notes");
    expect(b.readiness.tips[0]).toMatch(/Add a few notes/);
  });
});

describe("follow-through", () => {
  const questions = [
    { askedBy: "Pat (vendor)", question: "Are we opening in Denver?", status: "answered" as const, answer: "Not this year." },
    { askedBy: "Priya", question: "Can we hire two engineers?", status: "follow_up" as const },
  ];

  it("drafts a recap that includes owner answers and promised follow-ups, and says it was AI-drafted", () => {
    const d = draftFollowUp({ title: "Holo Lab pilot check-in", ownerName: "Bridgett Sanders", summary: past.summary!, questions });
    expect(d.subject).toBe("Recap: Holo Lab pilot check-in");
    expect(d.body).toMatch(/Jordan: Send the updated hardware budget \(by Friday\)/);
    expect(d.body).toMatch(/Pat asked "Are we opening in Denver\?": Not this year\./);
    expect(d.body).toMatch(/I still owe you\n- Priya/);
    expect(d.body).toMatch(/Drafted by my AI twin/);
  });

  it("suggests memories from owner answers and decisions, skipping ones already saved", () => {
    const m = suggestMemories({ sessionId: "s1", title: "Check-in", summary: past.summary, questions, knowledge });
    expect(m.map((x) => x.kind).sort()).toEqual(["decision", "owner_answer"]);
    const saved: KnowledgeDoc = { id: m[0].id, twinId: "t", title: m[0].title, content: m[0].content, source: "note", createdAt: "" };
    expect(suggestMemories({ sessionId: "s1", title: "Check-in", summary: past.summary, questions, knowledge: [...knowledge, saved] })).toHaveLength(1);
  });
});

describe("recall across meetings", () => {
  it("answers with a citation to the meeting and speaker", () => {
    const r = recall("when is the hardware budget due", { knowledge, meetings: [past] });
    expect(r.citations[0]).toMatchObject({ kind: "meeting", speaker: "Jordan", sessionId: "s1" });
    expect(r.answer).toMatch(/Jordan said: "I'll send the updated hardware budget by Friday."/);
  });

  it("falls back to notes and admits when nothing matches", () => {
    expect(recall("who leads the voice pipeline", { knowledge, meetings: [past] }).citations[0].kind).toBe("note");
    expect(recall("quarterly tax filing", { knowledge, meetings: [past] })).toMatchObject({ confident: false, citations: [] });
  });

  it("derives display names from emails", () => {
    expect(nameFromEmail("pat_o-neil@vendor.example")).toBe("Pat O Neil");
  });
});
