# Second Seat by Loving Grace

> **Reviewers:** see [REVIEWERS.md](REVIEWERS.md) for the 3-minute guided path — live demo, safeguard core, architecture, and an honest status table.

An AI meeting twin that takes your seat when you can't be there. You scan your face and record a short voice sample once. Once platform integrations are live, your verified twin will be able to join Google Meet, Zoom and Teams with your likeness and cloned voice. It answers from your notes and posts a transcript, notes and action items afterwards. It always tells the room it is an AI. Contract, payment, and offer-acceptance capabilities are forbidden in its code, and commitment asks are refused and flagged for the owner; its pattern-based language screen has documented coverage limits (see REVIEWERS.md).

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

Run each service alone with `pnpm dev:web` or `pnpm dev:bot`. **Watch a live demo** on the home page skips onboarding: it creates a sample twin and drops you straight into a meeting.

## What makes it AI-native

*The loop below is the design target. Ask-me-live, relay, coach and takeover are specified and gated, not yet live in demo mode.*

- **Ask me, live.** When a question isn't in your notes, the twin doesn't make something up. It tells the room it's checking with you, and the question pops up on your screen. Your answer is relayed into the meeting within seconds. If you don't answer, the twin promises a follow-up and tracks it for you.
- **Pre-meeting brief.** For every calendar event the twin shows who's coming, what it can answer, what was left open last time and what it will defer, along with a readiness score that tells you which notes to add.
- **Follow-through.** After each meeting it drafts the recap email and suggests memories (your live answers, the decisions) that you approve into its knowledge with one click. Every meeting makes it smarter, and only with your approval.
- **Ask your meetings.** Search everything your twin heard and everything in your notes. Each answer cites who said it and in which meeting.
- **Coach and takeover.** You can whisper private guidance into its next answer, or take the seat yourself at any moment.

## Put it online

The fastest path is a public demo link: every visitor gets their own private sandbox, and no API keys are needed. `render.yaml` (at the repo root) and the `Dockerfile` handle it, and [docs/DEPLOY.md](docs/DEPLOY.md) has the step-by-step guide.

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

Every transcript and summary carries a C2PA-style content credential and an invisible text watermark. Before anything is said, the outgoing text is screened against binding-language patterns (contracts, payments, signatures, commitments); a match is replaced by a refusal that defers to the owner. The screen is pattern-based and its coverage is limited: it blocks "I agree to the terms of the contract." and currently allows "We accept your offer." and "Approved. Please proceed with the purchase." Widening that coverage is named hackathon work. The cost safeguards are:

- the balance is checked and reserved before joining;
- a session is billed only after the first video *and* audio frames;
- the session stops after 20 s with no video or when the avatar goes silent;
- each session has a hard minute cap;
- a failed session is refunded automatically.

Full details are in [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Going beyond demo mode

See [docs/SETUP.md](docs/SETUP.md) to connect real meetings, voice and avatar workers. [docs/PLATFORM_APPROVALS.md](docs/PLATFORM_APPROVALS.md) lists everything that needs paid services or platform approval (Zoom Marketplace, Teams admin consent and more). [docs/LICENSES.md](docs/LICENSES.md) has the license audit.

## Demo walkthrough

A narrated tour of the twin meeting room for recording the demo video. All
names, meetings, and numbers below are made-up. Local only: no deploy, no
live meeting, no email is ever sent (sending uses an in-browser test fake).

Start the web app locally and open the guided flow:

```bash
cd second-seat
pnpm install
pnpm dev                  # web on http://localhost:4310
```

Then open http://localhost:4310/meeting-room?demo=1. The **Guided demo** card
appears above the room. Press **Next step**, Right arrow, or `N` to advance
one step at a time (`R` restarts; keys typed into inputs are ignored).

Walk the nine steps in order, saying and showing this at each one:

1. **Join the Q3 launch sync.** Say: "This is a synthetic meeting; my twin
   joins from my permitted notes only." Show the room view: owner switcher
   (Bridgett Sanders), twin identity, and the selected meeting title.
2. **Send owner guidance.** Say: "I privately steer the next answer — the
   guidance never goes to participants or into the package." Show the
   guidance entry.
3. **Stream the twin's steered answer.** Say: "The twin answers live from
   the scripted transcript, steered by my guidance." Show the transcript
   lines appearing with the steered-line marker.
4. **Include the action-items plugin output.** Say: "A local plugin proposes
   action items; I include the proposal into the package." Show the Plugins
   panel status flipping to included and the package body growing.
5. **Approve the exact package.** Say: "Approval binds to the sha256 of the
   exact shown body — editing the draft would clear it." Show the sha256
   and the approved state.
6. **Send through the test fake transport.** Say: "Send runs once through a
   test fake; nothing leaves the browser." Show the sent state and the
   transport recording exactly one body.
7. **Compare imported text.** Say: "An imported draft is diffed field by
   field against the approved package." Show the comparison view with no
   mismatch flags for the identical round-trip.
8. **Evidence record.** Say: "Approval and send are saved to an evidence
   record with redaction metadata." Show the Evidence record card (hash,
   times, principal, redactions, takeover events) and the Export evidence
   JSON download.
9. **Take over.** Say: "I take the seat; the twin pauses and new lines are
   refused." Show the paused status and the refusal reason on the next
   streamed line.

The keyboard shortcut is Right arrow / `N` for next and `R` for restart.
The owner-guidance moment is step 3 (private steering, marked in the
transcript and logged redacted in the evidence record); the takeover moment
is step 9 and always comes last (the twin pauses, and streaming, plugins,
approval, and sending are refused afterwards). The compare/evidence view is
steps 7–8 (clean field-by-field comparison, then the exportable record).

Run the same flow headlessly any time (no browser needed):

```bash
node second-seat/scripts/demo-e2e.mjs
```

It drives every guided step against a real twin room through the public
demo-mode API, checks the documented end state, prints a short PASS/FAIL
summary, and exits non-zero on failure.
