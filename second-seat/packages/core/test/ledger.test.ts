import { describe, expect, it } from "vitest";
import { InsufficientBalanceError, Ledger, SessionGuard } from "../src";

describe("ledger", () => {
  it("reserves the capped cost and refuses sessions it cannot cover", () => {
    const l = new Ledger();
    l.topUp(500);
    l.reserve("s1", 300);
    expect(l.availableCents).toBe(200);
    expect(() => l.reserve("s2", 300)).toThrow(InsufficientBalanceError);
  });

  it("charges only the settled amount and releases the rest", () => {
    const l = new Ledger();
    l.topUp(1000);
    l.reserve("s1", 600);
    expect(l.settle("s1", { chargedCents: 120, reason: "owner_ended" })).toEqual({ chargedCents: 120, refundedCents: 480 });
    expect(l.balanceCents).toBe(880);
    expect(l.availableCents).toBe(880);
  });

  it("auto-refunds failed sessions in full with a logged reason", () => {
    const l = new Ledger();
    l.topUp(1000);
    l.reserve("s1", 600);
    l.refund("s1", "no_video_timeout");
    expect(l.balanceCents).toBe(1000);
    const refund = l.state.entries.find((e) => e.kind === "refund");
    expect(refund?.reason).toBe("auto_refund:no_video_timeout");
    expect(refund?.amountCents).toBe(600);
  });

  it("is idempotent: settling twice never double-charges or double-refunds", () => {
    const l = new Ledger();
    l.topUp(1000);
    l.reserve("s1", 600);
    l.settle("s1", { chargedCents: 100, reason: "owner_ended" });
    l.settle("s1", { chargedCents: 100, reason: "owner_ended" });
    l.refund("s1", "late_failure");
    expect(l.balanceCents).toBe(900);
    expect(() => l.reserve("s1", 10)).toThrow();
  });

  it("can never charge more than was reserved", () => {
    const l = new Ledger();
    l.topUp(1000);
    l.reserve("s1", 200);
    l.settle("s1", { chargedCents: 999, reason: "bug" });
    expect(l.balanceCents).toBe(800);
  });

  it("settles end-to-end from a failed guard session with zero cost", () => {
    const l = new Ledger();
    l.topUp(2000);
    const g = new SessionGuard({ ratePerMinuteCents: 25, capMinutes: 30 });
    g.preflight(
      { ownerVerified: true, consentActive: true, consentScopes: ["likeness_video", "voice_clone", "meeting_join"], meetingAuthorized: true, avatarReady: true, voiceReady: true, balanceCents: l.availableCents, roomName: "r" },
      0,
    );
    l.reserve("s1", g.reservation);
    g.start("r", 0);
    g.joined(1);
    g.tick(20_001);
    l.settle("s1", g.snapshot.billing!);
    expect(l.balanceCents).toBe(2000);
  });
});
