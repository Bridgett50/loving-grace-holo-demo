# Phase 09: Day-10 sealed run + scoring
Source: `/workspace/second-seat-hackathon-build-prompt.md` (kept as-is). Time budget: **3 h** (Nov 2). Overrun rule: at 150% of the budget, stop and apply the cut list in 00-master.

## Goal
Run the held-out set once at the frozen prompt and score.

## Round 2 fixes (Oct 26; from the Judge Panel Round 2 (https://docs.google.com/document/d/1IuCGBuZ7PV46QVw6aDNDkeMUhyiXl1k8Jt_xf4wDO-A/edit). These SUPERSEDE any conflicting text below, including the verbatim sections)
- [ ] Run support grading on the sealed set and score it vs its hash-sealed truth labels (Round 3: no human reader; verify sha256 against the pre-run commit first).
- [ ] Run once on the AMI slice (CC BY 4.0) vs AMI annotators' DECISIONS/ACTIONS using the pre-committed mapping rules; report n, CIs and misses; attribution in DATA.md.
- [ ] Re-run the seeded-error suite at the frozen prompt; report catch rate.
- [ ] Optional: Glimmer advisory agreement, labeled "model-vs-model agreement, not accuracy".
- README wording: "Ground truth: sealed before generation (synthetic) + AMI human annotations (third-party). No human second reader."
- Report measured rates with n and Wilson CIs, misses listed, whatever they are.

## Inputs
The sealed set (never opened before) + its truth hashes, the AMI slice + mapping rules, the seeded-error set, frozen prompts.

## Exact models and settings
The frozen settings exactly as recorded in Phase 08. No prompt edits.

## Acceptance tests
- [ ] A single run log with timestamp; scores with Wilson CIs; misses listed.

## Proof required
Run log + scoring output committed. "Done" requires this proof; Grok Bot verifies it independently.

## Notes
Do not reuse the held-out cases in the demo. The demo uses the dev hero meeting.

## Original brief text for this phase (verbatim)
<!-- original lines 203-203 -->
| 9 | Day-10 run (sealed set, once) + scoring | 3 | Nov 2 |

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
