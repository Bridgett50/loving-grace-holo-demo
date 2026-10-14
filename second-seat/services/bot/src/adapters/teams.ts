import { config } from "../config";
import type { SpeechResult } from "../providers";
import { AdapterUnavailableError, type AdapterEvents, type JoinOptions, type MeetingAdapter } from "./types";

/**
 * Microsoft Teams via the Bot Framework + Microsoft Graph Communications calling API.
 *
 * - Service-hosted media (this adapter): joins the meeting, plays the twin's cloned-voice audio with
 *   playPrompt, receives participant/roster and call-state notifications at TEAMS_CALLBACK_URL.
 *   This is voice-only.
 * - Real-time video needs application-hosted media (Microsoft.Graph.Communications.Calls.Media,
 *   .NET on Windows Server). Set TEAMS_MEDIA_WORKER_URL to a worker that does that; the bot then
 *   delegates join and media to it.
 *
 * Requires an Azure Bot registration with Calls.JoinGroupCall.All / Calls.AccessMedia.All and tenant
 * admin consent (docs/PLATFORM_APPROVALS.md).
 */

export function parseTeamsJoinUrl(url: string): { threadId: string; messageId: string; tenantId?: string; organizerId?: string } {
  const u = new URL(url);
  const parts = decodeURIComponent(u.pathname).split("/");
  const i = parts.indexOf("meetup-join");
  const ctx = JSON.parse(u.searchParams.get("context") ?? "{}") as { Tid?: string; Oid?: string };
  return { threadId: parts[i + 1] ?? "", messageId: parts[i + 2] ?? "0", tenantId: ctx.Tid, organizerId: ctx.Oid };
}

export class TeamsGraphAdapter implements MeetingAdapter {
  readonly name = "teams-graph-calling";
  readonly platform = "teams" as const;
  readonly capabilities = { video: !!config.teams.mediaWorkerUrl, voice: true, chat: false, transcript: !!config.teams.mediaWorkerUrl };
  private callId = "";
  private token = "";
  private events?: AdapterEvents;

  private async getToken(): Promise<string> {
    const res = await fetch(`https://login.microsoftonline.com/${config.teams.tenantId}/oauth2/v2.0/token`, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: config.teams.appId,
        client_secret: config.teams.appSecret,
        scope: "https://graph.microsoft.com/.default",
        grant_type: "client_credentials",
      }),
    });
    if (!res.ok) throw new Error(`Teams auth failed (${res.status})`);
    return ((await res.json()) as { access_token: string }).access_token;
  }

  async join(opts: JoinOptions, events: AdapterEvents): Promise<void> {
    const missing = (["TEAMS_TENANT_ID", "TEAMS_BOT_APP_ID", "TEAMS_BOT_APP_SECRET", "TEAMS_CALLBACK_URL"] as const).filter(
      (k) => !{ TEAMS_TENANT_ID: config.teams.tenantId, TEAMS_BOT_APP_ID: config.teams.appId, TEAMS_BOT_APP_SECRET: config.teams.appSecret, TEAMS_CALLBACK_URL: config.teams.callbackUrl }[k],
    );
    if (missing.length) throw new AdapterUnavailableError(this.name, [...missing]);
    this.events = events;
    const meeting = parseTeamsJoinUrl(opts.joinUrl ?? "");
    this.token = await this.getToken();
    const res = await fetch("https://graph.microsoft.com/v1.0/communications/calls", {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${this.token}` },
      body: JSON.stringify({
        "@odata.type": "#microsoft.graph.call",
        callbackUri: config.teams.callbackUrl,
        requestedModalities: ["audio"],
        mediaConfig: { "@odata.type": "#microsoft.graph.serviceHostedMediaConfig" },
        chatInfo: { "@odata.type": "#microsoft.graph.chatInfo", threadId: meeting.threadId, messageId: meeting.messageId },
        meetingInfo: {
          "@odata.type": "#microsoft.graph.organizerMeetingInfo",
          organizer: { "@odata.type": "#microsoft.graph.identitySet", user: { "@odata.type": "#microsoft.graph.identity", id: meeting.organizerId, tenantId: meeting.tenantId } },
          allowConversationWithoutHost: true,
        },
        tenantId: meeting.tenantId ?? config.teams.tenantId,
        source: { "@odata.type": "#microsoft.graph.participantInfo", identity: { "@odata.type": "#microsoft.graph.identitySet", application: { "@odata.type": "#microsoft.graph.identity", id: config.teams.appId, displayName: opts.displayName } } },
      }),
    });
    if (!res.ok) throw new Error(`Teams join failed (${res.status}): ${await res.text()}`);
    this.callId = ((await res.json()) as { id: string }).id;
  }

  /** Called by the HTTP layer for Graph notifications posted to TEAMS_CALLBACK_URL. */
  handleNotification(body: { value?: Array<{ resourceData?: { state?: string } }> }) {
    for (const n of body.value ?? []) if (n.resourceData?.state === "terminated") this.events?.onEnded("meeting_ended");
  }

  async speak(_text: string, speech: SpeechResult): Promise<void> {
    if (!this.callId || !speech.audioUrl) return;
    await fetch(`https://graph.microsoft.com/v1.0/communications/calls/${this.callId}/playPrompt`, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${this.token}` },
      body: JSON.stringify({ prompts: [{ "@odata.type": "#microsoft.graph.mediaPrompt", mediaInfo: { uri: speech.audioUrl, resourceId: crypto.randomUUID() } }] }),
    });
  }

  async postChat(): Promise<void> {}

  async leave(): Promise<void> {
    if (!this.callId) return;
    await fetch(`https://graph.microsoft.com/v1.0/communications/calls/${this.callId}`, { method: "DELETE", headers: { authorization: `Bearer ${this.token}` } }).catch(() => undefined);
  }
}
