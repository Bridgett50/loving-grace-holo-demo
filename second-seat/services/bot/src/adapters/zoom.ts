import { createHmac } from "node:crypto";
import { config } from "../config";
import type { SpeechResult } from "../providers";
import { BROWSER_ARGS, loadChromium, mediaShimScript } from "./browser-media";
import { AdapterUnavailableError, type AdapterEvents, type JoinOptions, type MeetingAdapter } from "./types";

/**
 * Zoom via the official Zoom Meeting SDK (web, Component View) running in a headless browser.
 * The SDK is loaded from Zoom's CDN at runtime under Zoom's SDK terms; it is not bundled here.
 * Joining meetings outside your own account requires the app to pass Zoom Marketplace review, and
 * raw audio/video access requires additional approval (see docs/PLATFORM_APPROVALS.md).
 */

function b64url(input: string | Buffer): string {
  return Buffer.from(input).toString("base64url");
}

/** Meeting SDK JWT (HS256) as documented by Zoom: appKey/sdkKey, mn, role, iat, exp, tokenExp. */
export function zoomSdkSignature(opts: { sdkKey: string; sdkSecret: string; meetingNumber: string; role?: 0 | 1; nowSec?: number; ttlSec?: number }): string {
  const iat = (opts.nowSec ?? Math.floor(Date.now() / 1000)) - 30;
  const exp = iat + (opts.ttlSec ?? 60 * 60 * 2);
  const header = b64url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const payload = b64url(JSON.stringify({ appKey: opts.sdkKey, sdkKey: opts.sdkKey, mn: opts.meetingNumber, role: opts.role ?? 0, iat, exp, tokenExp: exp }));
  const sig = createHmac("sha256", opts.sdkSecret).update(`${header}.${payload}`).digest("base64url");
  return `${header}.${payload}.${sig}`;
}

export function parseZoomUrl(url: string): { meetingNumber: string; passcode: string } {
  const u = new URL(url);
  const meetingNumber = u.pathname.match(/\/(?:j|wc\/join|wc)\/(\d{9,11})/)?.[1] ?? "";
  return { meetingNumber, passcode: u.searchParams.get("pwd") ?? "" };
}

export function zoomClientPage(opts: { sdkVersion: string; signature: string; sdkKey: string; meetingNumber: string; passcode: string; userName: string }): string {
  const v = opts.sdkVersion;
  return `<!doctype html><html><head><meta charset="utf-8"><title>Second Seat Zoom client</title>
<script src="https://source.zoom.us/${v}/lib/vendor/react.min.js"></script>
<script src="https://source.zoom.us/${v}/lib/vendor/react-dom.min.js"></script>
<script src="https://source.zoom.us/${v}/zoom-meeting-embedded-${v}.min.js"></script></head>
<body><div id="zoom"></div><script>
  const client = ZoomMtgEmbedded.createClient();
  window.__ssEvents = [];
  client.init({ zoomAppRoot: document.getElementById("zoom"), language: "en-US", patchJsMedia: true }).then(() =>
    client.join(${JSON.stringify({ signature: opts.signature, sdkKey: opts.sdkKey, meetingNumber: opts.meetingNumber, password: opts.passcode, userName: opts.userName })})
  ).then(() => { window.__ssJoined = true; client.startAudio?.(); client.startVideo?.(); })
   .catch((e) => { window.__ssError = String(e && (e.reason || e.message) || e); });
  client.on("connection-change", (p) => { if (p.state === "Closed") window.__ssEnded = true; });
  client.on("caption-message", (p) => window.__ssEvents.push({ speaker: p.displayName, text: p.text }));
</script></body></html>`;
}

export class ZoomMeetingSdkAdapter implements MeetingAdapter {
  readonly name = "zoom-meeting-sdk";
  readonly platform = "zoom" as const;
  readonly capabilities = { video: true, voice: true, chat: true, transcript: true };
  private browser?: any;
  private page?: any;
  private poll?: ReturnType<typeof setInterval>;

  async join(opts: JoinOptions, events: AdapterEvents): Promise<void> {
    if (!config.zoom.sdkKey || !config.zoom.sdkSecret) throw new AdapterUnavailableError(this.name, ["ZOOM_MEETING_SDK_KEY", "ZOOM_MEETING_SDK_SECRET"]);
    const { meetingNumber, passcode } = parseZoomUrl(opts.joinUrl ?? "");
    if (!meetingNumber) throw new Error("Could not read a Zoom meeting number from the link");
    const signature = zoomSdkSignature({ sdkKey: config.zoom.sdkKey, sdkSecret: config.zoom.sdkSecret, meetingNumber });
    const chromium = await loadChromium();
    this.browser = await chromium.launch({ headless: true, args: BROWSER_ARGS });
    const context = await this.browser.newContext({ permissions: ["camera", "microphone"] });
    await context.addInitScript(mediaShimScript({ badge: `AI Twin of ${opts.ownerName}`, backgroundCss: opts.backgroundCss, backgroundImageUrl: opts.backgroundImageUrl }));
    this.page = await context.newPage();
    await this.page.setContent(zoomClientPage({ sdkVersion: config.zoom.sdkVersion, signature, sdkKey: config.zoom.sdkKey, meetingNumber, passcode, userName: opts.displayName }));
    await this.page.waitForFunction(() => (window as any).__ssJoined || (window as any).__ssError, null, { timeout: 120_000 });
    const err = await this.page.evaluate(() => (window as any).__ssError);
    if (err) throw new Error(`Zoom join failed: ${err}`);
    this.poll = setInterval(async () => {
      const state = await this.page.evaluate(() => {
        const w = window as any;
        const evts = w.__ssEvents.splice(0);
        return { evts, ended: !!w.__ssEnded };
      }).catch(() => ({ evts: [], ended: false }));
      for (const e of state.evts) if (!String(e.speaker).includes("AI Twin")) events.onSpeech(e.speaker, e.text);
      if (state.ended) events.onEnded("meeting_ended");
    }, 600);
  }

  async speak(_text: string, speech: SpeechResult): Promise<void> {
    if (speech.audioUrl) await this.page?.evaluate((u: string) => (window as any).__secondSeat.pushAudioUrl(u), speech.audioUrl);
  }

  async postChat(text: string): Promise<void> {
    await this.page?.evaluate((t: string) => (window as any).ZoomMtgEmbedded?.createClient().getChatClient?.().sendToAll(t), text).catch(() => undefined);
  }

  async leave(): Promise<void> {
    clearInterval(this.poll);
    await this.page?.evaluate(() => (window as any).ZoomMtgEmbedded?.createClient().leaveMeeting()).catch(() => undefined);
    await this.browser?.close().catch(() => undefined);
  }
}
