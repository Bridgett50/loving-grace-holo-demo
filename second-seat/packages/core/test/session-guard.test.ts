import { describe, expect, it } from "vitest";
import { SessionGuard, runPreflight, DEFAULT_GUARD_CONFIG, type PreflightInput } from "../src";

const ok: PreflightInput = {
  ownerVerified: true,
  consentActive: true,
  consentScopes: ["likeness_video", "voice_clone", "meeting_join", "recording"],
  meetingAuthorized: true,
  avatarReady: true,
  voiceReady: true,
  balanceCents: 10_000,
  roomName: "room-1",
};

const T0 = 1_000_000;

function liveGuard(cfg: Partial<typeof DEFAULT_GUARD_CONFIG> = {}) {
  const g = new SessionGuard({ ratePerMinuteCents: 20, capMinutes: 10, ...cfg });
  expect(g.preflight(ok, T0).ok).toBe(true);
  g.start("room-1", T0);
  g.joined(T0 + 1000);
  return g;
}

describe("pre-flight balance check", () => {
  it("requires capped cost plus buffer before connecting", () => {
    const cfg = { ...DEFAULT_GUARD_CONFIG, ratePerMinuteCents: 20, capMinutes: 10, balanceBufferPct: 10 };
    expect(runPreflight({ ...ok, balanceCents: 219 }, cfg).ok).toBe(false);
    expect(runPreflight({ ...ok, balanceCents: 220 }, cfg).ok).toBe(true);
  });

  it("blocks and never bills when the balance is short", () => {
    const g = new SessionGuard({ ratePerMinuteCents: 20, capMinutes: 10 });
    const r = g.preflight({ ...ok, balanceCents: 50 }, T0);
    expect(r.ok).toBe(false);
    expect(r.reasons.join(" ")).toMatch(/Insufficient balance/);
    expect(g.state).toBe("blocked");
    expect(g.snapshot.billing?.chargedCents).toBe(0);
  });

  it("blocks unverified owners, missing consent, missing room and unauthorized meetings", () => {
    const reasons = runPreflight(
      { ...ok, ownerVerified: false, consentActive: false, meetingAuthorized: false, roomName: "" },
      DEFAULT_GUARD_CONFIG,
    ).reasons.join(" ");
    expect(reasons).toMatch(/not verified/);
    expect(reasons).toMatch(/consent/i);
    expect(reasons).toMatch(/not been authorized/);
    expect(reasons).toMatch(/room/);
  });

  it("cannot start without a passing pre-flight", () => {
    const g = new SessionGuard();
    expect(() => g.start("room-1", T0)).toThrow(/pre-flight/);
    const blocked = new SessionGuard();
    blocked.preflight({ ...ok, ownerVerified: false }, T0);
    expect(() => blocked.start("room-1", T0)).toThrow();
  });

  it("listen-only sessions do not require voice or avatar", () => {
    const r = runPreflight({ ...ok, avatarReady: false, voiceReady: false, consentScopes: ["meeting_join"] }, { ...DEFAULT_GUARD_CONFIG, mode: "listen_only" });
    expect(r.ok).toBe(true);
  });
});

describe("ready means real", () => {
  it("is not live after joining, nor with only video, nor with only audio", () => {
    const g = liveGuard();
    expect(g.state).toBe("waiting_for_media");
    g.videoFrame(T0 + 2000);
    expect(g.isLive).toBe(false);
    const g2 = liveGuard();
    g2.audioFrame(T0 + 2000);
    expect(g2.isLive).toBe(false);
  });

  it("goes live only once the first video AND first audio frames arrive", () => {
    const g = liveGuard();
    g.videoFrame(T0 + 2000);
    g.audioFrame(T0 + 2500);
    expect(g.state).toBe("live");
    expect(g.snapshot.liveAt).toBe(T0 + 2500);
  });
});

describe("no-video timeout (20 s)", () => {
  it("stops, marks failed and refunds the full reservation when no video arrives within 20 s", () => {
    const g = liveGuard();
    g.audioFrame(T0 + 2000);
    expect(g.tick(T0 + 1000 + 19_999)).toEqual([]);
    expect(g.tick(T0 + 1000 + 20_000)).toEqual(["no_video_timeout"]);
    expect(g.state).toBe("failed");
    const b = g.snapshot.billing!;
    expect(b.chargedCents).toBe(0);
    expect(b.refundedCents).toBe(g.reservation);
    expect(b.reason).toBe("no_video_timeout");
  });

  it("stops when video is lost for 20 s mid-session", () => {
    const g = liveGuard();
    g.videoFrame(T0 + 2000);
    g.audioFrame(T0 + 2000);
    g.twinSpoke(T0 + 15_000);
    g.twinSpoke(T0 + 21_000);
    expect(g.tick(T0 + 22_000)).toEqual(["video_lost"]);
    expect(g.state).toBe("failed");
    expect(g.snapshot.billing!.chargedCents).toBe(0);
  });

  it("degrades to voice-only instead when the fallback is enabled and audio works", () => {
    const g = liveGuard({ voiceOnlyFallback: true });
    g.audioFrame(T0 + 2000);
    expect(g.tick(T0 + 21_000)).toEqual(["degraded_voice_only"]);
    expect(g.state).toBe("voice_only");
    expect(g.snapshot.degradedToVoiceOnly).toBe(true);
  });

  it("still fails with the fallback enabled when there is no audio either", () => {
    const g = liveGuard({ voiceOnlyFallback: true });
    expect(g.tick(T0 + 21_000)).toEqual(["no_video_timeout"]);
    expect(g.state).toBe("failed");
  });
});

describe("silence watchdog", () => {
  it("retries once after 15 s of avatar silence, then stops and refunds", () => {
    const g = liveGuard();
    g.videoFrame(T0 + 2000);
    g.audioFrame(T0 + 2000);
    g.videoFrame(T0 + 16_000);
    expect(g.tick(T0 + 17_000)).toEqual(["silence_retry"]);
    expect(g.state).toBe("live");
    g.videoFrame(T0 + 31_000);
    expect(g.tick(T0 + 32_000)).toEqual(["avatar_silent"]);
    expect(g.state).toBe("failed");
    expect(g.snapshot.billing!.refundedCents).toBe(g.reservation);
  });

  it("a listening twin with a healthy audio track is not stopped", () => {
    const g = liveGuard();
    for (let t = 2_000; t <= 120_000; t += 1_000) {
      g.videoFrame(T0 + t);
      g.audioFrame(T0 + t);
      expect(g.tick(T0 + t)).toEqual([]);
    }
    expect(g.state).toBe("live");
  });

  it("latency fallback drops to voice-only and stays billable", () => {
    const g = liveGuard();
    g.videoFrame(T0 + 2000);
    g.audioFrame(T0 + 2000);
    g.fallbackToVoiceOnly(T0 + 3000, "latency");
    expect(g.state).toBe("voice_only");
    g.audioFrame(T0 + 62_000);
    expect(g.end(T0 + 62_000, "owner_ended").chargedCents).toBe(20);
  });

  it("claimed speech without audio frames does not keep a dead avatar alive", () => {
    const g = liveGuard();
    g.videoFrame(T0 + 2000);
    g.audioFrame(T0 + 2000);
    const fired: string[] = [];
    for (let t = 5_000; t <= 40_000; t += 5_000) {
      g.videoFrame(T0 + t);
      g.twinSpoke(T0 + t);
      fired.push(...g.tick(T0 + t + 1));
    }
    expect(fired).toEqual(["silence_retry", "avatar_silent"]);
    expect(g.snapshot.billing!.chargedCents).toBe(0);
  });
});

describe("minute cap", () => {
  it("ends the session at the cap and never charges more than the reservation", () => {
    const g = liveGuard({ capMinutes: 2, silenceTimeoutMs: 10 * 60_000 });
    g.videoFrame(T0 + 2000);
    g.audioFrame(T0 + 2000);
    g.videoFrame(T0 + 2000 + 119_000);
    expect(g.tick(T0 + 2000 + 119_000)).toEqual([]);
    g.videoFrame(T0 + 2000 + 120_000);
    expect(g.tick(T0 + 2000 + 120_000)).toEqual(["cap_reached"]);
    expect(g.state).toBe("ended");
    const b = g.snapshot.billing!;
    expect(b.chargedCents).toBe(40);
    expect(b.chargedCents).toBeLessThanOrEqual(b.reservedCents);
  });
});

describe("billing and auto-refund", () => {
  it("bills only live time, rounding up to the next cent", () => {
    const g = liveGuard();
    g.videoFrame(T0 + 2000);
    g.audioFrame(T0 + 2000);
    const b = g.end(T0 + 2000 + 90_000, "owner_ended");
    expect(b.liveSeconds).toBe(90);
    expect(b.chargedCents).toBe(30);
    expect(b.refundedCents).toBe(g.reservation - 30);
  });

  it("does not bill sessions shorter than 30 s", () => {
    const g = liveGuard();
    g.videoFrame(T0 + 2000);
    g.audioFrame(T0 + 2000);
    const b = g.end(T0 + 2000 + 29_000, "owner_ended");
    expect(b.billed).toBe(false);
    expect(b.chargedCents).toBe(0);
    expect(g.state).toBe("refunded");
  });

  it("time spent joining and waiting for media is never billed", () => {
    const g = liveGuard();
    g.videoFrame(T0 + 15_000);
    g.audioFrame(T0 + 15_000);
    const b = g.end(T0 + 15_000 + 60_000, "meeting_ended");
    expect(b.liveSeconds).toBe(60);
  });

  it("join failures are refunded in full", () => {
    const g = new SessionGuard();
    g.preflight(ok, T0);
    g.start("room-1", T0);
    const b = g.fail(T0 + 5000, "join_failed");
    expect(b.chargedCents).toBe(0);
    expect(b.refundedCents).toBe(g.reservation);
  });

  it("ending twice returns the same outcome and keeps a session log", () => {
    const g = liveGuard();
    g.videoFrame(T0 + 2000);
    g.audioFrame(T0 + 2000);
    const a = g.end(T0 + 100_000, "owner_ended");
    const b = g.end(T0 + 900_000, "owner_ended");
    expect(b).toEqual(a);
    expect(g.entries.map((e) => e.event)).toEqual(["preflight_ok", "joining", "waiting_for_media", "first_video_frame", "first_audio_frame", "live", "ended"]);
  });
});
