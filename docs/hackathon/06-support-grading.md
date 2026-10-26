# Phase 06: Semantic support grading
Source: `/workspace/second-seat-hackathon-build-prompt.md` (kept as-is). Time budget: **4 h** (Oct 30). Overrun rule: at 150% of the budget, stop and apply the cut list in 00-master.

## Goal
A separate Spark judge grades each entry against its cited span only; can only add flags; measured vs the human second reader.

## Round 3 fix: no human reader (Judge Panel Round 3 (no-human accuracy; see the Round 2 doc, appended section))
**Accuracy without a human reader (Round 3, Oct 26; SUPERSEDES every "second reader" reference in this file, including verbatim sections):** no human second reader. Accuracy is proven four ways, all reported with n and Wilson 95% CIs from real runs: (A) **truth by construction**: the hero meeting and a sealed synthetic set (≥30 entries incl. planted unsupported entries and supported controls) have their expected labels written in `eval/truth/*.json` BEFORE any brief is generated; `sha256sum` of each file is committed (commit hash + timestamp in README) before the first model run, and the scorer refuses to run if a hash changed; (B) **external human labels**: a small public slice from the AMI Meeting Corpus (CC BY 4.0, groups.inf.ed.ac.uk/ami/corpus/license.shtml; its abstractive summaries carry DECISIONS and ACTIONS headings written by AMI annotators), mapping rules written and committed before the run, attribution in README/DATA.md; QMSum (MIT repo; AMI/ICSI-derived, ICSI is also CC BY 4.0) is optional; (C) **seeded-error mutation tests**: copies of correct entries with an injected wrong date, wrong owner, dropped qualifier or invented decision; the report is the measured catch rate, and the suite FAILS if the support judge is disabled; (D) **held-out sealed set** (Phase 09) opened once at the frozen prompt. Optional advisory only: an open-weights Glimmer pass judging Spark's grades, reported as model-vs-model agreement, never as accuracy and never as "independent". Caveat stated in README: A and C ground truth is builder-authored (honest label: "truth by construction, sealed before generation"); B is the only third-party human label.
- Oct 30 measurement: vs the sealed truth-by-construction dev labels (A) and the seeded-error set (C). Phase 09: vs the sealed held-out set (D) and the AMI slice (B).

## Round 2 fixes (Oct 26; from the Judge Panel Round 2 (https://docs.google.com/document/d/1IuCGBuZ7PV46QVw6aDNDkeMUhyiXl1k8Jt_xf4wDO-A/edit). These SUPERSEDE any conflicting text below, including the verbatim sections)
- Measured **vs Bridgett's labels on the dev set (Oct 30); vs the sealed held-out set and AMI slice in Phase 09 (Round 3: no human reader).** Wherever "vs second reader" appears below, read "vs sealed truth labels".
- Case #10 (inlined): Overreach: the brief infers a decision nobody made ("team agreed to switch vendors"); expected unsupported; counts as a failure.
- Tests must be able to fail: the dev labels are written before the judge runs; report measured catch/false-alarm with n and Wilson CIs; include planted unsupported entries and supported controls.

## Inputs
Briefs from Phase 03; hash-sealed truth files `eval/truth/*.json`; seeded-error set; AMI slice + committed mapping rules (Round 3).

## Exact models and settings
`muse-spark-1.3` (Standard mode, never `-contributor` on real data) via `POST https://api.meta.ai/v1/chat/completions`, `MODEL_API_KEY` from env (never logged). Settings: `developer` role, `response_format: {type:"json_schema", json_schema:{name, strict:true, schema}}`, sampling left unset (temp 1.0, top_p 1.0), fixed `seed` (best-effort only, so record fixtures), and `max_completion_tokens` capped (reasoning tokens count against it; start at 16000 and log `usage.completion_tokens_details.reasoning_tokens`). Stream if a call runs long (non-streaming requests 504 on total time). Retry 429/5xx with backoff and jitter, honoring Retry-After. Never retry a 400 unchanged. `reasoning_effort:"medium"`; the input is the entry text plus cited span(s) only; output enum supported|partial|unsupported plus `missing_qualifier` (nullable). The lexical score stays advisory.

## Acceptance tests
- [ ] Truth hashes committed before the first model run; scorer aborts on hash mismatch (test).
- [ ] Seeded-error suite: wrong date / wrong owner / dropped qualifier / invented decision; measured catch rate; suite FAILS with the judge disabled.
- [ ] #10, #22, #23, #25 graded as expected in fixtures.
- [ ] The [00:37] miss is shown: lexical 1.00 vs semantic grade.
- [ ] Catch rate and false-alarm rate vs Bridgett's labels on the dev set (Oct 30); vs sealed truth (A), seeded errors (C), and in Phase 09 the held-out set (D) and AMI slice (B); Wilson 95% CIs, from a real run (no invented numbers).

## Proof required
Eval output table plus a raw JSONL of judge outputs. "Done" requires this proof; Grok Bot verifies it independently.

## Original brief text for this phase (verbatim)
<!-- original lines 102-103 -->
- #22 Paraphrase drift: the entry says "Vendor guaranteed delivery" but the cited line says "we'll try for delivery," so the entry must be graded partially/unsupported.
- #23 Selective omission: the quoted price omits "plus tax and freight" from the same segment, which must be flagged as a missing qualifier.

<!-- original lines 105-105 -->
- #25 Confidence laundering: a slide shows a "projected" figure and speech says "the number is X," so the entry must keep "projected."

<!-- original lines 182-182 -->
| Verifier only checks IDs exist (researcher) | **Semantic support grading** | Separate Muse Spark judge call that sees only the entry text and its cited span(s) and returns supported / partial / unsupported plus the missing qualifier. Can only add flags. Measured against the second reader's labels: automated catch rate and false-alarm rate with Wilson intervals. Keeps the lexical score as an advisory baseline so judges see the [00:37] miss (scored 1.00 lexically) now caught semantically. Covers #10, #22, #23, #25. |

<!-- original lines 200-200 -->
| 6 | **Semantic support grading** + catch-rate vs second reader | 4 | Oct 30 |

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
