import { describe, expect, it } from "vitest";
import { authorizeTwinAction, revokeConsent, type ConsentRecord, type OwnerVerification } from "../src";

const verified: OwnerVerification = { status: "verified", provider: "demo", livenessChallenges: ["turn_left", "blink"] };
const consent: ConsentRecord = {
  id: "c1",
  twinId: "t1",
  ownerId: "alice",
  signerName: "Alice Doe",
  scopes: ["likeness_video", "voice_clone", "meeting_join", "recording"],
  textHash: "x",
  signedAt: "2026-10-14T00:00:00Z",
};
const twin = { id: "t1", ownerId: "alice" };

describe("only the verified owner can create or run their twin", () => {
  it("allows the verified owner with active consent", () => {
    expect(authorizeTwinAction({ actorId: "alice", action: "create", verification: verified, consent }).ok).toBe(true);
    expect(authorizeTwinAction({ actorId: "alice", action: "run", twin, verification: verified, consent }).ok).toBe(true);
  });

  it("rejects anyone who is not the owner", () => {
    const r = authorizeTwinAction({ actorId: "mallory", action: "run", twin, verification: verified, consent });
    expect(r.ok).toBe(false);
    expect(r.reason).toMatch(/owner/);
  });

  it("rejects a verification that belongs to someone else", () => {
    expect(authorizeTwinAction({ actorId: "alice", action: "create", verification: verified, consent, verifiedUserId: "bob" }).ok).toBe(false);
  });

  it("requires the ID + liveness check, with at least two liveness challenges", () => {
    expect(authorizeTwinAction({ actorId: "alice", action: "create", consent }).ok).toBe(false);
    expect(authorizeTwinAction({ actorId: "alice", action: "create", consent, verification: { ...verified, status: "pending" } }).ok).toBe(false);
    expect(authorizeTwinAction({ actorId: "alice", action: "create", consent, verification: { ...verified, livenessChallenges: ["blink"] } }).ok).toBe(false);
  });

  it("requires likeness and voice consent to create, and meeting consent to run", () => {
    expect(authorizeTwinAction({ actorId: "alice", action: "create", verification: verified, consent: { ...consent, scopes: ["likeness_video"] } }).ok).toBe(false);
    expect(authorizeTwinAction({ actorId: "alice", action: "run", twin, verification: verified, consent: { ...consent, scopes: ["likeness_video", "voice_clone"] } }).ok).toBe(false);
  });

  it("revoking consent immediately stops the twin from running", () => {
    const revoked = revokeConsent(consent, "owner_request");
    expect(revoked.revokedAt).toBeDefined();
    expect(authorizeTwinAction({ actorId: "alice", action: "run", twin, verification: verified, consent: revoked }).ok).toBe(false);
  });

  it("rejects signed-out callers", () => {
    expect(authorizeTwinAction({ actorId: null, action: "view", twin }).ok).toBe(false);
  });
});
