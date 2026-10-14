import type { AdapterEvents, JoinOptions, MeetingAdapter } from "./types";

interface ScriptLine {
  afterMs: number;
  speaker: string;
  text: string;
}

function script(first: string): ScriptLine[] {
  return [
    { afterMs: 4_000, speaker: "Maya (host)", text: "Thanks for joining, everyone. Quick check-in on the Holo Lab pilot." },
    { afterMs: 7_000, speaker: "Maya (host)", text: `${first}, where are we on the kiosk launch timeline?` },
    { afterMs: 9_000, speaker: "Jordan", text: "I'll send the updated hardware budget by Friday." },
    { afterMs: 8_000, speaker: "Pat (vendor)", text: `${first}, can you agree to the revised contract terms today so we can lock the price?` },
    { afterMs: 9_000, speaker: "Priya", text: "Can you share the voice sample checklist with the team?" },
    { afterMs: 8_000, speaker: "Maya (host)", text: `Twin, who is leading the voice pipeline work?` },
    { afterMs: 8_000, speaker: "Pat (vendor)", text: `What does ${first} think about hiring two more engineers in Q1?` },
    { afterMs: 6_000, speaker: "Maya (host)", text: "No rush, let's keep going while we wait on that." },
    { afterMs: 20_000, speaker: "Maya (host)", text: "We decided to move the design review to next Tuesday." },
    { afterMs: 9_000, speaker: "Maya (host)", text: "That's everything for today. Thanks, all." },
  ];
}

/**
 * Simulated meeting used in demo mode: scripted participants, plus anything typed into the
 * "speak as a participant" box. Ends a few seconds after the host's closing line.
 */
export class DemoMeetingAdapter implements MeetingAdapter {
  readonly name = "demo-meeting";
  readonly platform = "demo" as const;
  readonly capabilities = { video: true, voice: true, chat: true, transcript: true };
  readonly chat: string[] = [];
  private timers: ReturnType<typeof setTimeout>[] = [];
  private events?: AdapterEvents;

  constructor(private readonly opts: { joinFails?: boolean; scripted?: boolean } = {}) {}

  async join(opts: JoinOptions, events: AdapterEvents): Promise<void> {
    this.events = events;
    await new Promise((r) => setTimeout(r, 1_200));
    if (this.opts.joinFails) throw new Error("Host did not admit the twin (simulated).");
    events.onParticipants?.(5);
    if (this.opts.scripted === false) return;
    const first = opts.ownerName.split(" ")[0];
    let at = 0;
    for (const line of script(first)) {
      at += line.afterMs;
      this.timers.push(setTimeout(() => events.onSpeech(line.speaker, line.text), at));
    }
    this.timers.push(setTimeout(() => events.onEnded("meeting_ended"), at + 6_000));
  }

  /** Lets the person testing the demo talk to the twin as a meeting participant. */
  injectSpeech(speaker: string, text: string) {
    this.events?.onSpeech(speaker, text);
  }

  async speak(): Promise<void> {}

  async postChat(text: string): Promise<void> {
    this.chat.push(text);
  }

  async leave(): Promise<void> {
    this.timers.forEach(clearTimeout);
    this.timers = [];
  }
}
