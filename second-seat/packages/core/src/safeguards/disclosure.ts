import type { Platform } from "../types";

/**
 * Disclosure (feature map section 4.4): the twin always labels itself and never pretends to be the
 * human. Every session must send the spoken intro and the recording notice before the twin says
 * anything else; `DisclosureTracker` enforces that order.
 */

export function badgeLabel(ownerName: string): string {
  return `AI Twin of ${ownerName}`;
}

export function platformLabel(platform: Platform): string {
  return { google_meet: "Google Meet", zoom: "Zoom", teams: "Microsoft Teams", demo: "Demo meeting" }[platform];
}

export function botDisplayName(ownerName: string): string {
  return `${ownerName} (AI Twin)`;
}

export function spokenIntro(ownerName: string, mode: "full" | "voice_only" | "listen_only" = "full"): string {
  if (mode === "listen_only") {
    return `Hi everyone, this is an AI twin of ${ownerName}. I'm here to listen and take notes only, and I won't speak again.`;
  }
  return `Hi everyone, I'm an AI twin of ${ownerName}, not ${ownerName} in person. I can answer from ${ownerName}'s notes and I'll pass anything else along. I can't agree to contracts or payments.`;
}

export function recordingNotice(ownerName: string): string {
  return `Recording and transcription notice: ${ownerName}'s AI twin is transcribing this meeting to produce notes for ${ownerName}. If you do not consent, say "stop recording" or ask the host to remove the twin.`;
}

export function chatNotice(ownerName: string): string {
  return `🤖 ${badgeLabel(ownerName)} has joined. This is an AI, not ${ownerName} in person. This meeting is being transcribed for ${ownerName}'s notes. Say "stop recording" to opt out. Output carries Content Credentials (C2PA).`;
}

/** Phrases that mean a participant withdrew recording consent. */
export function isRecordingObjection(text: string): boolean {
  return /\b(stop\s+recording|don'?t\s+record|do\s+not\s+record|i\s+(do\s+not|don'?t)\s+consent|no\s+recording|turn\s+off\s+(the\s+)?(recording|transcri\w+))\b/i.test(text);
}

export type DisclosureStep = "intro" | "recording_notice" | "chat_notice";

export class DisclosureTracker {
  private done = new Set<DisclosureStep>();

  mark(step: DisclosureStep): void {
    this.done.add(step);
  }

  has(step: DisclosureStep): boolean {
    return this.done.has(step);
  }

  /** The twin may only speak freely after the intro and recording notice were delivered. */
  get complete(): boolean {
    return this.done.has("intro") && this.done.has("recording_notice");
  }

  assertComplete(): void {
    if (!this.complete) throw new Error("Disclosure incomplete: the twin must introduce itself and give the recording notice before speaking.");
  }
}
