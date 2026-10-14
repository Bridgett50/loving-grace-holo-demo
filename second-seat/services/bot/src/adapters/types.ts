import type { Platform } from "@second-seat/core";
import type { SpeechResult } from "../providers";

export interface JoinOptions {
  sessionId: string;
  joinUrl?: string;
  meetingTitle: string;
  /** Shown as the participant name, always includes "(AI Twin)". */
  displayName: string;
  ownerName: string;
  backgroundCss: string;
  /** Data URL or remote URL of an uploaded custom background. */
  backgroundImageUrl?: string;
  wantVideo: boolean;
}

export interface AdapterEvents {
  onSpeech(speaker: string, text: string): void;
  onEnded(reason: "meeting_ended" | "removed" | "error", detail?: string): void;
  onParticipants?(count: number): void;
}

export interface AdapterCapabilities {
  video: boolean;
  voice: boolean;
  chat: boolean;
  transcript: boolean;
}

export interface MeetingAdapter {
  readonly name: string;
  readonly platform: Platform;
  readonly capabilities: AdapterCapabilities;
  /** Resolves once the bot has been admitted to the meeting. Rejects if it cannot join. */
  join(opts: JoinOptions, events: AdapterEvents): Promise<void>;
  speak(text: string, speech: SpeechResult): Promise<void>;
  postChat(text: string): Promise<void>;
  leave(): Promise<void>;
}

export class AdapterUnavailableError extends Error {
  constructor(adapter: string, public readonly missing: string[]) {
    super(`${adapter} is not configured. Missing: ${missing.join(", ")}`);
  }
}
