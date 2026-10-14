import { search, tokenize } from "./knowledge";
import type { ActionItem, KnowledgeDoc, MeetingSummary, Persona, TranscriptLine } from "./types";

/**
 * Meeting intelligence that runs fully locally (no paid model needed): pre-meeting briefs,
 * post-meeting follow-through and recall across past meetings. Everything is grounded in the owner's
 * own notes and transcripts, and every claim carries its source.
 */

export interface PastMeeting {
  sessionId: string;
  title: string;
  at: string;
  transcript: TranscriptLine[];
  summary?: MeetingSummary;
}

export interface AnsweredQuestion {
  askedBy: string;
  question: string;
  status: "pending" | "answered" | "follow_up";
  answer?: string;
}

export function nameFromEmail(email: string): string {
  const local = email.split("@")[0].replace(/[._-]+/g, " ").trim();
  return local.replace(/\b\w/g, (c) => c.toUpperCase());
}

function overlap(a: string[], b: string[]): number {
  if (!a.length || !b.length) return 0;
  const sb = new Set(b);
  return a.filter((t) => sb.has(t)).length / Math.min(a.length, b.length);
}

// ---------------------------------------------------------------- pre-meeting brief

/** Words in meeting titles that describe the meeting itself, not a topic the notes should cover. */
const MEETING_WORDS = new Set(
  "check sync meeting call demo weekly daily monthly standup stand up review catch chat touch base 1on1 kickoff kick off session update".split(" "),
);

export interface MeetingBrief {
  attendees: string[];
  knows: Array<{ title: string; text: string }>;
  lastTime?: { sessionId: string; title: string; at: string; decisions: string[]; openItems: ActionItem[] };
  openFollowUps: string[];
  willDefer: string[];
  readiness: { score: number; label: "Ready" | "Mostly ready" | "Needs notes"; tips: string[] };
}

export function buildBrief(input: {
  event: { title: string; attendeeEmails: string[] };
  knowledge: KnowledgeDoc[];
  persona: Persona;
  ownerName: string;
  pastMeetings: PastMeeting[];
}): MeetingBrief {
  const { event, knowledge, persona, ownerName } = input;
  const first = ownerName.split(" ")[0];
  const titleTokens = tokenize(event.title);
  const attendees = event.attendeeEmails.map(nameFromEmail);

  const related = input.pastMeetings
    .filter((m) => m.summary && overlap(tokenize(m.title), titleTokens) >= 0.5)
    .sort((a, b) => b.at.localeCompare(a.at));
  const last = related[0];

  const query = [event.title, ...(last?.summary?.decisions ?? []), ...(last?.summary?.actionItems.map((a) => a.text) ?? [])].join(" ");
  const knows = search(query, knowledge, 4)
    .filter((h) => h.score > 0.5)
    .map((h) => ({ title: h.chunk.title, text: h.chunk.text }));

  const openFollowUps = related.flatMap((m) => m.summary?.flaggedForOwner.filter((f) => /^Follow up with/i.test(f)) ?? []).slice(0, 5);
  const willDefer = [
    "Contracts, signatures, payments or any binding commitment: refuses and hands to you",
    ...(persona.restrictedTopics.length ? [`Restricted topics (${persona.restrictedTopics.join(", ")}): says you'll handle them personally`] : []),
    `Anything not in your notes: asks you live ("Ask me"), or promises a follow-up from ${first}`,
  ];

  const uncovered = titleTokens.filter((t) => t.length > 2 && !MEETING_WORDS.has(t) && !knows.some((k) => tokenize(`${k.title} ${k.text}`).includes(t)));
  let score = 25 + Math.min(3, knows.length) * 18 + (last ? 15 : 0) + (knowledge.length ? 6 : 0);
  if (!knowledge.length) score = Math.min(score, 30);
  score = Math.max(5, Math.min(100, score));
  const tips: string[] = [];
  if (!knowledge.length) tips.push("Add a few notes so your twin can answer questions instead of deferring.");
  else if (uncovered.length) tips.push(`Add notes about ${uncovered.slice(0, 3).map((t) => `"${t}"`).join(", ")}; your notes don't mention ${uncovered.length > 1 ? "them" : "it"} yet.`);
  if (last?.summary?.actionItems.length) tips.push(`Check on ${last.summary.actionItems.length} action item${last.summary.actionItems.length > 1 ? "s" : ""} from last time before it starts.`);
  if (openFollowUps.length) tips.push(`You promised ${openFollowUps.length} follow-up${openFollowUps.length > 1 ? "s" : ""} after the last one.`);

  return {
    attendees,
    knows,
    lastTime: last
      ? { sessionId: last.sessionId, title: last.title, at: last.at, decisions: last.summary?.decisions ?? [], openItems: last.summary?.actionItems ?? [] }
      : undefined,
    openFollowUps,
    willDefer,
    readiness: { score, label: score >= 75 ? "Ready" : score >= 50 ? "Mostly ready" : "Needs notes", tips },
  };
}

// ---------------------------------------------------------------- post-meeting follow-through

export function draftFollowUp(input: { title: string; ownerName: string; summary: MeetingSummary; questions?: AnsweredQuestion[] }): { subject: string; body: string } {
  const { title, ownerName, summary } = input;
  const first = ownerName.split(" ")[0];
  const answered = (input.questions ?? []).filter((q) => q.status === "answered" && q.answer);
  const promised = (input.questions ?? []).filter((q) => q.status === "follow_up");
  const lines: string[] = ["Hi all,", "", `Thanks for today's ${title}. Here's a quick recap.`];
  if (summary.decisions.length) lines.push("", "Decisions", ...summary.decisions.map((d) => `- ${d}`));
  if (summary.actionItems.length) lines.push("", "Action items", ...summary.actionItems.map((a) => `- ${a.owner}: ${a.text}${a.due ? ` (by ${a.due})` : ""}`));
  if (answered.length) lines.push("", "Answers from me", ...answered.map((q) => `- ${q.askedBy.replace(/\s*\(.*\)$/, "")} asked "${q.question}": ${q.answer}`));
  if (promised.length) lines.push("", "I still owe you", ...promised.map((q) => `- ${q.askedBy.replace(/\s*\(.*\)$/, "")}: "${q.question}". I'll get back to you on this.`));
  lines.push("", "Best,", first, "", `(Drafted by my AI twin from the meeting notes and reviewed by me before sending.)`);
  return { subject: `Recap: ${title}`, body: lines.join("\n") };
}

export interface MemorySuggestion {
  id: string;
  title: string;
  content: string;
  kind: "owner_answer" | "decision";
}

function stableId(text: string): string {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  return (h >>> 0).toString(36);
}

/** Things worth remembering for next time. Nothing is saved until the owner approves it. */
export function suggestMemories(input: { sessionId: string; title: string; summary?: MeetingSummary; questions?: AnsweredQuestion[]; knowledge: KnowledgeDoc[] }): MemorySuggestion[] {
  const out: MemorySuggestion[] = [];
  for (const q of input.questions ?? []) {
    if (q.status !== "answered" || !q.answer) continue;
    out.push({ id: `mem_${stableId(input.sessionId + q.question)}`, title: q.question, content: q.answer, kind: "owner_answer" });
  }
  for (const d of input.summary?.decisions ?? []) {
    out.push({ id: `mem_${stableId(input.sessionId + d)}`, title: `Decision from ${input.title}`, content: d, kind: "decision" });
  }
  const known = new Set(input.knowledge.map((k) => k.id));
  return out.filter((m) => !known.has(m.id) && !input.knowledge.some((k) => k.content.trim() === m.content.trim()));
}

// ---------------------------------------------------------------- recall across meetings

export interface RecallCitation {
  kind: "meeting" | "note";
  title: string;
  text: string;
  speaker?: string;
  at?: string;
  sessionId?: string;
}

export interface RecallResult {
  answer: string;
  confident: boolean;
  citations: RecallCitation[];
}

export function recall(query: string, input: { knowledge: KnowledgeDoc[]; meetings: PastMeeting[] }): RecallResult {
  const meta = new Map<string, Omit<RecallCitation, "text">>();
  const docs: KnowledgeDoc[] = [];
  for (const k of input.knowledge) {
    meta.set(k.id, { kind: "note", title: k.title });
    docs.push(k);
  }
  for (const m of input.meetings) {
    m.transcript
      .filter((l) => l.speaker !== "System")
      .forEach((l, i) => {
        const id = `${m.sessionId}#${i}`;
        meta.set(id, { kind: "meeting", title: m.title, speaker: l.speaker, at: l.at, sessionId: m.sessionId });
        docs.push({ id, twinId: "", title: m.title, content: l.text, source: "note", createdAt: l.at });
      });
  }
  const hits = search(query, docs, 5).filter((h) => h.score > 0.8);
  const citations = hits.map((h) => ({ ...(meta.get(h.chunk.docId) as Omit<RecallCitation, "text">), text: h.chunk.text }));
  if (!citations.length) return { answer: "I couldn't find that in your meetings or notes.", confident: false, citations: [] };
  const top = citations[0];
  const where = top.kind === "meeting" ? `In "${top.title}"${top.at ? ` on ${new Date(top.at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}` : ""}, ${top.speaker} said` : `Your note "${top.title}" says`;
  return { answer: `${where}: "${top.text}"`, confident: hits[0].score > 1.6, citations };
}
