# Second Seat — Reviewer Guide

**Second Seat** by **Loving Grace Technologies, LLC** is an AI meeting twin for Google Meet, Zoom, and Microsoft Teams: it takes your seat in a meeting you cannot attend — as a clearly labeled AI participant ("{Owner} (AI Twin)"), with mandatory disclosure that it is an AI — and produces a cited brief afterward.

**Live demo:** https://app.lovinggracetechnologies.com
**Status:** MVP running end-to-end in **demo mode** (scripted demonstration, no paid API keys, no production integrations). This guide states plainly what is built, what is specified, and what is not yet real — the same framing used in the Meta Global AI Developer Hackathon application (Startup Track).

## The 3-minute path

1. **Run the live demo** (link above) — the scripted meeting shows the intended loop: join, disclose, relay, brief.
2. **Read the safeguard core** — [`packages/core`](packages/core): dependency-free TypeScript holding the session guard, contract & payment guardrails, disclosure, ownership and consent, the billing ledger, knowledge retrieval, and meeting summaries. Its unit tests live in [`packages/core/test`](packages/core/test) (Vitest).
3. **Skim the architecture** — [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).
4. **Check the honest platform status** — [`docs/PLATFORM_APPROVALS.md`](docs/PLATFORM_APPROVALS.md): the Google Meet bot path is a policy gray area, Zoom requires Marketplace review, Teams calling is voice-only today. We document the walls instead of hiding them.

## Architecture in one paragraph

`apps/web` is a Next.js 16 / TypeScript app (onboarding, twin profile, calendar rules, the live session console with coach and takeover modes). `services/bot` is the meeting bot service (Hono) with the session runner and platform adapters (demo, Google Meet browser bot with a Vexa fallback, Zoom Meeting SDK, Teams Graph calling) plus voice, avatar, and answer providers. `packages/core` is the shared, dependency-free logic both sides call — deliberately framework-free so the safety rules can be unit-tested in isolation.

## The safety design (the point of the product)

The parts that must never fail are **not** delegated to a language model:

- **Mandatory disclosure** — the twin always tells the room it is an AI.
- **Owner-only operation** — the twin runs only for its verified owner.
- **Authority limits** — contract, payment, purchase-approval, and offer-acceptance capabilities are forbidden in the capability registry; incoming commitment asks are classified and refused with an owner flag, and outgoing utterances pass a pattern-based screen whose coverage is incomplete by test (see the safety paragraph below).

These are enforced in deterministic TypeScript in `packages/core`, with unit tests — 81 tests across 7 files, all passing when run against this repo on October 15, 2026. Enforcement lives in the code layer, separate from model generation. The outgoing screen's observed behavior, checked by execution: it blocks "I agree to the terms of the contract." and currently allows "We accept your offer." — those misses are named regression targets for the hackathon build. The failure-mode choreography around those rules (watchdogs, refusal logging) is designed and documented; it is not yet verified in live conditions.

## Status — what is real today

| Area | Status |
| --- | --- |
| End-to-end demo (scripted meeting) | **Built, deployed, publicly demonstrable** |
| Deterministic safeguard core + unit tests | **Built** (`packages/core`, `packages/core/test`) |
| Architecture / setup / deploy / approvals docs | **Written** (`docs/`) |
| Live owner relay ("ask me, live"), coach & takeover | **Specified; gated** behind twin creation — not yet exercisable live |
| Cited search across past meetings | **Implemented locally** in `packages/core` (BM25 retrieval + source-metadata recall) — not yet exercised in a live meeting on the deploy |
| In-meeting disclosure in a real meeting | **Specified** — not yet verifiable in a live third-party meeting |
| Production platform integrations (Meet / Zoom / Teams) | **Not yet** — approvals pending; see `docs/PLATFORM_APPROVALS.md` |
| Production model access | **Not yet** — demo mode runs with no paid API keys by design |
| Meta Model API evidence run | **Done (Oct 15, 2026)** — Muse Spark brief from the demo transcript + mechanical citation check (7/7 entries pass), committed under `hackathon-evidence/` |
| Core test suite | **81 tests, all passing (run Oct 15, 2026)** — `pnpm --filter @second-seat/core test` |

An SME engineering audit of this repository (Oct 15, 2026), run by a separate AI-agent review team under the founder's direction, graded the product "a functional, safety-serious demo of a real product — deployed exactly as its own documentation describes." The audit report is committed at `second-seat/Second-Seat-SME-Audit-Report.md`.

## The hackathon build (Meta Global AI Developer Hackathon)

The extension proposed for the hackathon supplies the layer demo mode deliberately omits:

1. **Reasoning on Muse Spark** (Meta Model API) — the evidence-linked meeting brief moves from scripted demo output to a frontier model, running on supplied transcript segments and screenshots inside the existing demo.
2. **Eyes from SAM 3.1 + Muse Spark** — SAM 3.1 segments shared-screen regions (slides, documents, whiteboards) so the evidence behind a brief entry is inspectable; Muse Spark interprets the transcript and the screenshots. Briefs cite what was *said* (timestamp) and what was *shown* (frame and region).
3. **Visual briefs with Muse Image** — a one-page visual recap. Stretch goal only; outside the committed ten-day scope.

The safeguard core stays deterministic and model-independent: swapping the model does not change the code — and does not widen the screen's coverage either, which is why regression cases for missed commitment language are part of the build. Live third-party meeting joining is also outside the ten-day scope. Pre-submission evidence: a Muse Spark brief produced from this repo's demo transcript on October 15, 2026 — `second-seat/hackathon-evidence/2026-10-15-spark-brief.md`.

## About the builder

Loving Grace Technologies, LLC (Grenada, Mississippi) is a SAM.gov-registered AI research and product company (UEI U5D5QT7QLRQ5 · CAGE 222V5), founded by Bridget Sander, who brings 10+ years in complex property claims — multimillion-dollar losses, estimating, and negotiation — to building agent systems that can be trusted in rooms where words become commitments.

**Contact:** https://www.linkedin.com/in/bridgetsander · https://lovinggracetechnologies.com
