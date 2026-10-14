import type { ConsentScope, SessionLogEntry, SessionState } from "../types";

/**
 * Session safeguards, derived from docs/HOLO_LAB_ONE_TAP_PRESENCE_SPEC.md ("Failure safeguards")
 * and the Pika lesson in docs/MEETING_TWIN_REA_FEATURE_MAP.md:
 *
 *  - Balance check BEFORE connecting (capped cost + buffer must be covered).
 *  - "Ready means real": a session is live only after the first video frame AND first audio frame.
 *  - No-video timeout: if no video within 20 s, auto-stop, release workers, mark failed (or degrade to
 *    voice-only when the owner has opted in to the fallback).
 *  - Silence watchdog: avatar connected but silent for 15 s -> one retry, then stop and refund.
 *  - Hard per-session minute cap.
 *  - Auto-refund: failed or under-30-second sessions are never billed.
 */

export type MediaMode = "full" | "voice_only" | "listen_only";

export interface SessionGuardConfig {
  ratePerMinuteCents: number;
  capMinutes: number;
  /** Extra headroom required on top of the capped cost, in percent. */
  balanceBufferPct: number;
  noVideoTimeoutMs: number;
  silenceTimeoutMs: number;
  silenceRetries: number;
  minBillableSeconds: number;
  /** Requested media mode for this session. */
  mode: MediaMode;
  /** When true, a video failure degrades the session to voice-only instead of stopping it. */
  voiceOnlyFallback: boolean;
}

export const DEFAULT_GUARD_CONFIG: SessionGuardConfig = {
  ratePerMinuteCents: 25,
  capMinutes: 30,
  balanceBufferPct: 10,
  noVideoTimeoutMs: 20_000,
  silenceTimeoutMs: 15_000,
  silenceRetries: 1,
  minBillableSeconds: 30,
  mode: "full",
  voiceOnlyFallback: false,
};

export interface PreflightInput {
  ownerVerified: boolean;
  consentActive: boolean;
  consentScopes: ConsentScope[];
  meetingAuthorized: boolean;
  avatarReady: boolean;
  voiceReady: boolean;
  balanceCents: number;
  roomName?: string;
}

export interface PreflightResult {
  ok: boolean;
  reasons: string[];
  estimatedCostCents: number;
  requiredCents: number;
}

export type GuardEndReason =
  | "owner_ended"
  | "owner_takeover"
  | "meeting_ended"
  | "cap_reached"
  | "no_video_timeout"
  | "video_lost"
  | "avatar_silent"
  | "join_failed"
  | "preflight_blocked"
  | "consent_revoked"
  | "latency"
  | "kill_switch";

export interface BillingOutcome {
  liveSeconds: number;
  reservedCents: number;
  chargedCents: number;
  refundedCents: number;
  billed: boolean;
  reason: string;
}

export interface GuardSnapshot {
  state: SessionState;
  roomName?: string;
  startedAt?: number;
  joinedAt?: number;
  liveAt?: number;
  endedAt?: number;
  firstVideoAt?: number;
  firstAudioAt?: number;
  lastVideoAt?: number;
  lastTwinSpeechAt?: number;
  videoFrames: number;
  audioFrames: number;
  silenceRetriesUsed: number;
  endReason?: GuardEndReason;
  billing?: BillingOutcome;
  degradedToVoiceOnly: boolean;
}

/** Estimated cost of a full-cap session plus buffer; this is what the balance must cover. */
export function requiredBalanceCents(config: Pick<SessionGuardConfig, "ratePerMinuteCents" | "capMinutes" | "balanceBufferPct">): {
  estimatedCostCents: number;
  requiredCents: number;
} {
  const estimatedCostCents = config.ratePerMinuteCents * config.capMinutes;
  const requiredCents = Math.ceil((estimatedCostCents * (100 + config.balanceBufferPct)) / 100);
  return { estimatedCostCents, requiredCents };
}

export function runPreflight(input: PreflightInput, config: SessionGuardConfig): PreflightResult {
  const reasons: string[] = [];
  const { estimatedCostCents, requiredCents } = requiredBalanceCents(config);

  if (!input.ownerVerified) reasons.push("Owner identity is not verified (ID + liveness check required).");
  if (!input.consentActive) reasons.push("No active consent on file in the consent vault.");
  if (!input.consentScopes.includes("meeting_join")) reasons.push("Consent does not include joining meetings.");
  if (config.mode !== "listen_only") {
    if (!input.consentScopes.includes("voice_clone")) reasons.push("Consent does not include using the cloned voice.");
    if (!input.voiceReady) reasons.push("Voice model is not ready.");
  }
  if (config.mode === "full") {
    if (!input.consentScopes.includes("likeness_video")) reasons.push("Consent does not include using the owner's likeness on video.");
    if (!input.avatarReady) reasons.push("Avatar model is not ready.");
  }
  if (!input.meetingAuthorized) reasons.push("This meeting has not been authorized by the owner.");
  if (!input.roomName || input.roomName.trim().length === 0) reasons.push("No media room name was created.");
  if (input.balanceCents < requiredCents) {
    reasons.push(
      `Insufficient balance: need ${(requiredCents / 100).toFixed(2)} (cap ${config.capMinutes} min x ${(config.ratePerMinuteCents / 100).toFixed(2)}/min + ${config.balanceBufferPct}% buffer), have ${(input.balanceCents / 100).toFixed(2)}.`,
    );
  }

  return { ok: reasons.length === 0, reasons, estimatedCostCents, requiredCents };
}

/**
 * Deterministic state machine. All time is injected (milliseconds) so it is fully testable and
 * can be driven by a real clock in the bot service.
 */
export class SessionGuard {
  readonly config: SessionGuardConfig;
  private snap: GuardSnapshot;
  private readonly log: SessionLogEntry[] = [];
  private silenceDeadline?: number;
  private preflightPassed = false;
  private readonly reservedCents: number;

  constructor(config: Partial<SessionGuardConfig> = {}) {
    this.config = { ...DEFAULT_GUARD_CONFIG, ...config };
    this.reservedCents = this.config.ratePerMinuteCents * this.config.capMinutes;
    this.snap = {
      state: "preflight",
      videoFrames: 0,
      audioFrames: 0,
      silenceRetriesUsed: 0,
      degradedToVoiceOnly: false,
    };
  }

  get state(): SessionState {
    return this.snap.state;
  }

  get snapshot(): Readonly<GuardSnapshot> {
    return { ...this.snap };
  }

  get entries(): readonly SessionLogEntry[] {
    return this.log;
  }

  get isLive(): boolean {
    return this.snap.state === "live" || this.snap.state === "voice_only" || this.snap.state === "listen_only";
  }

  get isTerminal(): boolean {
    return this.snap.state === "ended" || this.snap.state === "failed" || this.snap.state === "refunded" || this.snap.state === "blocked";
  }

  /** Amount reserved against the owner's balance when the session starts. */
  get reservation(): number {
    return this.reservedCents;
  }

  private record(now: number, level: SessionLogEntry["level"], event: string, detail?: Record<string, unknown>) {
    this.log.push({ at: new Date(now).toISOString(), level, event, detail });
  }

  preflight(input: PreflightInput, now: number): PreflightResult {
    const result = runPreflight(input, this.config);
    if (!result.ok) {
      this.snap.state = "blocked";
      this.snap.endReason = "preflight_blocked";
      this.snap.endedAt = now;
      this.record(now, "warn", "preflight_blocked", { reasons: result.reasons });
      this.snap.billing = {
        liveSeconds: 0,
        reservedCents: 0,
        chargedCents: 0,
        refundedCents: 0,
        billed: false,
        reason: "preflight_blocked",
      };
    } else {
      this.preflightPassed = true;
      this.record(now, "info", "preflight_ok", { requiredCents: result.requiredCents });
    }
    return result;
  }

  /** Called once pre-flight passed and the bot begins connecting. Reserves the capped cost. */
  start(roomName: string, now: number): void {
    this.assertState(["preflight"], "start");
    if (!this.preflightPassed) throw new Error("Cannot start a session before pre-flight has passed");
    this.snap.state = "joining";
    this.snap.roomName = roomName;
    this.snap.startedAt = now;
    this.record(now, "info", "joining", { roomName, reservedCents: this.reservedCents });
  }

  /**
   * Lower the media mode while still joining, e.g. when the platform fallback cannot publish video.
   * Only downgrades are allowed (full -> voice_only -> listen_only).
   */
  downgradeMode(mode: MediaMode, now: number): void {
    this.assertState(["joining"], "downgradeMode");
    const order: MediaMode[] = ["full", "voice_only", "listen_only"];
    if (order.indexOf(mode) <= order.indexOf(this.config.mode)) return;
    this.config.mode = mode;
    this.record(now, "warn", "mode_downgraded", { mode });
  }

  /** The meeting platform admitted the bot. Media must now arrive within the no-video timeout. */
  joined(now: number): void {
    this.assertState(["joining"], "joined");
    this.snap.joinedAt = now;
    if (this.config.mode === "listen_only") {
      this.snap.state = "listen_only";
      this.snap.liveAt = now;
      this.record(now, "info", "live", { mode: "listen_only" });
      return;
    }
    this.snap.state = "waiting_for_media";
    this.record(now, "info", "waiting_for_media", { deadlineMs: this.config.noVideoTimeoutMs });
  }

  joinFailed(now: number, detail?: string): void {
    this.assertState(["joining", "waiting_for_media"], "joinFailed");
    this.fail(now, "join_failed", { detail });
  }

  videoFrame(now: number): void {
    if (this.isTerminal) return;
    this.snap.videoFrames += 1;
    this.snap.lastVideoAt = now;
    if (this.snap.firstVideoAt === undefined) {
      this.snap.firstVideoAt = now;
      this.record(now, "info", "first_video_frame");
    }
    this.maybeGoLive(now);
  }

  audioFrame(now: number): void {
    if (this.isTerminal) return;
    this.snap.audioFrames += 1;
    if (this.snap.firstAudioAt === undefined) {
      this.snap.firstAudioAt = now;
      this.record(now, "info", "first_audio_frame");
    }
    // A healthy avatar track keeps sending audio frames (including silence frames) even while the
    // twin is only listening, so the watchdog fires only when the track itself goes dead.
    if (this.snap.state === "live" || this.snap.state === "voice_only") {
      this.silenceDeadline = now + this.config.silenceTimeoutMs;
    }
    this.maybeGoLive(now);
  }

  /** Drop the avatar video and continue with voice (latency fallback or owner choice). */
  fallbackToVoiceOnly(now: number, cause: GuardEndReason): void {
    if (this.snap.state !== "live") return;
    this.degradeToVoiceOnly(now, cause);
  }

  /**
   * The twin produced an utterance. Recorded for the session log only: it does not reset the silence
   * watchdog, because only audio frames actually arriving from the avatar track prove it is alive.
   */
  twinSpoke(now: number): void {
    if (!this.isLive) return;
    this.snap.lastTwinSpeechAt = now;
  }

  private maybeGoLive(now: number) {
    if (this.snap.state !== "waiting_for_media") return;
    const haveAudio = this.snap.firstAudioAt !== undefined;
    const haveVideo = this.snap.firstVideoAt !== undefined;
    if (this.config.mode === "voice_only" && haveAudio) {
      this.goLive(now, "voice_only");
    } else if (this.config.mode === "full" && haveAudio && haveVideo) {
      this.goLive(now, "live");
    }
  }

  private goLive(now: number, state: "live" | "voice_only") {
    this.snap.state = state;
    this.snap.liveAt = now;
    this.silenceDeadline = now + this.config.silenceTimeoutMs;
    this.record(now, "info", "live", { mode: state, roomName: this.snap.roomName });
  }

  /**
   * Evaluate watchdogs. Returns the list of events that fired so the orchestrator can react
   * (e.g. ask the avatar worker to retry, or tear everything down).
   */
  tick(now: number): string[] {
    const fired: string[] = [];
    if (this.isTerminal) return fired;

    if (this.snap.state === "waiting_for_media" && this.snap.joinedAt !== undefined) {
      const elapsed = now - this.snap.joinedAt;
      if (elapsed >= this.config.noVideoTimeoutMs) {
        const haveAudio = this.snap.firstAudioAt !== undefined;
        if (this.config.mode === "full" && this.config.voiceOnlyFallback && haveAudio) {
          this.degradeToVoiceOnly(now, "no_video_timeout");
          fired.push("degraded_voice_only");
        } else {
          this.fail(now, "no_video_timeout", { elapsedMs: elapsed, videoFrames: this.snap.videoFrames, audioFrames: this.snap.audioFrames });
          fired.push("no_video_timeout");
        }
        return fired;
      }
    }

    if (this.snap.state === "live" && this.snap.lastVideoAt !== undefined) {
      const sinceVideo = now - this.snap.lastVideoAt;
      if (sinceVideo >= this.config.noVideoTimeoutMs) {
        if (this.config.voiceOnlyFallback) {
          this.degradeToVoiceOnly(now, "video_lost");
          fired.push("degraded_voice_only");
        } else {
          this.fail(now, "video_lost", { sinceVideoMs: sinceVideo });
          fired.push("video_lost");
          return fired;
        }
      }
    }

    if ((this.snap.state === "live" || this.snap.state === "voice_only") && this.silenceDeadline !== undefined && now >= this.silenceDeadline) {
      if (this.snap.silenceRetriesUsed < this.config.silenceRetries) {
        this.snap.silenceRetriesUsed += 1;
        this.silenceDeadline = now + this.config.silenceTimeoutMs;
        this.record(now, "warn", "silence_retry", { attempt: this.snap.silenceRetriesUsed });
        fired.push("silence_retry");
      } else {
        this.fail(now, "avatar_silent", { silentForMs: this.config.silenceTimeoutMs * (this.snap.silenceRetriesUsed + 1) });
        fired.push("avatar_silent");
        return fired;
      }
    }

    if (this.isLive && this.snap.liveAt !== undefined) {
      const liveMs = now - this.snap.liveAt;
      if (liveMs >= this.config.capMinutes * 60_000) {
        this.end(now, "cap_reached");
        fired.push("cap_reached");
      }
    }

    return fired;
  }

  private degradeToVoiceOnly(now: number, cause: GuardEndReason) {
    this.snap.state = "voice_only";
    this.snap.degradedToVoiceOnly = true;
    if (this.snap.liveAt === undefined) this.snap.liveAt = now;
    this.silenceDeadline = now + this.config.silenceTimeoutMs;
    this.record(now, "warn", "degraded_voice_only", { cause });
  }

  /** Normal end (owner ended, meeting ended, takeover, cap). Bills only real live time. */
  end(now: number, reason: GuardEndReason): BillingOutcome {
    if (this.isTerminal && this.snap.billing) return this.snap.billing;
    this.snap.endReason = reason;
    this.snap.endedAt = now;
    const liveSeconds = this.liveSeconds(now);
    const billable = liveSeconds >= this.config.minBillableSeconds;
    const chargedCents = billable ? Math.min(this.reservedCents, Math.ceil((liveSeconds / 60) * this.config.ratePerMinuteCents)) : 0;
    const refundedCents = this.reservedCents - chargedCents;
    this.snap.billing = {
      liveSeconds,
      reservedCents: this.reservedCents,
      chargedCents,
      refundedCents,
      billed: billable,
      reason: billable ? reason : `${reason}:under_${this.config.minBillableSeconds}s_not_billed`,
    };
    this.snap.state = billable ? "ended" : "refunded";
    this.record(now, "info", "ended", { endReason: reason, ...this.snap.billing });
    return this.snap.billing;
  }

  /** Failure path: workers are released and the full reservation is refunded. */
  fail(now: number, reason: GuardEndReason, detail?: Record<string, unknown>): BillingOutcome {
    if (this.isTerminal && this.snap.billing) return this.snap.billing;
    this.snap.endReason = reason;
    this.snap.endedAt = now;
    const liveSeconds = this.liveSeconds(now);
    this.snap.billing = {
      liveSeconds,
      reservedCents: this.reservedCents,
      chargedCents: 0,
      refundedCents: this.reservedCents,
      billed: false,
      reason,
    };
    this.snap.state = "failed";
    this.record(now, "error", "failed", { reason, ...detail, refundedCents: this.reservedCents });
    return this.snap.billing;
  }

  private liveSeconds(now: number): number {
    if (this.snap.liveAt === undefined) return 0;
    return Math.max(0, Math.floor((now - this.snap.liveAt) / 1000));
  }

  private assertState(allowed: SessionState[], action: string) {
    if (!allowed.includes(this.snap.state)) {
      throw new Error(`Cannot ${action} from state "${this.snap.state}"`);
    }
  }
}
