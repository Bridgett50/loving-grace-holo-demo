# Second Seat by Loving Grace

An AI meeting twin that takes your seat when you can't be there. You scan your face and record a short voice sample once. Your verified twin can then join Google Meet, Zoom and Teams with your likeness and cloned voice. It answers from your notes and posts a transcript, notes and action items afterwards. It always tells the room it is an AI, and it can never agree to contracts or payments.

This repo is the MVP. It runs end to end in **demo mode** with no paid API keys.

| Path | What it is |
| --- | --- |
| `apps/web` | Next.js 16 web app (TypeScript, Tailwind, shadcn/ui) on port **4310**. Covers onboarding, the twin profile, meetings and calendar rules, the live session console (takeover and coach mode), the skills store and connections. |
| `services/bot` | Meeting bot service (Hono) on port **4317**. Contains the session runner, the platform adapters (demo, Google Meet browser bot with a Vexa fallback, Zoom Meeting SDK, Teams Graph calling), the voice, avatar and answer providers, and the safeguards. |
| `packages/core` | Shared, dependency-free logic: the session guard, the billing ledger, the contract and payment guardrails, disclosure, content credentials, ownership and consent, the latency budget, calendar rules, knowledge retrieval and meeting summaries. |
| `docs/` | Setup, architecture, licensing and platform-approval notes. The product specs and art direction this MVP follows are in the repo root's [`docs/`](../docs). |

## Run it locally

Requires Node 22.9+ and pnpm 10. Run everything from this `second-seat/` folder.

```bash
cd second-seat
pnpm install
cp .env.example .env      # optional; every value has a demo default
pnpm dev                  # web on http://localhost:4310, bot on http://localhost:4317
```

Open http://localhost:4310 and click **Create my twin**. In demo mode:

- you are the single local owner, and the identity and liveness check is simulated (you still complete the scan and the liveness challenges);
- the wallet starts at $20 and you can add demo funds;
- a scripted **Demo meeting** shows up on your calendar a few minutes out. You can also send your twin to it right away from **Meetings**;
- the **Demo fault** menu lets you watch each safeguard trigger: no video, a silent avatar, a failed join, or a slow avatar.

Run each service alone with `pnpm dev:web` or `pnpm dev:bot`.

## Checks

```bash
pnpm test        # Vitest: safeguards in packages/core + session runner/adapters in services/bot
pnpm typecheck
pnpm lint
```

## Safety model in one paragraph

Only a verified owner can create or run a twin. That requires an ID and liveness check, plus signed consent per scope: likeness, voice, joining meetings, recording and use of knowledge. The consent is stored in a consent vault and can be revoked at any time. Revoking stops all live sessions. On every join the twin:

- uses the display name "*Name* (AI Twin)" and shows an "AI Twin of *Name*" badge;
- gives a spoken intro and posts a recording-consent notice;
- stamps its video with a watermark and a content-credential mark.

Every transcript and summary carries a C2PA-style content credential and an invisible text watermark. Before anything is said, the outgoing text is screened, and anything binding (contracts, payments, signatures, commitments) becomes a refusal that defers to the owner. The cost safeguards are:

- the balance is checked and reserved before joining;
- a session is billed only after the first video *and* audio frames;
- the session stops after 20 s with no video or when the avatar goes silent;
- each session has a hard minute cap;
- a failed session is refunded automatically.

Full details are in [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Going beyond demo mode

See [docs/SETUP.md](docs/SETUP.md) to connect real meetings, voice and avatar workers. [docs/PLATFORM_APPROVALS.md](docs/PLATFORM_APPROVALS.md) lists everything that needs paid services or platform approval (Zoom Marketplace, Teams admin consent and more). [docs/LICENSES.md](docs/LICENSES.md) has the license audit.
