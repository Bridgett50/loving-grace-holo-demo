import { config } from "../config";
import type { SpeechResult } from "../providers";
import { BROWSER_ARGS, loadChromium, mediaShimScript } from "./browser-media";
import { AdapterUnavailableError, type AdapterEvents, type JoinOptions, type MeetingAdapter } from "./types";

/**
 * Google Meet has no official API for joining as a participant, so this is a browser bot
 * (approach studied from screenappai/meeting-bot, MIT, and Vexa, Apache-2.0; no code copied).
 * The host must admit the bot; Meet's UI changes often, so selectors are kept in one place.
 */
const SELECTORS = {
  nameInput: 'input[aria-label="Your name"], input[placeholder="Your name"]',
  joinButtons: ['button:has-text("Ask to join")', 'button:has-text("Join now")', 'button:has-text("Join")'],
  dismissMic: 'button:has-text("Continue without microphone")',
  inCall: '[aria-label="Leave call"], button[aria-label*="Leave call"]',
  denied: "text=/You can't join this video call|Someone in the call denied your request/i",
  captionsButton: 'button[aria-label*="captions" i]',
  captionRegion: '[role="region"][aria-label*="Captions" i], div[jsname="dsyhDe"]',
  chatButton: 'button[aria-label*="Chat with everyone" i]',
  chatInput: 'textarea[aria-label*="Send a message" i]',
  ended: "text=/You left the meeting|The call has ended|You've been removed/i",
};

export class GoogleMeetBrowserAdapter implements MeetingAdapter {
  readonly name = "google-meet-browser";
  readonly platform = "google_meet" as const;
  readonly capabilities = { video: true, voice: true, chat: true, transcript: true };
  private browser?: any;
  private page?: any;
  private poll?: ReturnType<typeof setInterval>;

  async join(opts: JoinOptions, events: AdapterEvents): Promise<void> {
    if (!opts.joinUrl?.startsWith("https://meet.google.com/")) throw new Error("Not a Google Meet link");
    const chromium = await loadChromium();
    this.browser = await chromium.launch({ headless: config.googleMeet.headless, args: BROWSER_ARGS });
    const context = await this.browser.newContext({ permissions: ["camera", "microphone"], viewport: { width: 1280, height: 800 } });
    await context.addInitScript(mediaShimScript({ badge: `AI Twin of ${opts.ownerName}`, backgroundCss: opts.backgroundCss, backgroundImageUrl: opts.backgroundImageUrl }));
    this.page = await context.newPage();
    await this.page.goto(opts.joinUrl, { waitUntil: "domcontentloaded" });
    await this.page.locator(SELECTORS.dismissMic).click({ timeout: 3_000 }).catch(() => undefined);
    await this.page.locator(SELECTORS.nameInput).fill(opts.displayName, { timeout: 15_000 });
    for (const sel of SELECTORS.joinButtons) {
      if (await this.page.locator(sel).first().isVisible().catch(() => false)) {
        await this.page.locator(sel).first().click();
        break;
      }
    }
    const admitted = await Promise.race([
      this.page.locator(SELECTORS.inCall).first().waitFor({ timeout: 120_000 }).then(() => true),
      this.page.locator(SELECTORS.denied).first().waitFor({ timeout: 120_000 }).then(() => false),
    ]);
    if (!admitted) throw new Error("The host denied the twin's request to join.");

    await this.page.locator(SELECTORS.captionsButton).first().click().catch(() => undefined);
    let lastCaption = "";
    this.poll = setInterval(async () => {
      try {
        if (await this.page.locator(SELECTORS.ended).first().isVisible()) {
          events.onEnded("meeting_ended");
          return;
        }
        const text: string = await this.page.locator(SELECTORS.captionRegion).first().innerText({ timeout: 500 });
        const latest = text.trim().split("\n").slice(-2);
        const [speaker, said] = latest.length === 2 ? latest : ["Participant", latest[0] ?? ""];
        if (said && said !== lastCaption && !speaker.includes("AI Twin")) {
          lastCaption = said;
          events.onSpeech(speaker, said);
        }
      } catch {
        /* captions not visible yet */
      }
    }, 700);
  }

  async speak(_text: string, speech: SpeechResult): Promise<void> {
    if (speech.audioUrl) await this.page?.evaluate((u: string) => (window as any).__secondSeat.pushAudioUrl(u), speech.audioUrl);
  }

  async postChat(text: string): Promise<void> {
    if (!this.page) return;
    await this.page.locator(SELECTORS.chatButton).first().click().catch(() => undefined);
    await this.page.locator(SELECTORS.chatInput).first().fill(text).catch(() => undefined);
    await this.page.keyboard.press("Enter").catch(() => undefined);
  }

  async leave(): Promise<void> {
    clearInterval(this.poll);
    await this.page?.locator(SELECTORS.inCall).first().click().catch(() => undefined);
    await this.browser?.close().catch(() => undefined);
  }
}

/**
 * Fallback for Google Meet: a self-hosted Vexa (Apache-2.0) deployment joins as a listen-only
 * transcription bot when the browser bot cannot join (blocked, UI changed, browser missing).
 */
export class VexaMeetFallbackAdapter implements MeetingAdapter {
  readonly name = "google-meet-vexa-fallback";
  readonly platform = "google_meet" as const;
  readonly capabilities = { video: false, voice: false, chat: false, transcript: true };
  private poll?: ReturnType<typeof setInterval>;
  private meetingId = "";

  private headers() {
    return { "content-type": "application/json", "X-API-Key": config.googleMeet.vexaApiKey };
  }

  async join(opts: JoinOptions, events: AdapterEvents): Promise<void> {
    if (!config.googleMeet.vexaApiUrl) throw new AdapterUnavailableError(this.name, ["VEXA_API_URL", "VEXA_API_KEY"]);
    this.meetingId = opts.joinUrl?.split("/").pop()?.split("?")[0] ?? "";
    const res = await fetch(`${config.googleMeet.vexaApiUrl}/bots`, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify({ platform: "google_meet", native_meeting_id: this.meetingId, bot_name: opts.displayName }),
    });
    if (!res.ok) throw new Error(`Vexa could not join (${res.status})`);
    const seen = new Set<string>();
    this.poll = setInterval(async () => {
      const r = await fetch(`${config.googleMeet.vexaApiUrl}/transcripts/google_meet/${this.meetingId}`, { headers: this.headers() }).catch(() => null);
      if (!r?.ok) return;
      const body = (await r.json()) as { status?: string; segments?: Array<{ start: number; speaker?: string; text: string }> };
      for (const s of body.segments ?? []) {
        const key = `${s.start}|${s.text}`;
        if (seen.has(key)) continue;
        seen.add(key);
        events.onSpeech(s.speaker ?? "Participant", s.text);
      }
      if (body.status === "completed") events.onEnded("meeting_ended");
    }, 2_000);
  }

  async speak(): Promise<void> {}
  async postChat(): Promise<void> {}

  async leave(): Promise<void> {
    clearInterval(this.poll);
    await fetch(`${config.googleMeet.vexaApiUrl}/bots/google_meet/${this.meetingId}`, { method: "DELETE", headers: this.headers() }).catch(() => undefined);
  }
}
