# Architecture

```
┌──────────── apps/web (Next.js, :4310) ────────────┐        ┌──────────── services/bot (Hono, :4317) ────────────┐
│ Onboarding → ID + liveness → consent vault        │  HTTP  │ SessionRunner (one per meeting)                     │
│ Twin profile · skills · connections               │ token  │   SessionGuard + Ledger  (packages/core)            │
│ Meetings: calendar rules, auto-join scheduler     │ ─────► │   Adapter chain: Meet browser → Vexa fallback       │
│ Live console: takeover, coach, kill switch        │        │                  Zoom Meeting SDK · Teams Graph     │
│ Server actions own all writes (owner-checked)     │ ◄───── │   Providers: voice · avatar · brain (LLM / BM25)    │
└───────────────────────────────────────────────────┘ polling│   Disclosure, guardrails, provenance, summary       │
                                                             └─────────────┬──────────────────────┬───────────────┘
                                                                           │ HTTP                 │ WebRTC (LiveKit)
                                                             OpenVoice worker (GPU)     Avatar worker (GPU): LivePortrait + MuseTalk
```

- **`packages/core`** is pure TypeScript with no I/O. Time is passed in (`now`), so every safeguard is deterministic and unit-tested.
- **`services/bot`** owns sessions and money. The web app never touches the ledger directly.
- **`apps/web`** owns identity, consent, media and notes. It sends the bot only what a session needs: the twin profile, notes, the background and verified-consent flags. The bot rejects requests that don't carry the shared service token. It also rejects actions whose `actorId` isn't the session owner.

## Session lifecycle

```
preflight ─┬─► blocked                          (no consent / not verified / balance too low / bad link)
           └─► joining ─┬─► failed ─► refunded   (every adapter in the chain failed)
                        └─► waiting_for_media ─┬─► live ─┬─► voice_only (video lost, latency over budget, if allowed)
                                               │         └─► ended     (cap, owner, meeting over, silence, kill switch)
                                               └─► failed ─► refunded   (no video within 20 s)
```

1. **Pre-flight** (`runPreflight`) checks that the owner is verified, consent is active for every scope the mode needs, the platform is supported, and the balance covers `cap × rate × 1.10`. On failure the session is `blocked` and nothing is reserved.
2. **Reserve.** The ledger holds the full capped cost, so the twin can't overspend mid-meeting.
3. **Join.** The runner tries each adapter in order and falls through on failure. Listen-only mode and adapters without video (Vexa, Teams with service-hosted media) downgrade the guard before media starts.
4. **Live only after first frames.** Billing starts at the first video frame *and* the first audio frame, not when the join happens.
5. **Watchdogs** run on every tick (250 ms):
   - No video within 20 s of joining: the session fails and is fully refunded.
   - Video lost while live: the session drops to voice-only if the owner allowed it, otherwise it ends.
   - Audio silent for 15 s: the session ends (`avatar_silent`). Only real audio frames reset this timer; the twin "speaking" doesn't.
   - The minute cap is reached: the session ends (`cap_reached`).
6. **Settle.** The owner pays for billable live seconds, with a 30 s minimum if the session went live. The rest of the reservation is released. Failed sessions refund everything (`auto_refund:<reason>`). Settlement is idempotent.

## The conversation loop

Each utterance follows the same path:

```
meeting speech ─► classifyIncoming ─► binding_request → refusal ("I can't agree to that…")
                                   ─► restricted_topic → defer to owner
                                   ─► question → brain (LLM grounded in notes, or BM25) → answer
                                                 └─ not confident → "Ask me": owner answers live → relayed answer
                     ↓
           coach whisper (if any) shapes the next answer · takeover mutes the twin
                     ↓
           screenOutgoing (last line of defence) ─► voice.synthesize ─► avatar.speak ─► adapter.speak
```

- `say()` serializes all speech, so the twin never talks over itself.
- `LatencyMonitor` tracks a 1000 ms end-to-end budget: STT 200, LLM 350, TTS 200, avatar 150, network 100. If the rolling turn time stays over budget and voice-only fallback is allowed, the session drops avatar video and keeps talking.
- **Takeover:** the owner speaks or types, and the twin stays silent until it's handed back.
- **Coach mode:** a *whisper* is private guidance applied to the next answer. *Say* makes the twin speak a line, which still passes the guardrail.
- **Ask me:** when the notes don't answer a question, the twin tells the room it is checking and the owner gets the question live. Retrieval only counts as an answer when the best note scores high enough *and* covers at least 40% of the question's key terms, so a shared word or two doesn't turn into a wrong answer. The owner's reply is relayed as "*Name* just replied…", still passes `screenOutgoing`, and is remembered for the rest of the meeting. With no reply within `ASK_OWNER_TIMEOUT_MS` (60 s by default), or when the owner chooses it, the twin promises a follow-up and adds it to the "Needs your attention" list.

## Meeting intelligence

These features live in `packages/core/src/intelligence.ts` and run locally with no paid model.

- **Pre-meeting brief** (Meetings → Brief): shows who's attending, the notes the twin will answer from, what was decided and left open last time, what it will defer, and a readiness score with tips for notes to add.
- **Follow-through** (after a session): drafts a recap email (decisions, action items, the owner's live answers, and what's still owed), and suggests *memories*, meaning the owner's answers and the decisions. The owner approves a memory into their notes with one click. Nothing is sent or saved automatically.
- **Ask your meetings** (`/ask`): searches every past transcript and note, and each answer cites its speaker and meeting.

## Public demo mode

With `DEMO_MODE=true` and `PUBLIC_DEMO=true`, `src/proxy.ts` gives each browser a random `ss_visitor` cookie (`v_<uuid>`). The cookie becomes the owner id for everything, including the twin, the wallet, sessions and notes, so visitors to a shared link never see each other's data. A request for another visitor's session gets a 404.

## Disclosure and provenance

- Display name: "*Name* (AI Twin)". The video badge reads "AI Twin of *Name*". The media shim stamps the badge and a CR mark onto every frame.
- On join: a chat notice, a spoken intro and a recording-consent notice. `DisclosureTracker` records each one. If someone objects to recording, transcription stops and the room is told.
- The transcript and summary are watermarked with an invisible zero-width tag and signed with a C2PA-style manifest (`c2pa.actions` → `created`, `digitalSourceType: trainedAlgorithmicMedia`). The demo signs it with HMAC-SHA256, and `/v1/credentials/verify` checks it. Production should sign with an X.509 certificate through the C2PA SDK (`c2pa-rs`, MIT/Apache).

## Ownership

`authorizeTwinAction` allows create, edit, run and view only for the verified owner. Verification requires an ID document plus at least two liveness challenges, and consent must be active for each scope. Revoking any consent ends live sessions right away. Deleting the twin erases the scan, voice sample, reference frames, ID images, notes and connections.

## Worker contracts

These are the self-hosted GPU workers the bot calls when their URLs are set. Keep them on a private network.

### Voice: `OPENVOICE_URL` (OpenVoice V2 + MeloTTS)

```
POST /synthesize          { text, voice_id, stream: true }
  → 200 { audio_url, duration_ms }
```

`voice_id` is the tone-color embedding the worker built from the owner's consented voice sample.

### Avatar: `AVATAR_WORKER_URL` (LivePortrait + MuseTalk, or a stylized 3D rig)

```
POST   /sessions                    { session_id, look, reference_asset_id, engine, watermark: true }
GET    /sessions/:id/stats          text/event-stream; each line containing "video" or "audio" is one frame
POST   /sessions/:id/speak          { audio_url }   → resolves when lip-sync playback starts
POST   /sessions/:id/restart
DELETE /sessions/:id/video          stop video (voice-only fallback)
DELETE /sessions/:id
```

The worker publishes into the session's LiveKit room. Browser bots (Meet, Zoom) subscribe to it through the media shim, and the Teams media worker pulls it as an application-hosted media source. Watermarking happens in the worker, before encode.

## Bot HTTP API (`/v1`, header `x-second-seat-token`)

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/health` | Providers and platforms that are live (no token) |
| GET | `/v1/wallets/:owner` | Balance, open reservations, ledger |
| POST | `/v1/wallets/:owner/topup` | Demo mode only, up to $100 |
| POST | `/v1/sessions` | Start a session (pre-flight runs here) |
| GET | `/v1/owners/:owner/sessions` | Session history |
| GET | `/v1/sessions/:id` | Live view: state, transcript, guard log, summary, credential |
| POST | `/v1/sessions/:id/{takeover,coach,owner-says,end,demo-say}` | Owner controls (`actorId` must be the owner) |
| POST | `/v1/sessions/:id/answer` | Answer an "Ask me" question (`questionId`, `text`), or `followUp: true` to defer it |
| POST | `/v1/owners/:owner/stop-all` | Kill switch / consent revoked |
| POST | `/v1/credentials/verify` | Verify a content credential |
