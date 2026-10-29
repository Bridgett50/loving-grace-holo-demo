import { describe, expect, it } from "vitest";
import {
  MeetingDenied,
  createMeetingConnector,
  packageHash,
  productionDispatch,
  type OwnerPrincipal,
  type StoredCallback,
} from "../src/t2/connector";
import { sha256Hex } from "../src/t2/sha256";

const A: OwnerPrincipal = { ownerId: "owner-a" };
const B: OwnerPrincipal = { ownerId: "owner-b" };

function approvedJob(body = "Subject: Recap\r\n\r\nThanks — café ✓") {
  const c = createMeetingConnector();
  const { meetingId } = c.createMeeting(A, "meeting text");
  const { generationId } = c.openSession(A, meetingId);
  const issued = c.issueJob(A, meetingId, generationId);
  const callback: StoredCallback = {
    jobId: issued.jobId,
    ownerId: A.ownerId,
    meetingId,
    generationId,
    authorityGeneration: issued.authorityGeneration,
    sourceRevision: issued.sourceRevision,
    artifact: body,
  };
  const delivered = c.resolveCallback(A, callback);
  expect(delivered.delivered).toBe(true);
  const ok = c.approvePackage(A, issued.jobId, packageHash(body));
  expect(ok.approved).toBe(true);
  return { c, meetingId, generationId, jobId: issued.jobId, callback, body };
}

describe("t2 connector mirror", () => {
  it("MIRROR-1 packageHash matches the server sha256 hex of the exact UTF-8 body", () => {
    expect(sha256Hex("abc")).toBe(
      "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
    );
    expect(packageHash("abc")).toBe(
      "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
    );
    expect(packageHash("Subject: Recap\r\n\r\nThanks — café ✓")).toBe(
      "86b58a6e7abc024cb7c0e428a644a431afe32f73c2a341c4de9ad966b7f895ca",
    );
    expect(packageHash("")).toBe(
      "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    );
    expect(productionDispatch).toThrow(MeetingDenied);
  });

  it("MIRROR-2 another owner cannot replay or export A's approved package", async () => {
    const { c, callback, jobId, body } = approvedJob();
    const calls: string[] = [];
    const ran = await c.replay(B, callback, async (pkg) => {
      calls.push(pkg.body);
    });
    expect(ran.ran).toBe(false);
    expect(calls).toEqual([]);
    expect(c.approvePackage(B, jobId, packageHash(body)).approved).toBe(false);
    expect(() => c.exportApproved(B, jobId)).toThrow(MeetingDenied);
    expect(c.outboundCount()).toBe(0);
    // A can still export their own package.
    expect(c.exportApproved(A, jobId)).toBe(body);
  });

  it("MIRROR-3 an edit after approval clears approval and blocks send and export", async () => {
    const { c, meetingId, callback, jobId } = approvedJob();
    c.act(A, meetingId, { type: "edit", text: "meeting text (edited)" });
    const calls: string[] = [];
    const ran = await c.replay(A, callback, async (pkg) => {
      calls.push(pkg.body);
    });
    expect(ran.ran).toBe(false);
    expect(calls).toEqual([]);
    expect(() => c.exportApproved(A, jobId)).toThrow(MeetingDenied);
    expect(c.outboundCount()).toBe(0);
  });

  it("MIRROR-4 a rejecting transport marks the job failed and never resends", async () => {
    const { c, callback, jobId } = approvedJob();
    let calls = 0;
    await expect(
      c.replay(A, callback, async () => {
        calls += 1;
        throw new Error("transport down");
      }),
    ).rejects.toThrow("transport down");
    expect(calls).toBe(1);
    const again = await c.replay(A, callback, async () => {
      calls += 1;
    });
    expect(again.ran).toBe(false);
    expect(calls).toBe(1);
    expect(() => c.exportApproved(A, jobId)).toThrow(MeetingDenied);
    expect(c.outboundCount()).toBe(0);
  });

  it("MIRROR-5 takeover refuses later transcript lines and invalidates approved unsent work", async () => {
    const { c, meetingId, generationId, callback, jobId } = approvedJob();
    const first = c.appendTranscript(A, generationId, { meetingId, text: "hello" });
    expect(first.appended).toBe(true);
    c.takeover(A, generationId);
    const late = c.appendTranscript(A, generationId, { meetingId, text: "late line" });
    expect(late.appended).toBe(false);
    expect(c.transcript(A, generationId)).toEqual(["hello"]);
    const calls: string[] = [];
    const ran = await c.replay(A, callback, async (pkg) => {
      calls.push(pkg.body);
    });
    expect(ran.ran).toBe(false);
    expect(calls).toEqual([]);
    expect(() => c.exportApproved(A, jobId)).toThrow(MeetingDenied);
    expect(() => c.issueJob(A, meetingId, generationId)).toThrow(MeetingDenied);
  });

  it("MIRROR-6 a first append to a revoked meeting does not bind the session", () => {
    const c = createMeetingConnector();
    const a = c.createMeeting(A, "revoked meeting");
    const b = c.createMeeting(A, "live meeting");
    const { generationId } = c.openSession(A);
    c.revoke(A, a.meetingId);
    const refused = c.appendTranscript(A, generationId, { meetingId: a.meetingId, text: "x" });
    expect(refused.appended).toBe(false);
    // The refused append must not have bound the session: a later append to
    // the live meeting still succeeds.
    const ok = c.appendTranscript(A, generationId, { meetingId: b.meetingId, text: "y" });
    expect(ok.appended).toBe(true);
    expect(c.transcript(A, generationId)).toEqual(["y"]);
  });
});
