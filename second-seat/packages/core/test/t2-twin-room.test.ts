import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  DEMO_OWNERS,
  F2_NOTE,
  MAIL_APP_LABEL,
  TAKEOVER_REFUSAL,
  createTwinRoom,
  fakeSendAllowed,
  mailtoHref,
  packageHash,
  rosterFor,
  sha256Hex,
  type OwnerPrincipal,
} from "../src/t2";

const A: OwnerPrincipal = { ownerId: DEMO_OWNERS[0].ownerId };
const B: OwnerPrincipal = { ownerId: DEMO_OWNERS[1].ownerId };

function room() {
  const r = createTwinRoom();
  const byTitle = (p: OwnerPrincipal, title: string) => {
    const m = r.meetings(p).find((x) => x.title === title);
    if (!m) throw new Error(`no meeting ${title}`);
    return m.meetingId;
  };
  const kiosk = byTitle(A, "Kiosk pilot check-in");
  const board = byTitle(A, "Board prep (internal)");
  const vendor = byTitle(B, "Vendor sync");
  return { r, kiosk, board, vendor };
}

function playAll(r: ReturnType<typeof createTwinRoom>, p: OwnerPrincipal, meetingId: string) {
  while (r.linesLeft(p, meetingId) > 0) expect(r.nextLine(p, meetingId).appended).toBe(true);
}

describe("T2 crypto stand-ins", () => {
  it("sha256Hex matches node:crypto, including multibyte text and block boundaries", () => {
    for (const s of ["", "abc", "a".repeat(55), "a".repeat(56), "a".repeat(64), "a".repeat(119), "Recap — café ✓ 東京", "x\n".repeat(500)]) {
      expect(sha256Hex(s)).toBe(createHash("sha256").update(s, "utf8").digest("hex"));
    }
  });
});

describe("T2-1 twin panel: owner scoping and takeover", () => {
  it("each owner sees only their own meetings; the second owner sees nothing of the first", () => {
    const { r, kiosk, board, vendor } = room();
    expect(r.meetings(A).map((m) => m.title).sort()).toEqual(["Board prep (internal)", "Kiosk pilot check-in"]);
    expect(r.meetings(B).map((m) => m.title)).toEqual(["Vendor sync"]);
    playAll(r, A, kiosk);
    r.guide(A, kiosk, "Keep the April date firm.");
    r.deliverPackage(A, kiosk, r.draftText(A, kiosk)!);
    r.approve(A, kiosk);
    for (const id of [kiosk, board]) {
      expect(r.title(B, id)).toBeNull();
      expect(r.transcript(B, id)).toEqual([]);
      expect(r.guidance(B, id)).toEqual([]);
      expect(r.reasoningContext(B, id)).toBe("");
      expect(r.draftText(B, id)).toBeNull();
      expect(r.packageView(B, id)).toBeNull();
      expect(r.exportApproved(B, id)).toBeNull();
      expect(r.nextLine(B, id).appended).toBe(false);
      expect(r.guide(B, id, "hijack").accepted).toBe(false);
      expect(r.approve(B, id).approved).toBe(false);
      expect(() => r.takeover(B, id)).toThrow();
    }
    expect(r.transcript(A, kiosk)).toHaveLength(6);
    expect(r.title(A, vendor)).toBeNull();
  });

  it("guidance is recorded for the owner and shown in the twin's context", () => {
    const { r, kiosk } = room();
    expect(r.guide(A, kiosk, "  Keep the April date firm.  ").accepted).toBe(true);
    expect(r.guidance(A, kiosk)).toEqual(["Keep the April date firm."]);
    expect(r.reasoningContext(A, kiosk)).toContain("Owner guidance: Keep the April date firm.");
    expect(r.guide(A, kiosk, "   ").accepted).toBe(false);
  });

  it("takeover pauses the twin and invalidates the delivered, unsent package", () => {
    const { r, kiosk } = room();
    playAll(r, A, kiosk);
    r.deliverPackage(A, kiosk, r.draftText(A, kiosk)!);
    expect(r.approve(A, kiosk).approved).toBe(true);
    expect(r.takeover(A, kiosk)).toEqual({ invalidatedJobs: 1 });
    expect(r.isTakenOver(A, kiosk)).toBe(true);
    const v = r.packageView(A, kiosk)!;
    expect(v.status).toBe("invalidated");
    expect(v.approved).toBe(false);
    expect(r.approve(A, kiosk).approved).toBe(false);
    expect(r.deliverPackage(A, kiosk, "new")).toBeNull();
    expect(r.guide(A, kiosk, "more").accepted).toBe(false);
  });
});

describe("T2-2 scoped reasoning context", () => {
  it("contains only the current owner's selected meeting; other meetings and owners never appear", () => {
    const { r, kiosk, board, vendor } = room();
    playAll(r, A, kiosk);
    playAll(r, A, board);
    playAll(r, B, vendor);
    r.guide(A, board, "Board-only guidance");
    r.guide(B, vendor, "Vendor-only guidance");
    const ctx = r.reasoningContext(A, kiosk);
    expect(ctx).toContain("12,000 pilot budget");
    expect(ctx).toContain("Heard: Dana (client): Thanks for joining.");
    for (const foreign of ["14 months", "hiring freeze", "Board-only guidance", "4,500", "June 1", "Vendor-only guidance", "Riley", B.ownerId]) {
      expect(ctx).not.toContain(foreign);
    }
  });
});

describe("T2-3 live transcript", () => {
  it("lines arrive one at a time in script order through appendTranscript", () => {
    const { r, kiosk } = room();
    expect(r.transcript(A, kiosk)).toEqual([]);
    expect(r.nextLine(A, kiosk).appended).toBe(true);
    expect(r.transcript(A, kiosk)).toEqual(["Dana (client): Thanks for joining. Can we still launch the kiosks in early March?"]);
    expect(r.nextLine(A, kiosk).appended).toBe(true);
    expect(r.transcript(A, kiosk)[1]).toMatch(/^Avery's twin: Yes\./);
    expect(r.linesLeft(A, kiosk)).toBe(4);
  });

  it("after takeover new lines are refused with a visible reason", () => {
    const { r, kiosk } = room();
    r.nextLine(A, kiosk);
    r.takeover(A, kiosk);
    expect(r.nextLine(A, kiosk)).toEqual({ appended: false, reason: TAKEOVER_REFUSAL });
    expect(r.transcript(A, kiosk)).toHaveLength(1);
  });
});

describe("T2-4 exact-package approval, send and export", () => {
  it("shows the exact package hash; approval binds to it; an edit clears approval", () => {
    const { r, kiosk } = room();
    const text = r.draftText(A, kiosk)!;
    const v = r.deliverPackage(A, kiosk, text)!;
    expect(v.hash).toBe(createHash("sha256").update(text, "utf8").digest("hex"));
    expect(v).toMatchObject({ status: "delivered", approved: false, sent: false });
    expect(r.approve(A, kiosk).approved).toBe(true);
    expect(r.packageView(A, kiosk)!.approved).toBe(true);
    const edited = r.deliverPackage(A, kiosk, `${text}\nP.S. edited`)!;
    expect(edited.approved).toBe(false);
    expect(edited.hash).not.toBe(v.hash);
    expect(edited.hash).toBe(packageHash(`${text}\nP.S. edited`));
  });

  it("unapproved packages never send", async () => {
    const { r, kiosk } = room();
    r.deliverPackage(A, kiosk, r.draftText(A, kiosk)!);
    let calls = 0;
    expect((await r.send(A, kiosk, async () => void calls++)).ran).toBe(false);
    expect(calls).toBe(0);
  });

  it("an approved package sends once with the exact body and hash, and never again", async () => {
    const { r, kiosk } = room();
    const text = r.draftText(A, kiosk)!;
    r.deliverPackage(A, kiosk, text);
    r.approve(A, kiosk);
    const sent: { body: string; packageHash: string }[] = [];
    expect((await r.send(A, kiosk, async (p) => void sent.push(p))).ran).toBe(true);
    expect((await r.send(A, kiosk, async (p) => void sent.push(p))).ran).toBe(false);
    expect(sent).toEqual([expect.objectContaining({ body: text, packageHash: packageHash(text) })]);
    expect(r.packageView(A, kiosk)!.sent).toBe(true);
    expect(r.connector.outboundCount()).toBe(1);
  });

  it("a failed send shows as failed, counts nothing and is never resent", async () => {
    const { r, kiosk } = room();
    r.deliverPackage(A, kiosk, r.draftText(A, kiosk)!);
    r.approve(A, kiosk);
    let calls = 0;
    const out = await r.send(A, kiosk, async () => {
      calls++;
      throw new Error("fake transport failure");
    });
    expect(out).toEqual({ ran: false, error: "fake transport failure" });
    expect(r.packageView(A, kiosk)).toMatchObject({ status: "failed", sent: false, approved: false });
    expect((await r.send(A, kiosk, async () => void calls++)).ran).toBe(false);
    expect(calls).toBe(1);
    expect(r.connector.outboundCount()).toBe(0);
  });

  it("F2: takeover can't recall a send that is already in flight", async () => {
    const { r, kiosk } = room();
    r.deliverPackage(A, kiosk, r.draftText(A, kiosk)!);
    r.approve(A, kiosk);
    let release!: () => void;
    const pending = r.send(A, kiosk, () => new Promise<void>((done) => (release = done)));
    r.takeover(A, kiosk);
    release();
    expect((await pending).ran).toBe(true);
    expect(F2_NOTE).toBe("Takeover can't recall an email that's already sending.");
  });

  it("export inventory exists only for the exact approved package", () => {
    const { r, kiosk } = room();
    const text = r.draftText(A, kiosk)!;
    r.deliverPackage(A, kiosk, text);
    expect(r.exportApproved(A, kiosk)).toBeNull();
    r.approve(A, kiosk);
    expect(r.exportApproved(A, kiosk)).toBe(text);
    r.deliverPackage(A, kiosk, `${text}!`);
    expect(r.exportApproved(A, kiosk)).toBeNull();
  });

  it("mailto opens the viewer's mail app and is never labeled as Gmail sending", () => {
    const { r, kiosk } = room();
    const href = mailtoHref(r.draftText(A, kiosk)!);
    expect(href.startsWith("mailto:dana%40client.example.test,lee%40client.example.test?subject=")).toBe(true);
    expect(decodeURIComponent(href.split("subject=")[1].split("&")[0])).toBe("Recap: Kiosk pilot check-in");
    expect(decodeURIComponent(href.split("&body=")[1])).toContain("Launch window: the week of March 9.");
    expect(MAIL_APP_LABEL).toBe("Open in your mail app");
    expect(MAIL_APP_LABEL.toLowerCase()).not.toContain("gmail");
  });
});

describe("your own twin as owner A", () => {
  it("rosterFor shows the signed-in owner's name everywhere but keeps owner IDs and the second owner invented", () => {
    const { owners, scripts } = rosterFor("Bridget Sander");
    expect(owners[0]).toMatchObject({ ownerId: DEMO_OWNERS[0].ownerId, displayName: "Bridget Sander", twinName: "Bridget's twin" });
    expect(owners[1]).toEqual(DEMO_OWNERS[1]);
    const r = createTwinRoom({ scripts });
    const kiosk = r.meetings(A).find((m) => m.title === "Kiosk pilot check-in")!.meetingId;
    while (r.linesLeft(A, kiosk) > 0) r.nextLine(A, kiosk);
    const all = [...r.transcript(A, kiosk), r.draftText(A, kiosk)!].join("\n");
    expect(all).toContain("Bridget's twin: Yes.");
    expect(all).toMatch(/Best,\nBridget$/);
    expect(all).not.toContain("Avery");
    expect(rosterFor("   ").owners[0].displayName).toBe(DEMO_OWNERS[0].displayName);
  });
});

describe("test-flag gate for the fake transport", () => {
  it("is on only for SECOND_SEAT_TEST_MODE=1 on a loopback host", () => {
    expect(fakeSendAllowed("1", "127.0.0.1:4310")).toBe(true);
    expect(fakeSendAllowed("1", "localhost:4310")).toBe(true);
    expect(fakeSendAllowed("1", "[::1]:4310")).toBe(true);
    for (const flag of [undefined, "", "0", "true", "yes", " 1"]) expect(fakeSendAllowed(flag, "127.0.0.1:4310")).toBe(false);
    for (const host of [null, "", "second-seat.onrender.com", "localhost.evil.test", "127.0.0.1.nip.io:80", "0.0.0.0:4310", "192.168.1.5:4310", "[::ffff:127.0.0.1]:4310"]) {
      expect(fakeSendAllowed("1", host)).toBe(false);
    }
  });
});
