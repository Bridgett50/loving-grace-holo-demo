/**
 * End-to-end latency budget for a conversational turn (feature map 4.11: under ~1 s). Stages are
 * measured from end of the remote speaker's utterance to first twin audio/video. When the rolling
 * median goes over budget and dropping the avatar stage would bring it back under, the session
 * should fall back to voice-only.
 */

export interface TurnTiming {
  sttMs: number;
  llmMs: number;
  ttsMs: number;
  avatarMs: number;
  networkMs?: number;
}

export const LATENCY_TARGET_MS = 1000;

export const STAGE_BUDGET_MS: Required<TurnTiming> = {
  sttMs: 200,
  llmMs: 350,
  ttsMs: 200,
  avatarMs: 150,
  networkMs: 100,
};

export function totalMs(t: TurnTiming, includeAvatar = true): number {
  return t.sttMs + t.llmMs + t.ttsMs + (includeAvatar ? t.avatarMs : 0) + (t.networkMs ?? 0);
}

function median(xs: number[]): number {
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

export type LatencyDecision = "ok" | "fallback_voice_only" | "over_budget";

export class LatencyMonitor {
  private turns: TurnTiming[] = [];

  constructor(
    private readonly targetMs = LATENCY_TARGET_MS,
    private readonly window = 5,
    private readonly minTurns = 3,
  ) {}

  record(t: TurnTiming): void {
    this.turns.push(t);
    if (this.turns.length > this.window) this.turns.shift();
  }

  get medianMs(): number {
    return this.turns.length ? median(this.turns.map((t) => totalMs(t))) : 0;
  }

  get medianWithoutAvatarMs(): number {
    return this.turns.length ? median(this.turns.map((t) => totalMs(t, false))) : 0;
  }

  decide(): LatencyDecision {
    if (this.turns.length < this.minTurns) return "ok";
    if (this.medianMs <= this.targetMs) return "ok";
    if (this.medianWithoutAvatarMs <= this.targetMs) return "fallback_voice_only";
    return "over_budget";
  }
}
