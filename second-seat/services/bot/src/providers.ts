import type { KnowledgeDoc, Persona } from "@second-seat/core";
import { answerFromKnowledge, search } from "@second-seat/core";
import { config } from "./config";

/**
 * Voice, avatar and language providers. Each has a demo implementation that needs no paid keys and
 * an HTTP client for the self-hosted, commercially licensed worker:
 *   - Voice:  OpenVoice (MIT) behind OPENVOICE_URL
 *   - Avatar: MuseTalk (MIT) for lip-sync / LivePortrait (MIT) for photo animation behind AVATAR_WORKER_URL
 *   - LLM:    any OpenAI-compatible endpoint behind LLM_BASE_URL (optional; retrieval-only otherwise)
 * Workers publish media into a LiveKit room (Apache-2.0) that the meeting adapter forwards into the call.
 */

export interface SpeechResult {
  /** Duration of the synthesized audio. */
  audioMs: number;
  /** Time to first audio byte. */
  latencyMs: number;
  audioUrl?: string;
}

export interface VoiceProvider {
  readonly name: string;
  readonly cloned: boolean;
  synthesize(text: string, voiceId: string): Promise<SpeechResult>;
}

/** Estimates speech duration at ~150 wpm. The browser preview speaks it with the system voice. */
export class DemoVoice implements VoiceProvider {
  readonly name = "demo-voice";
  readonly cloned = false;
  async synthesize(text: string): Promise<SpeechResult> {
    const words = text.split(/\s+/).length;
    return { audioMs: Math.max(800, (words / 150) * 60_000), latencyMs: 140 + Math.round(Math.random() * 60) };
  }
}

export class OpenVoiceHttp implements VoiceProvider {
  readonly name = "openvoice";
  readonly cloned = true;
  constructor(private readonly url: string) {}
  async synthesize(text: string, voiceId: string): Promise<SpeechResult> {
    const t0 = performance.now();
    const res = await fetch(`${this.url}/synthesize`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ text, voice_id: voiceId, stream: true }),
    });
    if (!res.ok) throw new Error(`OpenVoice worker error ${res.status}`);
    const body = (await res.json()) as { audio_url: string; duration_ms: number };
    return { audioMs: body.duration_ms, latencyMs: Math.round(performance.now() - t0), audioUrl: body.audio_url };
  }
}

export interface AvatarFrameSink {
  video(): void;
  audio(): void;
}

export interface AvatarProvider {
  readonly name: string;
  start(sink: AvatarFrameSink): Promise<void>;
  /** Drive lip-sync for an utterance; resolves with the avatar stage latency. */
  speak(speech: SpeechResult): Promise<{ latencyMs: number }>;
  restart(): Promise<void>;
  stopVideo(): void;
  stop(): void;
}

export type DemoFault = "none" | "no_video" | "avatar_silent" | "join_fail" | "slow_avatar";

/** Emits synthetic frames at 5 fps (enough for the watchdogs) and supports fault injection. */
export class DemoAvatar implements AvatarProvider {
  readonly name = "demo-avatar";
  private timer?: ReturnType<typeof setInterval>;
  private videoOn = true;
  private audioOn = true;
  private startedAt = 0;
  private sink?: AvatarFrameSink;

  constructor(private readonly fault: DemoFault = "none") {}

  async start(sink: AvatarFrameSink): Promise<void> {
    this.sink = sink;
    this.startedAt = Date.now();
    this.videoOn = this.fault !== "no_video";
    this.loop();
  }

  private loop() {
    clearInterval(this.timer);
    this.timer = setInterval(() => {
      if (this.fault === "avatar_silent" && Date.now() - this.startedAt > 8_000) this.audioOn = false;
      if (this.videoOn) this.sink?.video();
      if (this.audioOn) this.sink?.audio();
    }, 200);
  }

  async speak(): Promise<{ latencyMs: number }> {
    return { latencyMs: this.fault === "slow_avatar" ? 900 : 90 + Math.round(Math.random() * 40) };
  }

  async restart(): Promise<void> {
    this.loop();
  }

  stopVideo(): void {
    this.videoOn = false;
  }

  stop(): void {
    clearInterval(this.timer);
    this.timer = undefined;
  }
}

/**
 * Client for the self-hosted avatar worker. The worker joins the LiveKit room and reports frame
 * statistics back over server-sent events, which feed the session guard.
 */
export class AvatarWorkerHttp implements AvatarProvider {
  readonly name = "avatar-worker";
  private abort?: AbortController;
  constructor(
    private readonly url: string,
    private readonly sessionId: string,
    private readonly look: "realistic" | "stylized",
    private readonly referenceAssetId?: string,
  ) {}

  async start(sink: AvatarFrameSink): Promise<void> {
    const res = await fetch(`${this.url}/sessions`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        session_id: this.sessionId,
        look: this.look,
        reference_asset_id: this.referenceAssetId,
        engine: this.look === "realistic" ? "liveportrait+musetalk" : "stylized-3d",
        watermark: true,
      }),
    });
    if (!res.ok) throw new Error(`Avatar worker error ${res.status}`);
    this.abort = new AbortController();
    void this.consumeStats(sink, this.abort.signal);
  }

  private async consumeStats(sink: AvatarFrameSink, signal: AbortSignal) {
    const res = await fetch(`${this.url}/sessions/${this.sessionId}/stats`, { signal });
    const reader = res.body?.getReader();
    const dec = new TextDecoder();
    while (reader) {
      const { value, done } = await reader.read();
      if (done) break;
      for (const line of dec.decode(value).split("\n")) {
        if (line.includes("video")) sink.video();
        if (line.includes("audio")) sink.audio();
      }
    }
  }

  async speak(speech: SpeechResult): Promise<{ latencyMs: number }> {
    const t0 = performance.now();
    await fetch(`${this.url}/sessions/${this.sessionId}/speak`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ audio_url: speech.audioUrl }),
    });
    return { latencyMs: Math.round(performance.now() - t0) };
  }

  async restart(): Promise<void> {
    await fetch(`${this.url}/sessions/${this.sessionId}/restart`, { method: "POST" });
  }

  stopVideo(): void {
    void fetch(`${this.url}/sessions/${this.sessionId}/video`, { method: "DELETE" });
  }

  stop(): void {
    this.abort?.abort();
    void fetch(`${this.url}/sessions/${this.sessionId}`, { method: "DELETE" }).catch(() => undefined);
  }
}

export interface AnswerResult {
  text: string;
  sources: string[];
  confident: boolean;
  latencyMs: number;
}

export interface Brain {
  readonly name: string;
  answer(question: string, docs: KnowledgeDoc[], persona: Persona, ownerName: string): Promise<AnswerResult>;
}

export class RetrievalBrain implements Brain {
  readonly name = "retrieval";
  async answer(question: string, docs: KnowledgeDoc[], persona: Persona): Promise<AnswerResult> {
    const t0 = performance.now();
    const a = answerFromKnowledge(question, docs, persona);
    return { text: a.answer, sources: a.sources.map((s) => s.title), confident: a.confident, latencyMs: Math.round(performance.now() - t0) + 40 };
  }
}

export class OpenAICompatibleBrain implements Brain {
  readonly name = "llm";
  constructor(private readonly baseUrl: string, private readonly apiKey: string, private readonly model: string) {}

  async answer(question: string, docs: KnowledgeDoc[], persona: Persona, ownerName: string): Promise<AnswerResult> {
    const t0 = performance.now();
    const hits = search(question, docs, 4);
    if (!hits.length) return { text: persona.deferralPhrase, sources: [], confident: false, latencyMs: 0 };
    const context = hits.map((h, i) => `[${i + 1}] ${h.chunk.title}: ${h.chunk.text}`).join("\n");
    const res = await fetch(`${this.baseUrl}/chat/completions`, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${this.apiKey}` },
      body: JSON.stringify({
        model: this.model,
        temperature: 0.2,
        max_tokens: 120,
        messages: [
          {
            role: "system",
            content: [
              `You are the AI twin of ${ownerName}, speaking in a live meeting. You are not ${ownerName}; never claim to be human.`,
              `Role: ${persona.role}. Tone: ${persona.tone}.`,
              "Answer in one or two short spoken sentences using ONLY the notes below.",
              `If the notes do not contain the answer, reply exactly: "${persona.deferralPhrase}"`,
              "Never agree to contracts, payments, prices, signatures or any commitment.",
              `Never discuss: ${persona.restrictedTopics.join(", ") || "n/a"}.`,
              `Notes:\n${context}`,
            ].join("\n"),
          },
          { role: "user", content: question },
        ],
      }),
    });
    if (!res.ok) throw new Error(`LLM error ${res.status}`);
    const body = (await res.json()) as { choices: Array<{ message: { content: string } }> };
    const text = body.choices[0]?.message.content.trim() || persona.deferralPhrase;
    return { text, sources: hits.map((h) => h.chunk.title), confident: text !== persona.deferralPhrase, latencyMs: Math.round(performance.now() - t0) };
  }
}

export function makeBrain(): Brain {
  return config.llm.baseUrl && config.llm.apiKey ? new OpenAICompatibleBrain(config.llm.baseUrl, config.llm.apiKey, config.llm.model) : new RetrievalBrain();
}

export function makeVoice(): VoiceProvider {
  return config.voice.openVoiceUrl ? new OpenVoiceHttp(config.voice.openVoiceUrl) : new DemoVoice();
}

export function makeAvatar(sessionId: string, look: "realistic" | "stylized", fault: DemoFault, referenceAssetId?: string): AvatarProvider {
  return config.avatar.workerUrl ? new AvatarWorkerHttp(config.avatar.workerUrl, sessionId, look, referenceAssetId) : new DemoAvatar(fault);
}
