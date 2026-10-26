# Phase 01: Hygiene + refusal widening + hackathon rules
Source: `/workspace/second-seat-hackathon-build-prompt.md` (kept as-is). Time budget: **4 h** (Oct 26-27). Overrun rule: at 150% of the budget, stop and apply the cut list in 00-master.

## Goal
Clean, rule-compliant branch, with the outgoing screen widened before any model work.

## Round 2 fixes (Oct 26; from the Judge Panel Round 2 (https://docs.google.com/document/d/1IuCGBuZ7PV46QVw6aDNDkeMUhyiXl1k8Jt_xf4wDO-A/edit). These SUPERSEDE any conflicting text below, including the verbatim sections)
- Conditional GO (Round 2): this phase has no model/key/Glimmer dependency. Also: read the hackathon IP clause and draft the LICENSE decision for Bridgett; set up NEW_DURING_HACKATHON.md and the `pre-hackathon-baseline` tag (new-work marking); confirm the repo stays public.
- `MODEL_API_KEY` = runtime (shell env or CI secret only); `META_API_KEY` = Muse Code only. Do not touch env files.

## Inputs
Repo `Bridgett50/loving-grace-holo-demo` `second-seat/`; guardrails.ts; existing 81 tests.

## Exact models and settings
No model calls. Set `LLM_MODEL=muse-spark-1.3` in config/docs only (no key). Muse Code (`muse`, auth `META_API_KEY`, default model muse-spark-1.2, so set 1.3 explicitly; **turn Contributor mode off**) may be used as a coding agent. Note the agent in commit messages.

## Acceptance tests
- [ ] The two named phrases are blocked; the negation cases are still allowed (test names below).
- [ ] `pnpm --filter @second-seat/core test` shows 81 + new tests passing; `pnpm -r typecheck` passes.
- [ ] `pre-hackathon-baseline` tag exists on the last pre-event commit; `NEW_DURING_HACKATHON.md` exists; the repo is public (check the URL while logged out).
- [ ] LICENSE is added only after the IP clause is confirmed (otherwise leave a TODO and ask Bridgett).

## Proof required
Terminal output of the test run plus typecheck; `git tag --list`; a logged-out screenshot of the public repo; the draft PR link. "Done" requires this proof; Grok Bot verifies it independently.

## Original brief text for this phase (verbatim)
<!-- original lines 38-38 -->
2. Widen `screenOutgoing` in guardrails.ts so it blocks **"We accept your offer."** and **"Approved. Please proceed with the purchase."** (both currently allowed). Add patterns for bare acceptance (`we accept`, `accepted`), approval + proceed (`approved ... proceed`, `go ahead with the purchase/order/payment`), and an incoming-side equivalent. Add a test that those two sentences are blocked, and add negative cases that must still be allowed (e.g. "I can't accept that on Bridget's behalf.", "Bridget will review the offer.") so negation is handled.

<!-- original lines 195-195 -->
| 1 | Hygiene + refusal widening (merge 692a277, baseline tag, LICENSE after the IP clause, LLM_MODEL to muse-spark-1.3, block the two named phrases with negation-safe tests) | 4 | Oct 26-27 |

<!-- original lines 244-248 -->
## 3. Rules confirmed in Discord
- The whole repo must be public.
- The demo shows only work built Oct 26 to Nov 4.
- Mark new work clearly: `NEW_DURING_HACKATHON.md` plus a `pre-hackathon-baseline` git tag on the last pre-event commit.
- Avoid banned categories: no medical or mental-health advice, and no basic RAG.

## Common rules (repeated in every phase so this file works on its own)
Original ground rules, verbatim:
## Ground rules
- Create a new branch **hackathon/evidence-brief** from `main`. Open a **draft PR** to `main` when done. **Do not deploy**, do not touch Render, `scripts/deploy-render.mjs`, `render.yaml`, Dockerfile, or env files. Do not commit any API key.
- The scope is fixed by the submitted pitch (v4.5). OUT of scope, do not build: live meeting joining, live owner relay, cross-meeting retrieval, generated-image recaps, voice/avatar/face work, provider settings pages.
- The existing 81 tests (`pnpm --filter @second-seat/core test`, 7 files in packages/core/test) must still pass. Add tests; never weaken or delete existing ones.
- `packages/core` stays dependency-free and network-free. Model calls (Muse Spark, SAM 3.1) live outside core, behind an interface, with a recorded-fixture mode so tests never hit the network.
- Name clash: `packages/core/src/intelligence.ts` already exports `MeetingBrief`/`buildBrief` (the PRE-meeting readiness brief shown in apps/web/src/app/meetings/brief-dialog.tsx). Do not change them. Name the new types `EvidenceBrief`, `EvidenceEntry`, etc.

Guardrails, verbatim:
# Guardrails (Bridgett, Oct 26)
- Proof, not claims: "done" only with passing test output, screenshot/recording, and a live check of any real public URL. Grok Bot verifies independently.
- Never overwrite or roll back working code: branch + draft PR only, no deploy, no force-push, no rollback without Bridgett's OK.
- Credit guard: mocks/fixtures during development; real API calls only for integration tests and the final demo; hard daily spend cap in code (default $5/day per provider) with token/cost logging; stop and report after 3 consecutive failures of the same step.
- Daily evening checkpoint: what works (proven), what's broken, credits spent.
- Nov 3: demo-video script and recording; keep a recorded backup demo for the Nov 9 live finals.

AI-native rule: the model does the understanding (brief, tactics, support grading, concept choice, redaction). Code only verifies (IDs exist, spans are substrings, gates, caps). Model checks can only add flags, never clear one. Never invent facts or metrics. Every number in the README comes from a real run.
Conscious AI Charter: https://docs.google.com/document/d/1TmTEm_NRqJOMIe1EJ8tQPtKoqXDkSzIjPimNhfmQjSE/edit . Model facts: `/workspace/model-playbook.md`. Win plan: `00-win-plan.md`.
**Stop rule:** after 3 consecutive failures of the same step, stop, write down what failed (command and output), and report it at the evening checkpoint. No retry loops and no workarounds that weaken a test.
