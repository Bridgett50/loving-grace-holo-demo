import type { ActionItem, MeetingSummary, TranscriptLine } from "./types";

/**
 * Post-meeting notes, decisions and action items. This is the deterministic extractor used in demo
 * mode and as the fallback when the LLM is unavailable; with an LLM configured the bot service asks it
 * for the same JSON shape and merges in anything flagged for the owner.
 */

const ACTION_PATTERNS: RegExp[] = [
  /\b(?<who>i|I|we|We|you|You|[A-Z][a-z]+)(?:'ll|\s+(?:will|need to|needs to|should|is going to|are going to))\s+(?<what>[^.?!]+)/,
  /\b(?:[Cc]an|[Cc]ould)\s+(?<who>you|[A-Z][a-z]+)\s+(?<what>[^.?!]+)\?/,
  /\baction(?: item)?:\s*(?<what>[^.?!]+)/i,
  /\b(?:todo|to-do):\s*(?<what>[^.?!]+)/i,
];

const DUE_RE = /\b(by|before|on|due)\s+((?:next\s+)?(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday|tomorrow|today|end of (?:day|week|month)|eod|eow|[A-Z][a-z]{2,8}\s+\d{1,2}))/i;
const DECISION_RE = /\b(we decided|we agreed|decision:|let'?s go with|we'?ll go with|final answer is|approved the plan)\b/i;

function resolveOwner(who: string | undefined, speaker: string): string {
  if (!who) return speaker;
  const w = who.toLowerCase();
  if (w === "i") return speaker;
  if (w === "we") return "Team";
  if (w === "you") return "Assignee (addressed)";
  return who;
}

export function extractActionItems(lines: TranscriptLine[]): ActionItem[] {
  const items: ActionItem[] = [];
  for (const line of lines) {
    if (line.isTwin && /can't agree|flagged this/i.test(line.text)) continue;
    for (const re of ACTION_PATTERNS) {
      const m = line.text.match(re);
      if (m?.groups?.what) {
        const due = line.text.match(DUE_RE)?.[2];
        const text = m.groups.what.replace(DUE_RE, "").trim().replace(/\s+/g, " ");
        if (text.split(" ").length < 2) continue;
        items.push({ owner: resolveOwner(m.groups.who, line.speaker), text: text.charAt(0).toUpperCase() + text.slice(1), due });
        break;
      }
    }
  }
  const seen = new Set<string>();
  return items.filter((i) => {
    const key = `${i.owner}|${i.text.toLowerCase()}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function summarizeTranscript(lines: TranscriptLine[], flaggedForOwner: string[] = []): MeetingSummary {
  const human = lines.filter((l) => !l.isTwin);
  const speakers = [...new Set(human.map((l) => l.speaker))];
  const decisions = lines.filter((l) => DECISION_RE.test(l.text)).map((l) => `${l.speaker}: ${l.text}`);
  const substantive = human.filter((l) => l.text.split(" ").length >= 8).slice(0, 6);
  const notes = [
    speakers.length ? `Participants: ${speakers.join(", ")}.` : "No other participants spoke.",
    ...substantive.map((l) => `${l.speaker} — ${l.text}`),
  ];
  const twinAnswers = lines.filter((l) => l.isTwin && l.text.startsWith("From my notes")).length;
  if (twinAnswers) notes.push(`The twin answered ${twinAnswers} question${twinAnswers === 1 ? "" : "s"} from your notes.`);
  return { transcript: lines, notes, actionItems: extractActionItems(lines), decisions, flaggedForOwner };
}

export function summaryToMarkdown(title: string, s: MeetingSummary): string {
  const list = (xs: string[]) => (xs.length ? xs.map((x) => `- ${x}`).join("\n") : "- None");
  return [
    `# ${title}`,
    "## Notes",
    list(s.notes),
    "## Decisions",
    list(s.decisions),
    "## Action items",
    list(s.actionItems.map((a) => `${a.owner}: ${a.text}${a.due ? ` (due ${a.due})` : ""}`)),
    "## Needs your attention",
    list(s.flaggedForOwner),
    "## Transcript",
    s.transcript.map((l) => `**${l.speaker}${l.isTwin ? " (AI Twin)" : ""}:** ${l.text}`).join("\n\n"),
  ].join("\n\n");
}
