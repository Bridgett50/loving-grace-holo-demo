# Phase 02: Input parser, schema, drop-in normalizer
Source: `/workspace/second-seat-hackathon-build-prompt.md` (kept as-is). Time budget: **6 h** (Oct 27). Overrun rule: at 150% of the budget, stop and apply the cut list in 00-master.

## Goal
Owner-supplied files (INPUT_FORMAT, VTT/SRT, PDF, screenshots) become typed, validated input plus the EvidenceBrief schema.

## Round 2 fixes (Oct 26; from the Judge Panel Round 2 (https://docs.google.com/document/d/1IuCGBuZ7PV46QVw6aDNDkeMUhyiXl1k8Jt_xf4wDO-A/edit). These SUPERSEDE any conflicting text below, including the verbatim sections)
- **0. Author the synthetic hero meeting (DATA.md label: synthetic, written Oct 26, no real people): hero.vtt (≈15 min; includes [11:58] 'You already confirmed the 15th…' and [12:41] 'I need a yes before 5 or the price doubles'), hero-slides.pdf (slide 3 shows delivery '30th'), one screenshot of slide 3. Commit under test/fixtures/hero/. 1.5 h.** (Oct 26+ work; the DATA.md label keeps #34 CI green.) If the PDF normalizer is cut, the PDF is a source artifact only and is never shown being dropped in the demo.
- PDF → frames needs a library such as pdf.js in apps/web or bot (core stays dependency-free). PDF normalizer is FIRST on the cut list; keep VTT + screenshot.
- Hero fixtures that are displayed as model output must come from a logged live call (log line committed), never hand-written.

## Inputs
INPUT_FORMAT.md, the Oct 15 fixture, and the files listed in "Read first".

## Exact models and settings
No model calls in core. The JSON Schema must fit the **strict subset**: root is an object; every object has `additionalProperties:false`; every key is in `required` (optional becomes nullable); no `oneOf`/`allOf` (the `Citation` union uses `anyOf` below the root, or a flat `kind` + nullable fields); depth ≤10; no recursion. Optional: Muse Voice Transcribe (`POST /v1/asr/transcribe`, WAV ≤10 min/32 MB, turn-level timestamps only). **Not on the private-demo path**, because it sends audio to Meta.

## Acceptance tests
- [ ] `test/evidence-input.test.ts`: parse, malformed line (line numbers in the error), duplicate id, frame time from filename and from sidecar.
- [ ] The normalizer turns one VTT, one plain "Name: text" file, and one screenshot into INPUT_FORMAT v1 (fixture tests).
- [ ] A schema test asserts the strict-subset rules (walks the schema; no oneOf/allOf; additionalProperties:false everywhere).

## Proof required
Test output; a sample normalized file committed under test/fixtures. "Done" requires this proof; Grok Bot verifies it independently.

## Notes
If late: trim to VTT + screenshots (PDF later), per the cut list.

## Original brief text for this phase (verbatim)
<!-- original lines 12-15 -->
## Read first
- second-seat/README.md, second-seat/REVIEWERS.md, second-seat/Second-Seat-SME-Audit-Report.md
- second-seat/hackathon-evidence/INPUT_FORMAT.md (the documented input format), 2026-10-15-spark-brief.md, 2026-10-15-spark-prompt.txt, 2026-10-15-spark-response-raw.json, check_citations.py, 2026-10-15-citation-check.md
- packages/core/src/safeguards/guardrails.ts (`classifyIncoming`, `screenOutgoing`, `FORBIDDEN_CAPABILITIES`), packages/core/src/summary.ts, packages/core/src/types.ts, packages/core/test/guardrails.test.ts

<!-- original lines 17-27 -->
## Day 1: input format + schema + parser
1. `packages/core/src/evidence/input.ts`: parse the INPUT_FORMAT.md transcript (`[MM:SS] Speaker: text`, one segment per line) into `TranscriptSegment { id: "t-MM:SS", t: seconds, speaker, text }`, and a `frames.txt` sidecar / `frame-MM-SS.png` filenames into `Frame { id: "f-MM:SS", t, file }`. Reject malformed lines with a typed error listing line numbers; reject duplicate segment ids. Single meeting per brief (INPUT_FORMAT section 4).
2. `packages/core/src/evidence/schema.ts`: 
   - `EntryCategory = "decision" | "action_item" | "unresolved_question" | "owner_review" | "source_conflict"`
   - `Citation = { kind: "segment", segmentId } | { kind: "frame", frameId, region?: { box: [x0,y0,x1,y1], concept: string, maskRef?: string, spotCheck: "passed" | "failed" | "pending" } }`
   - `EvidenceEntry { id, category, text, citations: Citation[], requester?, assignee?, acceptance?: "established" | "not_established", speaker?, flags: Flag[] }`
   - `Flag = "missing_source" | "citation_not_found" | "conflicting_sources" | "commitment_language" | "request_not_accepted" | "region_spotcheck_failed"`
   - `EvidenceBrief { meetingId, model, promptVersion, settings, entries, flagged: EvidenceEntry[], createdAt }`
   - A JSON Schema (plain object, no deps) mirroring this, to pass to Muse Spark as `response_format` (structured output).
3. Add the Oct 15 demo transcript as a fixture (`packages/core/test/fixtures/2026-10-15/transcript.txt`) copied verbatim from 2026-10-15-spark-brief.md, plus 1-2 synthetic screenshot frames (simple generated PNGs of a slide; record capture times in frames.txt).
4. Tests: `test/evidence-input.test.ts` (parse, malformed line, duplicate id, frame time from filename and sidecar).

<!-- original lines 185-185 -->
| Hand-formatted inputs (UX) | **Real drop-in inputs** | Upload page accepts a raw transcript as exported by the platform (VTT/SRT, or plain "Name: text" with timestamps), a slide PDF (pages rendered to frames with a free library such as pdf.js), and screenshots (capture time from filename, file metadata, or a one-field prompt). A normalizer turns them into the INPUT_FORMAT v1 internally. Still owner-supplied; nothing captured live, so in scope. |

<!-- original lines 196-196 -->
| 2 | Parser + schema + **drop-in normalizer** (raw transcript, PDF pages, screenshot upload) | 6 | Oct 27 |

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
The 0:20 beat in the demo is a drag-and-drop of a VTT, a slide PDF, and a screenshot. The hero meeting files must normalize cleanly on the first try (fixture test).
