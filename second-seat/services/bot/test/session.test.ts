import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { verifyContentCredential, extractTextWatermark, type ConsentRecord } from "@second-seat/core";
import { config } from "../src/config";
import type { StartSessionRequest } from "../src/session";
import { BotStore } from "../src/store";
import { DemoMeetingAdapter } from "../src/adapters/demo";

const consent: ConsentRecord = {
  id: "c1",
  twinId: "twin_1",
  ownerId: "owner_1",
  signerName: "Grace Lee",
  scopes: ["likeness_video", "voice_clone", "meeting_join", "recording", "knowledge_use"],
  textHash: "h",
  signedAt: new Date().toISOString(),
};

function request(over: Partial<StartSessionRequest> = {}): StartSessionRequest {
  return {
    actorId: "owner_1",
    twin: {
      id: "twin_1",
      ownerId: "owner_1",
      displayName: "Grace Lee",
      look: "realistic",
      persona: { tone: "warm", role: "Founder", facts: [], restrictedTopics: ["medical"], deferralPhrase: "I don't have that in my notes; I'll check with Grace." },
      backgroundCss: "#000",
      voiceModelReady: true,
      avatarModelReady: true,
    },
    verification: { status: "verified", provider: "demo", livenessChallenges: ["turn_left", "blink"] },
    consent,
    knowledge: [
      { id: "k1", twinId: "twin_1", title: "Holo Lab plan", content: "The kiosk launch timeline is March in Atlanta.\n\nPriya leads the voice pipeline work.", source: "upload", createdAt: "" },
    ],
    meeting: { platform: "demo", title: "Holo Lab pilot check-in" },
    meetingAuthorized: true,
    mode: "full",
    voiceOnlyFallback: false,
    capMinutes: 10,
    ...over,
  };
}

let store: BotStore;
beforeEach(() => {
  vi.useFakeTimers();
  store = new BotStore(".data-test", false);
});
afterEach(() => vi.useRealTimers());

const balance = () => store.wallet("owner_1").balanceCents;

describe("pre-flight", () => {
  it("blocks when the balance cannot cover the capped session, counting open reservations", async () => {
    const before = balance();
    const first = await store.start(request({ capMinutes: 60 }));
    await vi.advanceTimersByTimeAsync(10);
    expect(first.view().state).not.toBe("blocked");
    const second = await store.start(request({ capMinutes: 30 }));
    await vi.advanceTimersByTimeAsync(10);
    expect(second.view().state).toBe("blocked");
    expect(second.view().preflight?.reasons.join(" ")).toMatch(/Insufficient balance/);
    expect(store.wallet("owner_1").entries.filter((e) => e.kind === "reserve" && e.sessionId === second.id)).toEqual([]);
    first.end("owner_ended");
    expect(balance()).toBe(before);
  });

  it("only the verified owner can run the twin", async () => {
    const r1 = await store.start(request({ actorId: "someone_else" }));
    const r2 = await store.start(request({ verification: { status: "pending", provider: "demo" } }));
    const r3 = await store.start(request({ consent: { ...consent, revokedAt: new Date().toISOString() } }));
    await vi.advanceTimersByTimeAsync(10);
    for (const r of [r1, r2, r3]) expect(r.view().state).toBe("blocked");
    expect(r1.view().preflight?.reasons[0]).toMatch(/owner/);
  });
});

describe("full demo meeting", () => {
  it("discloses first, refuses contracts, answers from notes, then posts notes and bills only live time", async () => {
    const before = balance();
    const r = await store.start(request());
    await vi.advanceTimersByTimeAsync(2_500);
    expect(r.view().state).toBe("live");
    const events = r.view().log.map((e) => e.event);
    expect(events.indexOf("waiting_for_media")).toBeLessThan(events.indexOf("live"));
    expect(events.indexOf("first_video_frame")).toBeLessThan(events.indexOf("live"));
    expect(events.indexOf("first_audio_frame")).toBeLessThan(events.indexOf("live"));

    await vi.advanceTimersByTimeAsync(3_000);
    const v1 = r.view();
    expect(v1.utterances[0].text).toMatch(/AI twin of Grace Lee, not Grace Lee in person/);
    expect(v1.utterances[1].text).toMatch(/Recording and transcription notice/);
    expect(v1.disclosure).toEqual({ intro: true, recordingNotice: true, chatNotice: true });
    expect((r.adapter as DemoMeetingAdapter).chat[0]).toMatch(/AI Twin of Grace Lee/);

    await vi.advanceTimersByTimeAsync(90_000);
    vi.useRealTimers();
    await new Promise((res) => setTimeout(res, 100));
    const v = store.get(r.id)!;
    expect(v.state).toBe("ended");
    expect(v.endReason).toBe("meeting_ended");

    const twinLines = v.transcript.filter((l) => l.isTwin).map((l) => l.text);
    expect(twinLines.some((t) => /March/.test(t))).toBe(true);
    expect(twinLines.some((t) => /can't agree to contracts, payments/.test(t))).toBe(true);
    expect(twinLines.some((t) => /I agree|deal/i.test(t) && !/can't agree/.test(t))).toBe(false);
    expect(v.flagged.some((f) => /binding commitment/.test(f))).toBe(true);

    expect(v.summary?.actionItems.some((a) => a.owner === "Jordan" && a.due === "Friday")).toBe(true);
    expect(v.summary?.decisions.length).toBeGreaterThan(0);
    expect(v.credential).toBeDefined();
    expect(await verifyContentCredential(v.credential!, v.summaryMarkdown!, config.credentialSecret)).toEqual({ valid: true });
    expect(extractTextWatermark(v.summaryMarkdown!)).toBe(r.id);

    expect(v.billing!.billed).toBe(true);
    expect(v.billing!.chargedCents).toBeGreaterThan(0);
    expect(v.billing!.chargedCents).toBeLessThan(v.billing!.reservedCents);
    expect(balance()).toBe(before - v.billing!.chargedCents);
  });
});

describe("failure safeguards refund automatically", () => {
  it("no video within 20 s: stops, fails, refunds in full", async () => {
    const before = balance();
    const r = await store.start(request({ demoFault: "no_video" }));
    await vi.advanceTimersByTimeAsync(1_200 + 19_000);
    expect(r.view().state).toBe("waiting_for_media");
    await vi.advanceTimersByTimeAsync(1_500);
    const v = store.get(r.id)!;
    expect(v.state).toBe("failed");
    expect(v.endReason).toBe("no_video_timeout");
    expect(v.settlement).toEqual({ chargedCents: 0, refundedCents: v.billing!.reservedCents });
    expect(balance()).toBe(before);
    expect(v.utterances.length).toBe(0);
  });

  it("no video but voice-only fallback enabled: keeps going on voice", async () => {
    const r = await store.start(request({ demoFault: "no_video", voiceOnlyFallback: true }));
    await vi.advanceTimersByTimeAsync(23_000);
    expect(r.view().state).toBe("voice_only");
    expect(r.view().safeguards.degradedToVoiceOnly).toBe(true);
    r.end("owner_ended");
  });

  it("avatar goes silent: one retry, then stop and refund", async () => {
    const before = balance();
    const r = await store.start(request({ demoFault: "avatar_silent" }));
    await vi.advanceTimersByTimeAsync(60_000);
    const v = store.get(r.id)!;
    expect(v.state).toBe("failed");
    expect(v.endReason).toBe("avatar_silent");
    expect(v.log.some((e) => e.event === "silence_retry")).toBe(true);
    expect(balance()).toBe(before);
  });

  it("join failure: refunds in full", async () => {
    const before = balance();
    const r = await store.start(request({ demoFault: "join_fail" }));
    await vi.advanceTimersByTimeAsync(2_000);
    const v = store.get(r.id)!;
    expect(v.state).toBe("failed");
    expect(v.endReason).toBe("join_failed");
    expect(balance()).toBe(before);
  });

  it("sessions under 30 s are not billed", async () => {
    const before = balance();
    const r = await store.start(request());
    await vi.advanceTimersByTimeAsync(10_000);
    r.end("owner_ended");
    await vi.advanceTimersByTimeAsync(10);
    expect(store.get(r.id)!.state).toBe("refunded");
    expect(balance()).toBe(before);
  });

  it("minute cap ends the session", async () => {
    const r = await store.start(request({ capMinutes: 1, meeting: { platform: "demo", title: "Long" } }));
    (r as any).adapters[0] = new DemoMeetingAdapter({ scripted: false });
    await vi.advanceTimersByTimeAsync(2_500 + 60_000 + 500);
    const v = store.get(r.id)!;
    expect(["ended", "failed"]).toContain(v.state);
    if (v.state === "ended") expect(v.endReason).toBe("cap_reached");
  });

  it("kill switch stops all sessions and refunds", async () => {
    const before = balance();
    const r = await store.start(request());
    await vi.advanceTimersByTimeAsync(40_000);
    expect(store.stopAll("owner_1", "kill_switch")).toBe(1);
    await vi.advanceTimersByTimeAsync(10);
    expect(store.get(r.id)!.state).toBe("failed");
    expect(balance()).toBe(before);
  });
});

describe("live takeover and coach mode", () => {
  it("takeover silences the twin; coach 'say' is still screened for binding language", async () => {
    const r = await store.start(request({ meeting: { platform: "demo", title: "t" } }));
    await vi.advanceTimersByTimeAsync(6_000);
    await r.setTakeover(true);
    expect(r.view().utterances.at(-1)?.text).toMatch(/joining live now/);
    const count = r.view().utterances.length;
    await r.onSpeech("Maya", "Grace, where are we on the kiosk launch timeline?");
    expect(r.view().utterances.length).toBe(count);
    r.ownerSays("Thanks Maya, I'm here.");
    expect(r.view().transcript.at(-1)?.speaker).toBe("Grace Lee (live)");

    await r.setTakeover(false);
    await r.coach("Sure, I'll sign the contract today.", "say");
    expect(r.view().utterances.at(-1)?.text).toMatch(/can't agree to contracts/);

    await r.coach("The pilot budget is approved internally at 40k; share that it's still under review externally.", "whisper");
    await r.onSpeech("Pat", "Grace, what's the status of the pilot budget?");
    expect(r.view().utterances.at(-1)?.text).toMatch(/budget/i);
    r.end("owner_ended");
  });

  it("falls back to voice-only when the avatar pushes latency over 1 s", async () => {
    const r = await store.start(request({ demoFault: "slow_avatar" }));
    await vi.advanceTimersByTimeAsync(6_000);
    for (let i = 0; i < 3; i++) await r.onSpeech("Maya", "Grace, where are we on the kiosk launch timeline?");
    expect(r.view().state).toBe("voice_only");
    expect(r.view().log.some((e) => e.event === "voice_only_fallback")).toBe(true);
    r.end("owner_ended");
  });

  it("stops transcribing when a participant objects", async () => {
    const r = await store.start(request());
    await vi.advanceTimersByTimeAsync(6_000);
    await r.onSpeech("Pat", "Please stop recording.");
    await r.onSpeech("Pat", "This part is confidential.");
    const t = r.view().transcript.map((l) => l.text);
    expect(t).not.toContain("This part is confidential.");
    expect(r.view().transcriptionPaused).toBe(true);
    r.end("owner_ended");
  });
});

describe("Ask me relay", () => {
  it("routes an unknown question to the owner and relays the answer, labeled as the owner's", async () => {
    const r = await store.start(request());
    await vi.advanceTimersByTimeAsync(6_000);
    await r.onSpeech("Pat (vendor)", "Grace, what's your view on opening a Denver office?");
    const q = r.view().questions[0];
    expect(q).toMatchObject({ status: "pending", askedBy: "Pat (vendor)" });
    expect(r.view().utterances.at(-1)?.text).toMatch(/checking with Grace/);

    await r.answerQuestion(q.id, "Not this year; we're focused on Atlanta first.");
    expect(r.view().questions[0].status).toBe("answered");
    expect(r.view().utterances.at(-1)).toMatchObject({ kind: "relay" });
    expect(r.view().utterances.at(-1)?.text).toMatch(/Grace just replied to Pat's question: Not this year/);

    await r.onSpeech("Maya", "Grace, are we opening a Denver office?");
    expect(r.view().utterances.at(-1)?.text).toMatch(/Atlanta/);
    r.end("owner_ended");
  });

  it("an owner answer still cannot commit to contracts or payments", async () => {
    const r = await store.start(request());
    await vi.advanceTimersByTimeAsync(6_000);
    await r.onSpeech("Pat (vendor)", "Grace, what's your view on the new vendor?");
    await r.answerQuestion(r.view().questions[0].id, "Yes, I'll sign the contract and wire the payment today.");
    expect(r.view().utterances.at(-1)?.text).toMatch(/can't agree to contracts/);
    r.end("owner_ended");
  });

  it("promises a follow-up when the owner doesn't reply in time, and lists it in the notes", async () => {
    const r = await store.start(request());
    await vi.advanceTimersByTimeAsync(6_000);
    await r.onSpeech("Pat (vendor)", "Grace, what's your view on opening a Denver office?");
    await vi.advanceTimersByTimeAsync(config.askOwnerTimeoutMs + 1_000);
    const q = r.view().questions.find((x) => x.question.includes("Denver"))!;
    expect(q.status).toBe("follow_up");
    expect(r.view().transcript.some((l) => l.isTwin && /follow up with you directly/.test(l.text))).toBe(true);
    r.end("owner_ended");
    expect(r.view().summary?.flaggedForOwner.join(" ")).toMatch(/Follow up with Pat \(vendor\).*Denver/);
  });
});
