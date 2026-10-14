import { describe, expect, it } from "vitest";
import {
  badgeLabel,
  chatNotice,
  createContentCredential,
  DisclosureTracker,
  embedTextWatermark,
  extractTextWatermark,
  isRecordingObjection,
  spokenIntro,
  stripTextWatermark,
  verifyContentCredential,
} from "../src";

describe("disclosure", () => {
  it("badge, intro and chat notice identify the twin as AI", () => {
    expect(badgeLabel("Grace Lee")).toBe("AI Twin of Grace Lee");
    expect(spokenIntro("Grace Lee")).toMatch(/AI twin of Grace Lee, not Grace Lee in person/);
    expect(spokenIntro("Grace Lee")).toMatch(/can't agree to contracts or payments/);
    expect(chatNotice("Grace Lee")).toMatch(/transcribed/);
  });

  it("the twin may not speak before intro and recording notice", () => {
    const d = new DisclosureTracker();
    expect(() => d.assertComplete()).toThrow();
    d.mark("intro");
    expect(d.complete).toBe(false);
    d.mark("recording_notice");
    expect(() => d.assertComplete()).not.toThrow();
  });

  it("recognises recording objections", () => {
    expect(isRecordingObjection("Please stop recording")).toBe(true);
    expect(isRecordingObjection("I don't consent to this")).toBe(true);
    expect(isRecordingObjection("Let's record the decision in the doc")).toBe(false);
  });
});

describe("content credentials", () => {
  const secret = "test-secret";

  it("signs output and verifies it", async () => {
    const cred = await createContentCredential({ asset: "hello transcript", assetType: "transcript", ownerName: "Grace", twinId: "t1", sessionId: "s1" }, secret);
    expect(cred.assertions.find((a) => a.label === "c2pa.actions")).toBeDefined();
    expect(JSON.stringify(cred)).toContain("trainedAlgorithmicMedia");
    expect(await verifyContentCredential(cred, "hello transcript", secret)).toEqual({ valid: true });
  });

  it("detects tampered assets and forged manifests", async () => {
    const cred = await createContentCredential({ asset: "original", assetType: "summary", ownerName: "Grace", twinId: "t1" }, secret);
    expect((await verifyContentCredential(cred, "edited", secret)).reason).toBe("asset_modified");
    const forged = { ...cred, assertions: [] };
    expect((await verifyContentCredential(forged, "original", secret)).reason).toBe("signature_mismatch");
    expect((await verifyContentCredential(cred, "original", "other-secret")).valid).toBe(false);
  });

  it("embeds an invisible, recoverable watermark in text output", () => {
    const marked = embedTextWatermark("Meeting notes", "sess_123");
    expect(marked).not.toBe("Meeting notes");
    expect(stripTextWatermark(marked)).toBe("Meeting notes");
    expect(extractTextWatermark(marked)).toBe("sess_123");
    expect(extractTextWatermark("plain")).toBeNull();
  });
});
