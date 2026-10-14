# Setup

Every integration is optional. If a variable is empty, that piece falls back to its demo implementation, and the bot's `/health` endpoint reports which providers are live:

```bash
curl -s localhost:4317/health
```

All configuration lives in one `.env` at the repo root (see [`.env.example`](../.env.example)). Both `pnpm dev:web` and `pnpm dev:bot` load it.

## 1. Local demo (no keys)

```bash
pnpm install
pnpm dev
```

- Web: http://localhost:4310. Bot: http://localhost:4317.
- Data is stored in JSON files under `apps/web/.data/` (profiles, consent, uploads) and `services/bot/.data/` (wallets, sessions). To reset, delete those folders.
- The calendar scheduler in the web app checks every 15 s and auto-joins events according to your rules. Set `AUTO_JOIN_SCHEDULER=false` to turn it off.

## 2. Leaving demo mode

Set `DEMO_MODE=false` and `BOT_SERVICE_TOKEN` to a long random value. Then:

- **Identity and liveness:** set `IDENTITY_PROVIDER` and wire the vendor's webhook so it marks the verification `verified`. Until then, real (non-demo) twins stay in `pending` and cannot be created.
- **Auth:** demo mode runs as a single local owner (`owner_demo`). For multiple users, replace `apps/web/src/lib/server/current-user.ts` with your session provider. Every server action and route already checks ownership through it.
- **Payments:** demo top-ups are disabled outside demo mode. Connect a payment processor to `Ledger.topUp` in the bot.
- **Storage:** move `.data/` to a database and object storage (encrypted at rest) before you store real biometric data.

## 3. Answers (LLM)

Point `LLM_BASE_URL`, `LLM_API_KEY` and `LLM_MODEL` at any OpenAI-compatible endpoint, such as self-hosted vLLM or Ollama, or a hosted API. Answers stay grounded in the owner's notes: the model gets only the retrieved note chunks and is told to defer when unsure. Every reply still passes the contract and payment guardrail. With no LLM configured, the twin answers by BM25 retrieval over the notes.

## 4. Voice clone (OpenVoice V2, MIT)

Run an OpenVoice V2 worker on a GPU host and set `OPENVOICE_URL`. The contract the bot expects is in [ARCHITECTURE.md](ARCHITECTURE.md#worker-contracts). Use the MIT-licensed OpenVoice V2 checkpoints with MeloTTS (MIT) as the base speaker.

## 5. Avatar (LivePortrait + MuseTalk)

Run the avatar worker on a GPU host (an NVIDIA L4 or better is needed for the under-1-second budget) and set `AVATAR_WORKER_URL`. The worker publishes video and audio into a LiveKit room (`LIVEKIT_*`), then streams frame stats back to the bot, which uses them to drive the session guard.

- **Realistic look:** LivePortrait drives head motion from the owner's reference frame, and MuseTalk drives lip-sync. Read the model-weight notes in [LICENSES.md](LICENSES.md) first. LivePortrait's default face detector (InsightFace) is non-commercial and must be swapped out.
- **Stylized 3D look:** use a rigged stylized head driven by blendshapes from the same audio features. Use your own art or CC0 assets, never a competitor's.

## 6. Google Meet

```bash
pnpm --filter @second-seat/bot add playwright
pnpm --filter @second-seat/bot exec playwright install chromium
```

The browser bot opens the Meet link, joins as "*Name* (AI Twin)", and feeds the avatar through a virtual camera and microphone (an injected `getUserMedia` shim that stamps the AI badge and the content-credential mark on every frame). It reads live captions as the transcript. The host has to admit the bot.

If the browser bot can't join (blocked, denied, or Playwright not installed), the runner falls back to **Vexa** (`VEXA_API_URL` and `VEXA_API_KEY`, self-hosted Apache-2.0 or hosted). The Vexa fallback is listen-only: it transcribes and posts notes, but doesn't speak.

## 7. Zoom (official Meeting SDK)

1. Create a **General app** with the Meeting SDK feature in the Zoom App Marketplace.
2. Set `ZOOM_MEETING_SDK_KEY` and `ZOOM_MEETING_SDK_SECRET` (the client ID and secret).
3. The bot signs an SDK JWT (HS256, role 0) and loads the Meeting SDK web Component View from Zoom's CDN in a headless browser, using the same media shim.

Joining meetings outside your own account requires Marketplace review. See [PLATFORM_APPROVALS.md](PLATFORM_APPROVALS.md).

## 8. Microsoft Teams (Bot Framework and Graph calling)

1. Register an **Azure Bot** with the Teams channel and calling enabled. Set the calling webhook to `TEAMS_CALLBACK_URL`, which must be a public HTTPS URL that forwards to the bot.
2. Grant the application permissions `Calls.JoinGroupCall.All`, `Calls.JoinGroupCallAsGuest.All`, `Calls.AccessMedia.All` and `OnlineMeetings.Read.All`, then get **tenant admin consent**.
3. Set `TEAMS_TENANT_ID`, `TEAMS_BOT_APP_ID` and `TEAMS_BOT_APP_SECRET`.

Without a media worker, the bot uses **service-hosted media**, so Teams runs voice-only (spoken prompts and the transcript). Live avatar video requires the **application-hosted media** bot, which is a .NET service on Windows Server using `Microsoft.Skype.Bots.Media`. Run that worker separately and set `TEAMS_MEDIA_WORKER_URL`.

## 9. Connections

Each connection on `/connections` needs the client credentials listed in `.env.example`. Register the OAuth redirect URI `${APP_URL}/api/connections/<id>/callback`. A connection without credentials runs in demo mode, which you can toggle in the UI. SMS (Twilio) and Telegram use API tokens, not OAuth.
