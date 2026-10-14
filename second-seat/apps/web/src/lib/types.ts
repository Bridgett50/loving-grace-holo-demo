import type {
  ActionItem,
  BillingOutcome,
  ContentCredential,
  MeetingSummary,
  Platform,
  PreflightResult,
  SessionLogEntry,
  SessionState,
  TranscriptLine,
} from "@second-seat/core";

/** Mirror of the bot service's SessionView (services/bot/src/session.ts). */
export interface OwnerQuestion {
  id: string;
  askedAt: string;
  askedBy: string;
  question: string;
  status: "pending" | "answered" | "follow_up";
  answer?: string;
  resolvedAt?: string;
}

export interface SessionView {
  id: string;
  createdAt: string;
  ownerId: string;
  twinId: string;
  twinName: string;
  badge: string;
  meeting: { platform: Platform; joinUrl?: string; title: string; eventId?: string };
  mode: "full" | "voice_only" | "listen_only";
  state: SessionState;
  endReason?: string;
  preflight?: PreflightResult;
  adapter?: string;
  adapterAttempts: Array<{ adapter: string; ok: boolean; error?: string }>;
  providers: { voice: string; voiceCloned: boolean; avatar: string; brain: string };
  takeover: boolean;
  transcriptionPaused: boolean;
  disclosure: { intro: boolean; recordingNotice: boolean; chatNotice: boolean };
  safeguards: {
    capMinutes: number;
    ratePerMinuteCents: number;
    reservedCents: number;
    noVideoTimeoutMs: number;
    silenceTimeoutMs: number;
    videoFrames: number;
    audioFrames: number;
    firstVideoAt?: number;
    firstAudioAt?: number;
    joinedAt?: number;
    liveAt?: number;
    endedAt?: number;
    liveSeconds: number;
    waitingForMediaMs: number;
    degradedToVoiceOnly: boolean;
    silenceRetriesUsed: number;
  };
  latency: { medianMs: number; medianWithoutAvatarMs: number; targetMs: number };
  billing?: BillingOutcome;
  settlement?: { chargedCents: number; refundedCents: number };
  transcript: TranscriptLine[];
  utterances: Array<{ id: number; at: string; text: string; kind: string }>;
  flagged: string[];
  questions: OwnerQuestion[];
  log: SessionLogEntry[];
  summary?: MeetingSummary & { actionItems: ActionItem[] };
  summaryMarkdown?: string;
  credential?: ContentCredential;
}

export interface Wallet {
  balanceCents: number;
  availableCents: number;
  ratePerMinuteCents: number;
  entries: Array<{ id: string; at: string; kind: string; amountCents: number; sessionId?: string; reason: string }>;
}

export const LIVE_STATES: SessionState[] = ["preflight", "joining", "waiting_for_media", "live", "voice_only", "listen_only"];

export function money(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}
