# Phase 07: SAM 3.1 on the hero slide
Source: `/workspace/second-seat-hackathon-build-prompt.md` (kept as-is). Time budget: **4 h** (Oct 30). Overrun rule: at 150% of the budget, stop and apply the cut list in 00-master.

## Goal
Shared-content region on the hero slide frame, with per-frame full-frame fallback.

## Round 2 fixes (Oct 26; from the Judge Panel Round 2 (https://docs.google.com/document/d/1IuCGBuZ7PV46QVw6aDNDkeMUhyiXl1k8Jt_xf4wDO-A/edit). These SUPERSEDE any conflicting text below, including the verbatim sections)
- Only the on-server **PII-masked** screenshot is sent to SAM 3.1 or to Spark (image input). CI test on the #31 invoice fixture: the payload inspector lists every image sent, and each is the masked version.
- SAM concept: default "slide" for the hero frame (a fixed config, not a Spark call) unless the Spark concept picker is shown to be needed; Spark image input reads slide text for #48 on the masked frame only.

## Inputs
Hero frame PNG; Phase 03 SAM stub.

## Exact models and settings
`sam-3.1` via `POST /v1/responses` with one `input_text` noun phrase ("slide", "document", or "whiteboard"; never a list, command, negation, or spatial phrase) plus `input_image`. Streaming is optional for images. Parse with `@meta-sam/parser` (x2/y2 inclusive); `mask_encoding:"one_bit"`. Zero matches = empty output_text = normal, so fall back to full frame. Box prompts: w/h must equal the image pixels. The concept is picked by `muse-spark-1.3` (`reasoning_effort:"low"`, image input). $2.50 per 1k images.

## Acceptance tests
- [ ] A fixture test of the stub interface.
- [ ] One live call on the hero frame: the box lies inside the frame bounds, and a manual spot-check is recorded.
- [ ] A zero-match fixture produces `region_spotcheck_failed` / full-frame.

## Proof required
Overlay screenshot; raw output_text saved as fixture. "Done" requires this proof; Grok Bot verifies it independently.

## Notes
If late: hero frame only (−2h).

## Original brief text for this phase (verbatim)
<!-- original lines 45-45 -->
3. SAM 3.1 stub only (real call is day 4+): interface `segmentShared(frame, concept: "slide" | "document" | "whiteboard")` returning boxes, with a fixture implementation. Per the SAM docs: Responses API (`POST /v1/responses`, model `sam-3.1`), one noun-phrase concept per request, streamed output; zero matches is a normal result, not an error.

<!-- original lines 201-201 -->
| 7 | SAM 3.1 on the hero slide, per-frame fallback | 4 | Oct 30 |

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

## Demo-critical (from 00-win-plan)
The conflict card at 1:30 shows a SAM box on the hero slide around the "30th" date. Commit the hero-frame result as a fixture so the demo never depends on a live SAM call.
