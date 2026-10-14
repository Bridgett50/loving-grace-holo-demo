import { describe, expect, it } from "vitest";
import { createHmac } from "node:crypto";
import { detectPlatform } from "../src/adapters";
import { parseTeamsJoinUrl } from "../src/adapters/teams";
import { parseZoomUrl, zoomSdkSignature } from "../src/adapters/zoom";
import { createApp } from "../src/app";
import { config } from "../src/config";
import { BotStore } from "../src/store";

describe("platform adapters", () => {
  it("detects platforms from join links", () => {
    expect(detectPlatform("https://meet.google.com/abc-defg-hij")).toBe("google_meet");
    expect(detectPlatform("https://us02web.zoom.us/j/81234567890?pwd=x")).toBe("zoom");
    expect(detectPlatform("https://teams.microsoft.com/l/meetup-join/19%3ameeting_x%40thread.v2/0")).toBe("teams");
    expect(detectPlatform("https://example.com")).toBeNull();
  });

  it("builds a valid Zoom Meeting SDK signature", () => {
    const sig = zoomSdkSignature({ sdkKey: "key", sdkSecret: "secret", meetingNumber: "81234567890", nowSec: 1_700_000_000 });
    const [h, p, s] = sig.split(".");
    expect(createHmac("sha256", "secret").update(`${h}.${p}`).digest("base64url")).toBe(s);
    const payload = JSON.parse(Buffer.from(p, "base64url").toString());
    expect(payload).toMatchObject({ sdkKey: "key", appKey: "key", mn: "81234567890", role: 0 });
    expect(payload.exp - payload.iat).toBe(7200);
    expect(parseZoomUrl("https://us02web.zoom.us/j/81234567890?pwd=abc")).toEqual({ meetingNumber: "81234567890", passcode: "abc" });
  });

  it("parses Teams join links", () => {
    const url = "https://teams.microsoft.com/l/meetup-join/19%3ameeting_abc%40thread.v2/0?context=%7b%22Tid%22%3a%22tenant%22%2c%22Oid%22%3a%22org%22%7d";
    expect(parseTeamsJoinUrl(url)).toEqual({ threadId: "19:meeting_abc@thread.v2", messageId: "0", tenantId: "tenant", organizerId: "org" });
  });
});

describe("HTTP API", () => {
  const app = createApp(new BotStore(".data-test", false));
  const auth = { "x-second-seat-token": config.serviceToken, "content-type": "application/json" };

  it("rejects calls without the service token", async () => {
    expect((await app.request("/v1/wallets/owner_1")).status).toBe(401);
    expect((await app.request("/v1/wallets/owner_1", { headers: auth })).status).toBe(200);
  });

  it("rejects non-meeting links", async () => {
    const res = await app.request("/v1/sessions", {
      method: "POST",
      headers: auth,
      body: JSON.stringify({ actorId: "o", twin: { id: "t" }, meeting: { platform: "zoom", joinUrl: "https://evil.example/j/1", title: "x" } }),
    });
    expect(res.status).toBe(400);
  });

  it("caps demo top-ups", async () => {
    const res = await app.request("/v1/wallets/owner_1/topup", { method: "POST", headers: auth, body: JSON.stringify({ amountCents: 10_000_000 }) });
    expect(res.status).toBe(400);
  });
});
