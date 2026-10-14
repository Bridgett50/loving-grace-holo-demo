import {
  authorizeTwinAction,
  badgeLabel,
  bindingRefusal,
  botDisplayName,
  chatNotice,
  classifyIncoming,
  createContentCredential,
  DisclosureTracker,
  embedTextWatermark,
  isConsentActive,
  isRecordingObjection,
  isVerified,
  LatencyMonitor,
  Ledger,
  recordingNotice,
  screenOutgoing,
  SessionGuard,
  spokenIntro,
  summarizeTranscript,
  summaryToMarkdown,
  type ConsentRecord,
  type ContentCredential,
  type KnowledgeDoc,
  type MediaMode,
  type MeetingSummary,
  type OwnerVerification,
  type Persona,
  type Platform,
  type PreflightResult,
  type SessionLogEntry,
  type TranscriptLine,
  type TwinLook,
} from "@second-seat/core";
import { adapterChain, type MeetingAdapter } from "./adapters";
import { DemoMeetingAdapter } from "./adapters/demo";
import { config } from "./config";
import { makeAvatar, makeBrain, makeVoice, type AvatarProvider, type Brain, type DemoFault, type VoiceProvider } from "./providers";

export interface StartSessionRequest {
  actorId: string;
  twin: {
    id: string;
    ownerId: string;
    displayName: string;
    look: TwinLook;
    persona: Persona;
    backgroundCss: string;
    backgroundImageUrl?: string;
    voiceModelReady: boolean;
    avatarModelReady: boolean;
    scanAssetId?: string;
  };
  verification?: OwnerVerification;
  consent?: ConsentRecord | null;
  knowledge: KnowledgeDoc[];
  meeting: { platform: Platform; joinUrl?: string; title: string; eventId?: string };
  meetingAuthorized: boolean;
  mode: MediaMode;
  voiceOnlyFallback: boolean;
  capMinutes?: number;
  demoFault?: DemoFault;
}

export interface TwinUtterance {
  id: number;
  at: string;
  text: string;
  kind: "disclosure" | "answer" | "refusal" | "coach" | "handoff" | "relay";
}

/** A question the twin couldn't answer from notes, routed to the owner live ("Ask me"). */
export interface OwnerQuestion {
  id: string;
  askedAt: string;
  askedBy: string;
  question: string;
  status: "pending" | "answered" | "follow_up";
  answer?: string;
  resolvedAt?: string;
}

export interface SessionDeps {
  ledger: Ledger;
  adapters?: MeetingAdapter[];
  voice?: VoiceProvider;
  avatar?: AvatarProvider;
  brain?: Brain;
  /** Simulated speech-to-text latency when the adapter does not report it. */
  sttMs?: number;
  /** How long the twin waits for the owner to answer an "Ask me" question before promising a follow-up. */
  askOwnerTimeoutMs?: number;
  onFinalized?: (s: SessionRunner) => void;
}

let counter = 0;

export class SessionRunner {
  readonly id: string;
  readonly createdAt = new Date().toISOString();
  readonly guard: SessionGuard;
  readonly disclosure = new DisclosureTracker();
  readonly latency = new LatencyMonitor();
  readonly transcript: TranscriptLine[] = [];
  readonly utterances: TwinUtterance[] = [];
  readonly flagged: string[] = [];
  readonly notes: SessionLogEntry[] = [];
  readonly questions: OwnerQuestion[] = [];
  preflight?: PreflightResult;
  adapter?: MeetingAdapter;
  adapterAttempts: Array<{ adapter: string; ok: boolean; error?: string }> = [];
  takeover = false;
  transcriptionPaused = false;
  whispers: KnowledgeDoc[] = [];
  summary?: MeetingSummary;
  summaryMarkdown?: string;
  credential?: ContentCredential;
  settlement?: { chargedCents: number; refundedCents: number };
  private timer?: ReturnType<typeof setInterval>;
  private speaking: Promise<void> = Promise.resolve();
  private finalized = false;
  private readonly voice: VoiceProvider;
  private readonly avatar: AvatarProvider;
  private readonly brain: Brain;
  private readonly adapters: MeetingAdapter[];
  private readonly first: string;

  constructor(readonly req: StartSessionRequest, private readonly deps: SessionDeps) {
    counter += 1;
    this.id = `sess_${Date.now().toString(36)}${counter.toString(36)}`;
    const capMinutes = Math.min(Math.max(1, req.capMinutes ?? config.defaultCapMinutes), config.maxCapMinutes);
    this.guard = new SessionGuard({ ratePerMinuteCents: config.ratePerMinuteCents, capMinutes, mode: req.mode, voiceOnlyFallback: req.voiceOnlyFallback });
    this.voice = deps.voice ?? makeVoice();
    this.avatar = deps.avatar ?? makeAvatar(this.id, req.twin.look, req.demoFault ?? "none", req.twin.scanAssetId);
    this.brain = deps.brain ?? makeBrain();
    this.adapters = deps.adapters ?? adapterChain(req.meeting.platform, { demoJoinFails: req.demoFault === "join_fail" });
    this.first = req.twin.displayName.split(" ")[0];
  }

  private log(level: SessionLogEntry["level"], event: string, detail?: Record<string, unknown>) {
    this.notes.push({ at: new Date().toISOString(), level, event, detail });
  }

  /** Pre-flight, reserve, join. Resolves once the session is running or has been blocked/failed. */
  async start(): Promise<void> {
    const { req } = this;
    const now = Date.now();
    const auth = authorizeTwinAction({ actorId: req.actorId, action: "run", twin: req.twin, verification: req.verification, consent: req.consent });
    if (!auth.ok) this.log("warn", "authorization_failed", { reason: auth.reason });
    this.preflight = this.guard.preflight(
      {
        ownerVerified: auth.ok && isVerified(req.verification) && req.actorId === req.twin.ownerId,
        consentActive: isConsentActive(req.consent),
        consentScopes: req.consent && !req.consent.revokedAt ? req.consent.scopes : [],
        meetingAuthorized: req.meetingAuthorized,
        avatarReady: req.twin.avatarModelReady,
        voiceReady: req.twin.voiceModelReady,
        balanceCents: this.deps.ledger.availableCents,
        roomName: `ss-${this.id}`,
      },
      now,
    );
    if (!this.preflight.ok) {
      if (auth.reason && !this.preflight.reasons.includes(auth.reason)) this.preflight.reasons.unshift(auth.reason);
      this.finalize();
      return;
    }

    this.deps.ledger.reserve(this.id, this.guard.reservation);
    this.guard.start(`ss-${this.id}`, now);
    this.timer = setInterval(() => this.tick(), config.tickMs);

    for (const adapter of this.adapters) {
      try {
        await adapter.join(
          {
            sessionId: this.id,
            joinUrl: req.meeting.joinUrl,
            meetingTitle: req.meeting.title,
            displayName: botDisplayName(req.twin.displayName),
            ownerName: req.twin.displayName,
            backgroundCss: req.twin.backgroundCss,
            backgroundImageUrl: req.twin.backgroundImageUrl,
            wantVideo: this.guard.config.mode === "full",
          },
          {
            onSpeech: (speaker, text) => void this.onSpeech(speaker, text),
            onEnded: (reason, detail) => {
              this.log("info", "meeting_left", { reason, detail });
              this.end("meeting_ended");
            },
          },
        );
        this.adapter = adapter;
        this.adapterAttempts.push({ adapter: adapter.name, ok: true });
        break;
      } catch (e) {
        const error = e instanceof Error ? e.message : String(e);
        this.adapterAttempts.push({ adapter: adapter.name, ok: false, error });
        this.log("warn", "adapter_join_failed", { adapter: adapter.name, error });
        await adapter.leave().catch(() => undefined);
      }
    }
    if (this.guard.isTerminal) return;
    if (!this.adapter) {
      this.guard.joinFailed(Date.now(), this.adapterAttempts.map((a) => `${a.adapter}: ${a.error}`).join("; "));
      this.finalize();
      return;
    }

    const caps = this.adapter.capabilities;
    if (!caps.voice) this.guard.downgradeMode("listen_only", Date.now());
    else if (!caps.video) this.guard.downgradeMode("voice_only", Date.now());
    this.guard.joined(Date.now());

    if (this.guard.config.mode === "listen_only") {
      await this.adapter.postChat(chatNotice(req.twin.displayName)).catch(() => undefined);
      this.disclosure.mark("chat_notice");
      this.disclosure.mark("intro");
      this.disclosure.mark("recording_notice");
      this.log("info", "disclosed_in_chat");
      return;
    }
    try {
      await this.avatar.start({ video: () => this.guard.videoFrame(Date.now()), audio: () => this.guard.audioFrame(Date.now()) });
      if (this.guard.config.mode === "voice_only") this.avatar.stopVideo();
    } catch (e) {
      this.log("error", "avatar_start_failed", { error: String(e) });
    }
  }

  private tick() {
    if (this.finalized) return;
    const fired = this.guard.tick(Date.now());
    for (const f of fired) {
      if (f === "silence_retry") {
        this.log("warn", "avatar_restart");
        void this.avatar.restart();
      }
      if (f === "degraded_voice_only") {
        this.avatar.stopVideo();
        this.log("warn", "voice_only_fallback", { cause: "video" });
      }
    }
    if (this.guard.isTerminal) {
      this.finalize();
      return;
    }
    if (this.guard.isLive && !this.disclosure.has("intro")) void this.deliverDisclosure();
    const timeout = this.deps.askOwnerTimeoutMs ?? config.askOwnerTimeoutMs;
    for (const q of this.questions) {
      if (q.status === "pending" && Date.now() - Date.parse(q.askedAt) > timeout) void this.deferQuestion(q.id);
    }
  }

  private async deliverDisclosure() {
    const name = this.req.twin.displayName;
    this.disclosure.mark("intro");
    await this.adapter?.postChat(chatNotice(name)).catch(() => undefined);
    this.disclosure.mark("chat_notice");
    await this.say(spokenIntro(name, this.guard.config.mode), "disclosure", true);
    await this.say(recordingNotice(name), "disclosure", true);
    this.disclosure.mark("recording_notice");
  }

  async onSpeech(speaker: string, text: string): Promise<void> {
    if (this.guard.isTerminal) return;
    const at = new Date().toISOString();
    if (this.transcriptionPaused) {
      if (this.transcript.at(-1)?.text !== "[Transcription paused at a participant's request]") {
        this.transcript.push({ at, speaker: "System", text: "[Transcription paused at a participant's request]", isTwin: false });
      }
    } else {
      this.transcript.push({ at, speaker, text, isTwin: false });
    }

    if (isRecordingObjection(text)) {
      this.transcriptionPaused = true;
      this.flagged.push(`${speaker} objected to recording; transcription was paused.`);
      this.log("warn", "recording_objection", { speaker });
      if (this.guard.config.mode !== "listen_only" && !this.takeover) {
        await this.say(`Understood, ${speaker.split(" ")[0]}. I've stopped transcribing. ${this.first} will only get notes up to this point.`, "answer");
      }
      return;
    }

    const c = classifyIncoming(text, this.req.twin.persona.restrictedTopics);
    const addressed = new RegExp(`\\b(${this.first}|twin)\\b`, "i").test(text);

    if (c.intent === "binding_request") {
      this.flagged.push(`${speaker} asked for a binding commitment: "${text}". Needs ${this.first} personally.`);
    } else if (c.intent === "restricted_topic" && addressed) {
      this.flagged.push(`${speaker} raised a restricted topic (${c.matched}): "${text}".`);
    }

    if (this.guard.config.mode === "listen_only" || this.takeover || !this.disclosure.complete) return;

    if (c.intent === "binding_request") {
      await this.say(bindingRefusal(this.req.twin.displayName), "refusal");
      return;
    }
    if (c.intent === "restricted_topic" && addressed) {
      await this.say(`That's something ${this.first} handles personally. ${this.req.twin.persona.deferralPhrase}`, "answer");
      return;
    }
    if ((c.intent === "question" && addressed) || (c.intent === "question" && this.directlyAsked(text))) {
      const docs = [...this.whispers, ...this.req.knowledge];
      let answer;
      try {
        answer = await this.brain.answer(text, docs, this.req.twin.persona, this.req.twin.displayName);
      } catch (e) {
        this.log("error", "brain_failed", { error: String(e) });
        answer = { text: this.req.twin.persona.deferralPhrase, sources: [], confident: false, latencyMs: 0 };
      }
      if (!answer.confident) {
        await this.askOwner(speaker, text);
        return;
      }
      await this.say(answer.text, "answer", false, answer.latencyMs);
    }
  }

  /**
   * "Ask me": instead of a dead-end "I don't know", the twin tells the room it is checking, and the
   * owner gets the question live (console, and phone when connected). The answer is relayed, labeled
   * as coming from the owner, and remembered for the rest of the meeting.
   */
  private async askOwner(speaker: string, question: string) {
    const q: OwnerQuestion = { id: `q${this.questions.length + 1}`, askedAt: new Date().toISOString(), askedBy: speaker, question, status: "pending" };
    this.questions.push(q);
    this.log("info", "asked_owner", { questionId: q.id, speaker });
    await this.say(`Good question, ${speaker.split(" ")[0]}. That isn't in my notes, so I'm checking with ${this.first} right now and I'll come back to it.`, "answer");
  }

  async answerQuestion(id: string, answer: string): Promise<void> {
    const q = this.questions.find((x) => x.id === id);
    if (!q || q.status !== "pending" || this.guard.isTerminal || !answer) return;
    q.status = "answered";
    q.answer = answer;
    q.resolvedAt = new Date().toISOString();
    this.whispers.unshift({ id: `answer_${q.id}`, twinId: this.req.twin.id, title: q.question, content: answer, source: "note", createdAt: q.resolvedAt });
    this.log("info", "owner_answered", { questionId: q.id });
    await this.say(`${this.first} just replied to ${q.askedBy.split(" ")[0]}'s question: ${answer}`, "relay");
  }

  async deferQuestion(id: string, silent = false): Promise<void> {
    const q = this.questions.find((x) => x.id === id);
    if (!q || q.status !== "pending") return;
    q.status = "follow_up";
    q.resolvedAt = new Date().toISOString();
    this.flagged.push(`Follow up with ${q.askedBy}: "${q.question}"`);
    if (!silent && !this.guard.isTerminal) await this.say(`${this.first} will follow up with you directly on that after the meeting, ${q.askedBy.split(" ")[0]}.`, "answer");
  }

  /** "Can you share X with the team?" right after the twin spoke counts as addressed to the twin. */
  private directlyAsked(text: string): boolean {
    return this.transcript.at(-2)?.isTwin === true && /\byou\b/i.test(text);
  }

  /** Every utterance goes through the guardrail screen and the disclosure check. Serialized. */
  say(text: string, kind: TwinUtterance["kind"], isDisclosure = false, llmMs = 0): Promise<void> {
    const run = async () => {
      if (this.guard.isTerminal || this.guard.config.mode === "listen_only") return;
      if (!isDisclosure) {
        if (!this.disclosure.complete) return;
        if (this.takeover && kind !== "handoff") return;
      }
      const screened = screenOutgoing(text, this.req.twin.displayName);
      if (!screened.allowed) {
        this.log("warn", "outgoing_blocked", { violations: screened.violations });
        if (kind !== "refusal") this.flagged.push(`Blocked the twin from saying something binding (${screened.violations.join(", ")}).`);
      }
      const speech = await this.voice.synthesize(screened.text, this.req.twin.id);
      const avatarStage = this.guard.config.mode === "full" && this.guard.state === "live" ? await this.avatar.speak(speech) : { latencyMs: 0 };
      await this.adapter?.speak(screened.text, speech).catch((e) => this.log("error", "adapter_speak_failed", { error: String(e) }));
      const now = Date.now();
      this.guard.twinSpoke(now);
      const at = new Date(now).toISOString();
      this.transcript.push({ at, speaker: `${this.req.twin.displayName} (AI Twin)`, text: screened.text, isTwin: true });
      this.utterances.push({ id: this.utterances.length + 1, at, text: screened.text, kind: screened.allowed ? kind : "refusal" });
      if (!isDisclosure) {
        this.latency.record({ sttMs: this.deps.sttMs ?? 180, llmMs, ttsMs: speech.latencyMs, avatarMs: avatarStage.latencyMs, networkMs: 60 });
        if (this.latency.decide() === "fallback_voice_only" && this.guard.state === "live") {
          this.guard.fallbackToVoiceOnly(now, "latency");
          this.avatar.stopVideo();
          this.log("warn", "voice_only_fallback", { cause: "latency", medianMs: this.latency.medianMs });
        }
      }
    };
    this.speaking = this.speaking.then(run, run);
    return this.speaking;
  }

  async coach(text: string, kind: "whisper" | "say"): Promise<void> {
    if (this.guard.isTerminal) return;
    this.log("info", "coach", { kind });
    if (kind === "say") {
      await this.say(text, "coach");
    } else {
      this.whispers.unshift({ id: `whisper_${this.whispers.length + 1}`, twinId: this.req.twin.id, title: `Live guidance from ${this.first}`, content: text, source: "note", createdAt: new Date().toISOString() });
    }
  }

  async setTakeover(on: boolean): Promise<void> {
    if (this.guard.isTerminal || this.takeover === on) return;
    if (on) {
      await this.say(`${this.first} is joining live now and will take it from here.`, "handoff");
      this.takeover = true;
      this.log("info", "takeover_started");
    } else {
      this.takeover = false;
      this.log("info", "takeover_ended");
      await this.say(`${this.first} has handed back to me, ${badgeLabel(this.req.twin.displayName).toLowerCase()}.`, "handoff");
    }
  }

  /** Owner's own words while in takeover. Labeled as the owner, never voiced by the clone. */
  ownerSays(text: string) {
    if (!this.takeover || this.guard.isTerminal) return;
    this.transcript.push({ at: new Date().toISOString(), speaker: `${this.req.twin.displayName} (live)`, text, isTwin: false });
    void this.adapter?.postChat(`${this.req.twin.displayName} (live): ${text}`).catch(() => undefined);
  }

  demoSay(speaker: string, text: string) {
    if (this.adapter instanceof DemoMeetingAdapter) this.adapter.injectSpeech(speaker, text);
  }

  end(reason: "owner_ended" | "meeting_ended" | "kill_switch" | "consent_revoked" | "owner_takeover"): void {
    if (this.guard.isTerminal) return this.finalize();
    if (reason === "kill_switch" || reason === "consent_revoked") this.guard.fail(Date.now(), reason);
    else this.guard.end(Date.now(), reason);
    this.finalize();
  }

  private finalize() {
    if (this.finalized) return;
    this.finalized = true;
    clearInterval(this.timer);
    for (const q of this.questions) if (q.status === "pending") void this.deferQuestion(q.id, true);
    this.avatar.stop();
    void this.adapter?.leave().catch(() => undefined);
    const billing = this.guard.snapshot.billing;
    if (billing && billing.reservedCents > 0) this.settlement = this.deps.ledger.settle(this.id, billing);
    if (this.guard.snapshot.joinedAt !== undefined) {
      this.summary = summarizeTranscript(this.transcript, this.flagged, this.req.twin.displayName);
      this.summaryMarkdown = embedTextWatermark(summaryToMarkdown(this.req.meeting.title, this.summary), this.id);
      void createContentCredential(
        { asset: this.summaryMarkdown, assetType: "summary", ownerName: this.req.twin.displayName, twinId: this.req.twin.id, sessionId: this.id },
        config.credentialSecret,
      ).then((c) => {
        this.credential = c;
        this.deps.onFinalized?.(this);
      });
    } else {
      this.deps.onFinalized?.(this);
    }
  }

  view() {
    const g = this.guard.snapshot;
    const now = Date.now();
    return {
      id: this.id,
      createdAt: this.createdAt,
      ownerId: this.req.twin.ownerId,
      twinId: this.req.twin.id,
      twinName: this.req.twin.displayName,
      badge: badgeLabel(this.req.twin.displayName),
      meeting: this.req.meeting,
      mode: this.guard.config.mode,
      state: g.state,
      endReason: g.endReason,
      preflight: this.preflight,
      adapter: this.adapter?.name,
      adapterAttempts: this.adapterAttempts,
      providers: { voice: this.voice.name, voiceCloned: this.voice.cloned, avatar: this.avatar.name, brain: this.brain.name },
      takeover: this.takeover,
      transcriptionPaused: this.transcriptionPaused,
      disclosure: { intro: this.disclosure.has("intro"), recordingNotice: this.disclosure.has("recording_notice"), chatNotice: this.disclosure.has("chat_notice") },
      safeguards: {
        capMinutes: this.guard.config.capMinutes,
        ratePerMinuteCents: this.guard.config.ratePerMinuteCents,
        reservedCents: this.guard.reservation,
        noVideoTimeoutMs: this.guard.config.noVideoTimeoutMs,
        silenceTimeoutMs: this.guard.config.silenceTimeoutMs,
        videoFrames: g.videoFrames,
        audioFrames: g.audioFrames,
        firstVideoAt: g.firstVideoAt,
        firstAudioAt: g.firstAudioAt,
        joinedAt: g.joinedAt,
        liveAt: g.liveAt,
        endedAt: g.endedAt,
        liveSeconds: g.liveAt ? Math.floor(((g.endedAt ?? now) - g.liveAt) / 1000) : 0,
        waitingForMediaMs: g.state === "waiting_for_media" && g.joinedAt ? now - g.joinedAt : 0,
        degradedToVoiceOnly: g.degradedToVoiceOnly,
        silenceRetriesUsed: g.silenceRetriesUsed,
      },
      latency: { medianMs: Math.round(this.latency.medianMs), medianWithoutAvatarMs: Math.round(this.latency.medianWithoutAvatarMs), targetMs: 1000 },
      billing: g.billing,
      settlement: this.settlement,
      transcript: this.transcript,
      utterances: this.utterances,
      flagged: this.flagged,
      questions: this.questions,
      log: [...this.guard.entries, ...this.notes].sort((a, b) => a.at.localeCompare(b.at)),
      summary: this.summary,
      summaryMarkdown: this.summaryMarkdown,
      credential: this.credential,
    };
  }
}

export type SessionView = ReturnType<SessionRunner["view"]>;
