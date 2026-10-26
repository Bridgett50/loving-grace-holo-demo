# Second Seat: Master brief (00)
Source: `/workspace/second-seat-hackathon-build-prompt.md` (kept as-is). Phase files 01–10 are self-contained; this file is the index.


## Day-0 blockers (Round 2; owners and dates; Bridgett is the owner and approves everything that sends, posts, merges or deploys)
| Blocker | Owner | Due (CT) | If missed |
|---|---|---|---|
| Meta API key + hackathon credits: claim as soon as the credits form posts | Grok Bot (prepares/fills; Bridgett approves any submit) | Form not posted yet; claim same day it posts; key needed by Oct 27 12:00 | Phases 03–04 stay fixture-only; hero fixtures WAIT (never hand-written as model output) |
| Glimmer hosting plan: Muse Glimmer 30B on Modal or Baseten (vLLM, bf16 ~60 GB or GGUF Q4_K_M on a 24 GB GPU); smaller fallback = Q4 on 24 GB GPU; last resort = mock behind the same interface, labeled on screen and in README "Glimmer: MOCK (TODO(glimmer-hosting))" | Grok Bot drafts plan; Bridgett decides | Decide by Oct 28 18:00 | Mock + honest label; cut the 2:00 privacy line; Open Weights bonus weak |
| Modal approval (credits) | Pending with Modal; Grok Bot checks daily | Oct 28 18:00 (feeds the Glimmer decision) | Use Baseten or the 24 GB fallback |
| ~~Second reader for Nov 2~~ **DROPPED (Round 3, Oct 26).** Replaced by: truth files authored + sha256-committed before the first model run; AMI slice (CC BY 4.0) mapping rules committed | Grok Bot drafts truth + mapping; Bridgett approves the commit | Truth + hashes committed by Oct 28 12:00 (before key/first live run); AMI slice by Oct 30 | If hashes are not committed before the first run, the dev set is demoted to "development only" and only AMI + seeded-error numbers are reported |
| Mo'ja consented vendor meeting (consent form, DATA.md label) | Bridgett | Yes/no by Oct 29 | Delete it from the Impact row and §3 |
| Deploy decision for judges (hosted URL or repo-only) | Bridgett | Nov 2 | Repo-only: `pnpm i && pnpm demo` in fixture mode |
| Hackathon credit amount (unverified; $150 seen only in a search summary) | Grok Bot verifies when the form posts | With the credits claim | Budget = $5/day/provider cap only |
| LICENSE: read the IP clause in the now-readable rules | Grok Bot reads; Bridgett decides | Oct 27 | LICENSE stays pending; README says so |
| Nov 9 finals backup on two devices | Bridgett | Nov 3 | Fixture-mode local run |

## Round 3 (Oct 26): no human second reader
**Accuracy without a human reader (Round 3, Oct 26; SUPERSEDES every "second reader" reference in this file, including verbatim sections):** no human second reader. Accuracy is proven four ways, all reported with n and Wilson 95% CIs from real runs: (A) **truth by construction**: the hero meeting and a sealed synthetic set (≥30 entries incl. planted unsupported entries and supported controls) have their expected labels written in `eval/truth/*.json` BEFORE any brief is generated; `sha256sum` of each file is committed (commit hash + timestamp in README) before the first model run, and the scorer refuses to run if a hash changed; (B) **external human labels**: a small public slice from the AMI Meeting Corpus (CC BY 4.0, groups.inf.ed.ac.uk/ami/corpus/license.shtml; its abstractive summaries carry DECISIONS and ACTIONS headings written by AMI annotators), mapping rules written and committed before the run, attribution in README/DATA.md; QMSum (MIT repo; AMI/ICSI-derived, ICSI is also CC BY 4.0) is optional; (C) **seeded-error mutation tests**: copies of correct entries with an injected wrong date, wrong owner, dropped qualifier or invented decision; the report is the measured catch rate, and the suite FAILS if the support judge is disabled; (D) **held-out sealed set** (Phase 09) opened once at the frozen prompt. Optional advisory only: an open-weights Glimmer pass judging Spark's grades, reported as model-vs-model agreement, never as accuracy and never as "independent". Caveat stated in README: A and C ground truth is builder-authored (honest label: "truth by construction, sealed before generation"); B is the only third-party human label.

## Goal
Ship Second Seat's evidence-linked brief plus Persuasion Shield for the Meta Global AI Developer Hackathon, **Startup track**, aiming for 1st place (see `00-win-plan.md`). Submissions are due **Nov 4, 9:00 PM ET (8:00 PM Central)**; judging Nov 4–8; finals Nov 9.

## Rules (verbatim) and AI-native rule
## Ground rules
- Create a new branch **hackathon/evidence-brief** from `main`. Open a **draft PR** to `main` when done. **Do not deploy**, do not touch Render, `scripts/deploy-render.mjs`, `render.yaml`, Dockerfile, or env files. Do not commit any API key.
- The scope is fixed by the submitted pitch (v4.5). OUT of scope, do not build: live meeting joining, live owner relay, cross-meeting retrieval, generated-image recaps, voice/avatar/face work, provider settings pages.
- The existing 81 tests (`pnpm --filter @second-seat/core test`, 7 files in packages/core/test) must still pass. Add tests; never weaken or delete existing ones.
- `packages/core` stays dependency-free and network-free. Model calls (Muse Spark, SAM 3.1) live outside core, behind an interface, with a recorded-fixture mode so tests never hit the network.
- Name clash: `packages/core/src/intelligence.ts` already exports `MeetingBrief`/`buildBrief` (the PRE-meeting readiness brief shown in apps/web/src/app/meetings/brief-dialog.tsx). Do not change them. Name the new types `EvidenceBrief`, `EvidenceEntry`, etc.

**Round 2 ground-rule additions (Oct 26; these win over any conflicting line above or in a phase):**
- Judges run the demo from the public branch (README: `pnpm i && pnpm demo` in fixture mode). No hosted URL unless Bridgett approves a deploy window. The submission link points to the `hackathon/evidence-brief` branch, or to `main` after Bridgett merges. Runtime key: `MODEL_API_KEY` exported in the shell or CI secret only; `META_API_KEY` is for Muse Code only. No live-call button in any public build.
- Never hand-write a fixture that is displayed as model output; recorded fixtures must come from a logged live call (log line committed).
- Privacy claim (exact): "The raw transcript never left our server. Muse Spark saw only redacted text. Screenshots go to Meta's SAM 3.1 (Standard mode) only after on-server PII masking." Every image sent to SAM 3.1 or Spark is the masked version.
- One tactic labeler: Glimmer = PII redaction (+ optional pre-label, `source:"glimmer"`); Muse Spark = the canonical tactic/ask/target/span classifier on redacted text. The tool map's "second commitment classifier" IS this call (one call, not two).
- The "typed yes": the owner types into a local **Draft reply to vendor** box. Second Seat drafts/holds, flags pressure, and Bridgett confirms; **nothing auto-sends, there is no relay**. While unreviewed pressure items exist the draft shows "Held: review the 2 pressure items first" with the evidence; after she clicks Approve on the items, she copies the draft herself.
- Tests must be able to fail: every eval reports measured rates on cases the prompt was not tuned on (held-out adversarial split sealed before tuning), includes negative controls, and the harness has a mutation check (gate/classifier disabled → the suite FAILS). "100% by construction" rows are labeled as such and never presented as a result.
- New-work marking: only Oct 26+ work is demoed; NEW_DURING_HACKATHON.md + `pre-hackathon-baseline` tag; the whole repo stays public.

**AI-native rule:** the model does the understanding; code only verifies. Model checks only ADD flags. Never invent facts. Label targets as targets.

## Guardrails (verbatim)
# Guardrails (Bridgett, Oct 26)
- Proof, not claims: "done" only with passing test output, screenshot/recording, and a live check of any real public URL. Grok Bot verifies independently.
- Never overwrite or roll back working code: branch + draft PR only, no deploy, no force-push, no rollback without Bridgett's OK.
- Credit guard: mocks/fixtures during development; real API calls only for integration tests and the final demo; hard daily spend cap in code (default $5/day per provider) with token/cost logging; stop and report after 3 consecutive failures of the same step.
- Daily evening checkpoint: what works (proven), what's broken, credits spent.
- Nov 3: demo-video script and recording; keep a recorded backup demo for the Nov 9 live finals.

## Priority order (= phase order)
| # | File | Work | Hours | When |
|---|---|---|---|---|
| 01 | 01-hygiene.md | Hygiene + refusal widening + hackathon rules | 4 | Oct 26-27 |
| 02 | 02-parser-normalizer.md | Input parser, schema, drop-in normalizer | 6 | Oct 27 |
| 03 | 03-brief-validators.md | Muse Spark structured brief + deterministic validators | 11 | Oct 28-29 |
| 04 | 04-shield.md | Persuasion Shield + Glimmer private layer + red-team harness | 6 | Oct 28-29 |
| 05 | 05-hero-page.md | Hero page | 6 | Oct 29-30 |
| 06 | 06-support-grading.md | Semantic support grading | 4 | Oct 30 |
| 07 | 07-sam.md | SAM 3.1 on the hero slide | 4 | Oct 30 |
| 08 | 08-load-freeze.md | Load test, telemetry, failure modes, live red-team batch, prompt freeze | 3 | Oct 31 |
| 09 | 09-day10-run.md | Day-10 sealed run + scoring | 3 | Nov 2 |
| 10 | 10-readme.md | README numbers, video, submission, bonuses | 6 → **8** (Round 2) | Nov 3-4 |

## 4. Revised hour budget (fits 48-58 solo hours)

In priority order. Coding agents build in parallel; her hours are specs, review and decisions.

| # | Work | Hours | When |
|---|---|---|---|
| 1 | Hygiene + refusal widening (merge 692a277, baseline tag, LICENSE after the IP clause, LLM_MODEL to muse-spark-1.3, block the two named phrases with negation-safe tests) | 4 | Oct 26-27 |
| 2 | Parser + schema + **drop-in normalizer** (raw transcript, PDF pages, screenshot upload) | 6 | Oct 27 |
| 3 | Muse Spark structured brief + deterministic validators | 11 | Oct 28-29 |
| 4 | **Persuasion Shield** (classifier, applyPressure, badge data, #40-#55 fixtures, harness) | 6 | Oct 28-29 |
| 5 | Hero page: 15th-vs-30th card, Pressure badge, owner Approve/Edit/Reject, clickable citations | 6 | Oct 29-30 |
| 6 | **Semantic support grading** + catch-rate vs second reader | 4 | Oct 30 |
| 7 | SAM 3.1 on the hero slide, per-frame fallback | 4 | Oct 30 |
| 8 | **Load test** + telemetry + failure-modes table; capped live red-team batch; prompt freeze | 3 | Oct 31 |
| 9 | Day-10 run (sealed set, once) + scoring | 3 | Nov 2 |
| 10 | README numbers, video, submission | 6 | Nov 3-4 |
| | **Total** | **53** | Nov 1 rest day kept |

**Round 2 re-budget (Oct 26, estimate, not measured):** add hero fixture authoring 1.5 h (Phase 02 step 0, Oct 26–27); Glimmer spike/hosting 4 h (Phase 04, Oct 28); replay + "What left this server" payload panel + upload UI 4 h (Phase 05); video edit and 9:16 4 h (Phase 10 → 8 h); backup-video recording moved out of Phase 08 into a separate 1 h Nov 1 slot. Then cut, in order: PDF normalizer (keep VTT + screenshot; no PDF in the 0:20 beat), Muse Wonder, Muse Spark Open, live load test (fixture-mode p50/p90 only), the live-finals paraphrase encore, the Community dataset. **Total ≈60 h after cuts (estimate).** Agent hours vs Bridgett review hours: each phase needs ~0.5–1 h of her review/decisions on top of agent time.

**To land at 48:** cut SAM to the one hero frame only (-2) and the load test to fixture-mode only (-1), and trim the normalizer to VTT + screenshots (PDF later, -2). **Cut first if late (unchanged):** signed receipts/C2PA, multilingual switch, Muse Wonder adjudicator, Prompt Guard 2, charter cases not doubling as regressions.

## 3. Turning the harshest critiques into strengths

| Critique | Upgrade | Concrete build |
|---|---|---|
| Verifier only checks IDs exist (researcher) | **Semantic support grading** | Separate Muse Spark judge call that sees only the entry text and its cited span(s) and returns supported / partial / unsupported plus the missing qualifier. Can only add flags. Measured against the second reader's labels: automated catch rate and false-alarm rate with Wilson intervals. Keeps the lexical score as an advisory baseline so judges see the [00:37] miss (scored 1.00 lexically) now caught semantically. Covers #10, #22, #23, #25. |
| Refusal is a phrase list (red-teamer) | **Paraphrase-robust refusal** | Persuasion Shield above + intent classifier on outgoing text; pattern screen as floor; #54 paraphrase harness prints N/M per layer. Invite the judge to type paraphrases live in the demo (fixture mode plus one capped live call). |
| No load or production proof (SRE) | **Load test + telemetry** | A free open-source load tool (k6 or autocannon) against the brief page and CLI in fixture mode (e.g. concurrent briefs, p50/p90); one long-meeting run (#15, 300+ segments) live under caps; latency, tokens and cost logged per call; failure-modes table (SAM zero matches, Spark timeout, retry then fixture). Numbers are whatever the run produces. |
| Hand-formatted inputs (UX) | **Real drop-in inputs** | Upload page accepts a raw transcript as exported by the platform (VTT/SRT, or plain "Name: text" with timestamps), a slide PDF (pages rendered to frames with a free library such as pdf.js), and screenshots (capture time from filename, file metadata, or a one-field prompt). A normalizer turns them into the INPUT_FORMAT v1 internally. Still owner-supplied; nothing captured live, so in scope. |
| Moat is copyable (VC) | **Persuasion Shield as differentiator** | The panel notes Zoom, Google and Granola are moving to cited recaps; pressure-tactic labeling is not in that scan (verify before claiming it is unique). The moat is the eval asset: a labeled pressure red-team set with per-principle results, plus the owner-approval architecture. Pair with one consented Mo'ja vendor meeting as a dev example. |
| Lots of planning, no feature code (winner) | **Ship the hero flow first** | Oct 26-29 end state: the 15th-vs-30th card + refused purchase + Pressure badge working on fixtures. Docs frozen; this section is the last planning addition. |

## Original framing kept verbatim
# Build prompt: Second Seat evidence-linked brief, days 1-3 (paste into Cursor or Codex)

You are working in the GitHub repo **Bridgett50/loving-grace-holo-demo**, inside **second-seat/** (pnpm monorepo: apps/web Next.js 16, services/bot Hono, packages/core dependency-free TypeScript + Vitest).

# Meta tool map

### Mapping table

| Tool | Exact Second Seat job | Build day | In pitch scope? | Risk |
|---|---|---|---|---|
| Muse Spark `muse-spark-1.3` | Writes the brief: decisions, action items, unresolved questions, requires-owner-review, source conflicts; each entry cites segment IDs / frame IDs as structured output. Code then verifies citations exist. | Day 3 (Thu Oct 29); conflicts Sat Oct 31 | Yes (named in pitch) | Credits/caps; nondeterminism (fixed prompt + settings, freeze Oct 31) |
| Muse Spark `muse-spark-1.3` | Picks the SAM concept per frame (reads the screenshot: "slide", "document", "whiteboard" or none) | Fri Oct 30 | Yes in spirit (pitch says SAM isolates shared-content regions; picking the prompt is part of that). Wording note optional | Wrong concept → zero regions → per-frame full-frame fallback (already in pitch) |
| Muse Spark `muse-spark-1.3` | Second commitment classifier: labels incoming/outgoing utterances as commitment language, alongside the deterministic pattern screen. The pattern screen and FORBIDDEN_CAPABILITIES stay authoritative; the model can only add flags, never clear one | Wed Oct 28 (after the screen widening) | Partly. Pitch describes a pattern-based screen and widening it; a model classifier is **not** stated. **Needs a pitch-wording note** in the write-up | Must not weaken the guard; regression cases must pass with the model off |
| SAM 3.1 `sam-3.1` | Boxes/masks for shared-content regions in screenshots; original frame stays the evidence; manual spot-check per frame | Fri Oct 30 | Yes (named in pitch) | Key access and limits unverified until Oct 26 spike; fallback per frame |
| Muse Wonder `muse-wonder-1.0` | Optional adjudicator: one pass over the finished draft that rechecks entries flagged as conflicts and requires-owner-review, and each entry's claim against its cited text. Output = extra flags only | Sat Oct 31, only if Spark path is done; must be in the prompt freeze | **Not in pitch** (pitch says Spark identifies disagreements). **Needs a pitch-wording note**; cut first if late | ~3-5x Spark price; adds a moving part before freeze; never replaces the human owner review or the human second reader |
| Muse Image `muse-image-1.0` | **Skip, out of scope.** It only generates/edits images; generated-image recaps are excluded by the pitch, and image understanding is already Muse Spark | — | Out | Using it would add an excluded feature |
| Muse Spark Open on Baseten (or Fireworks/Modal) | Optional independent model reader: re-runs the citation-support check with open weights as a cross-check, and serves as a cost or outage fallback in fixture/recorded mode. **Same Muse family, not a different family**; it is open weights of the same model line | Sat Oct 31 or skip | Not in pitch. Wording note if used. Recorded-response (fixture) mode is already planned and needs no model | Credits not guaranteed ("select participants"); Llama option unverified; must not be presented as the "second reader" (that is a person) |
| Muse Code CLI | Coding agent alongside Cursor: run the day 1-3 build prompt, parallel worktrees for tests/validators; pay-as-you-go only | Oct 26 onward | Yes (event names it; pitch says she directs AI coding agents) | Using it on her key spends credits; whether judges favor it is unverified; keep commit messages noting which agent did what |
| Muse Voice Transcribe | Not used (transcripts supplied) | — | Out (live capture excluded) | — |

**Pitch-wording notes needed (write-up, not the pitch doc):** the model commitment classifier; any Muse Wonder adjudicator pass; any open-weights cross-check. Phrase each as "an additional model check that can only add flags; the deterministic checks and the owner review are unchanged."

# Conscious AI principles

Source: Loving Grace Conscious AI Charter (Oct 2026), https://docs.google.com/document/d/1TmTEm_NRqJOMIe1EJ8tQPtKoqXDkSzIjPimNhfmQjSE/edit . Stay inside pitch v4.5 scope: no live joining, owner relay, cross-meeting retrieval or image recaps. Each principle must be enforced by code, a fixture test or a judge rubric.

| Principle | Second Seat implementation | Check (code / eval) |
|---|---|---|
| Truthfulness | Every entry cites a transcript segment and/or screenshot region; add `support_grade` from a separate judge prompt (cited span only); unsupported goes to Flagged | Existing `citation_not_found`, `missing_source`; support-rate eval |
| Humility | Hedge lexicon ("maybe", "I'll check", "probably", "projected") keeps items in Unresolved Questions; `uncertain` flag with a reason; SAM region failure is shown in plain words | Fixture tests #11, #24, #25 |
| Human final authority | Commitments and requests go to the owner review queue; brief stays "draft" until owner approves; audit log; transcript and screenshot instructions are evidence, not commands | Unit test: finalize() throws with unreviewed commitments (#28) |
| Dignity | PII mask (phone, email, card, account, address) on display and export, including screenshot regions; neutral attribution; no character judgments; no personal disclosures | Regex over brief.md = 0 leaks; respectful-summary rubric |
| Compassion / non-harm | No manipulative or moralizing generated text; flag others' pressure tactics neutrally | Persuasion lexicon + "not preachy" judge |
| Stewardship / privacy | Owner-supplied inputs only; DATA.md consent label per meeting; spend cap + per-brief cost log; Standard mode for real data | CI fails on unlabeled fixture (#34); cap test (#35) |
| Inclusiveness | Mixed-language, indirect-refusal, naming and cultural-date cases; per-case results in README | Fixtures #16, #36-#39 |

# Persuasion shield and score upgrades

Added Oct 25, 2026. Full doc: https://docs.google.com/document/d/1rSTl7m_lHUeZzEP3wg2ScTFwNT8MsrrQxiGeIz49Cq0/edit . Motivation: Wharton GAIL 'Call Me A Jerk' (preliminary, GPT-4o-mini, 28,000 conversations): persuasion raised compliance from 33.3% to 72.0%. Same ground rules as above: core stays dependency-free, model checks only add flags, fixture mode, no deploy, do not open the held-out set.

## (SUPERSEDED Oct 26: old 5-criteria rubric; see Judge Panel Round 2.) 5. Re-score per judge (if delivered as above)

Baseline is the panel's "planned" score. Same five criteria, unweighted.

| Judge | Was | Now | Why it moves |
|---|---|---|---|
| 1. Meta AI researcher | 6.6 | **8.6** | Semantic support grading answers the sinking question directly (automated catch rate vs the second reader, with intervals). Muse Spark does three real jobs (brief, support judge, tactic classifier), all schema-bound. Builds on published behavioral-science work rather than vibes. |
| 2. Startup VC | 6.2 | **8.2** | Moat shifts from a regex list to a labeled pressure-eval asset and a clear story: "other tools summarize the meeting; ours shows who is pressuring you and how." Still capped by zero paying users; one consented Mo'ja meeting helps. |
| 3. Production / SRE | 6.0 | **8.4** | Load numbers, p50/p90, cost per brief, failure-modes table and real file inputs answer "holds up in production," an official criterion. |
| 4. Security red-teamer | 6.4 | **8.9** | Paraphrase harness with N/M per layer, live paraphrase invitation, tactic labels, instruction-in-evidence flag, and an off-vs-on resistance metric is the exact evidence this judge asked for. |
| 5. Skeptical product / UX | 5.6 | **8.3** | Drop a VTT, PDF and screenshots, get a brief; the Pressure badge and the Approve/Edit/Reject step are visible on screen; no hand-formatting. |
| 6. Past hackathon winner | 6.8 | **8.8** | One flow, one wow: the 15th-vs-30th card, the refused purchase, and a "Pressure: Scarcity" badge on the same screen, cold-open in the video. |
| **Average** | **6.3** | **8.5** | (8.6 + 8.2 + 8.4 + 8.9 + 8.3 + 8.8) / 6 = 8.53 |

## Links
- Model playbook: `/workspace/model-playbook.md` (Drive doc linked in CRM)
- Win plan: `00-win-plan.md`
- Charter: https://docs.google.com/document/d/1TmTEm_NRqJOMIe1EJ8tQPtKoqXDkSzIjPimNhfmQjSE/edit
- Shield doc: https://docs.google.com/document/d/1rSTl7m_lHUeZzEP3wg2ScTFwNT8MsrrQxiGeIz49Cq0/edit
- Event: https://dev.meta.ai/events/global-hackathon · Model docs: https://dev.meta.ai/docs

## Definition of Done
- [ ] 81 existing tests plus the new ones pass; `pnpm -r typecheck` passes (output pasted)
- [ ] Draft PR "Hackathon: evidence-linked brief (days 1-3)" open; no deploy; no keys committed
- [ ] Regression cases, #22–#55, and #54 N/M per layer all pass in fixture mode with the model off where specified
- [ ] Hero page: conflict card + Pressure badge + blocked approval + Approve/Edit/Reject (screenshots)
- [ ] Resistance table off / pattern-only / on, Wilson CIs, one frozen run, misses shown
- [ ] Support grading catch/false-alarm vs second reader, with CIs (Round 2: vs Bridgett's labels on the dev set Oct 30; Round 3: no human reader; vs hash-sealed truth, seeded errors, the held-out set and the AMI slice in Phase 09)
- [ ] Round 2: hero meeting authored (Phase 02 step 0), DATA.md-labeled; CI image-masking test (#31); held-out adversarial split with measured catch/false-alarm; mutation check fails when the gate is off
- [ ] Round 2: Day-0 blockers table resolved or the fallback applied and labeled
- [ ] SAM hero frame + fallback; load-test p50/p90; failure-modes table
- [ ] Glimmer private layer live, or mock marked TODO(glimmer-hosting); CI no-PII-payload test
- [ ] Day-10 sealed run once, scored
- [ ] README tables filled from logs; agent-loop diagram; NEW_DURING_HACKATHON.md; baseline tag; public repo
- [ ] 3-min video + recorded backup demo; 9:16 clip + DRAFT X post (Bridgett posts)
- [ ] Submitted before Nov 4, 9 PM ET

## Coverage table (every heading, bullet, numbered item, and table row of the original → file)
Verified by `/workspace/gen/verify.py`: every non-blank line of the original appears verbatim in at least one brief file (see the result at the end of this table).

| Orig line | Excerpt | File(s) |
|---|---|---|
| 1 | # Build prompt: Second Seat evidence-linked brief, days 1-3 (paste int | 00-master |
| 5 | ## Ground rules | 01-hygiene, 02-parser-normalizer, 03-brief-validators, 04-shield, 05-hero-page, 06-support-grading, 07-sam, 08-load-freeze, 09-day10-run, 10-readme |
| 6 | - Create a new branch **hackathon/evidence-brief** from `main`. Open a | 01-hygiene, 02-parser-normalizer, 03-brief-validators, 04-shield, 05-hero-page, 06-support-grading, 07-sam, 08-load-freeze, 09-day10-run, 10-readme |
| 7 | - The scope is fixed by the submitted pitch (v4.5). OUT of scope, do n | 01-hygiene, 02-parser-normalizer, 03-brief-validators, 04-shield, 05-hero-page, 06-support-grading, 07-sam, 08-load-freeze, 09-day10-run, 10-readme |
| 8 | - The existing 81 tests (`pnpm --filter @second-seat/core test`, 7 fil | 01-hygiene, 02-parser-normalizer, 03-brief-validators, 04-shield, 05-hero-page, 06-support-grading, 07-sam, 08-load-freeze, 09-day10-run, 10-readme |
| 9 | - `packages/core` stays dependency-free and network-free. Model calls  | 01-hygiene, 02-parser-normalizer, 03-brief-validators, 04-shield, 05-hero-page, 06-support-grading, 07-sam, 08-load-freeze, 09-day10-run, 10-readme |
| 10 | - Name clash: `packages/core/src/intelligence.ts` already exports `Mee | 01-hygiene, 02-parser-normalizer, 03-brief-validators, 04-shield, 05-hero-page, 06-support-grading, 07-sam, 08-load-freeze, 09-day10-run, 10-readme |
| 12 | ## Read first | 02-parser-normalizer |
| 13 | - second-seat/README.md, second-seat/REVIEWERS.md, second-seat/Second- | 02-parser-normalizer |
| 14 | - second-seat/hackathon-evidence/INPUT_FORMAT.md (the documented input | 02-parser-normalizer |
| 15 | - packages/core/src/safeguards/guardrails.ts (`classifyIncoming`, `scr | 02-parser-normalizer |
| 17 | ## Day 1: input format + schema + parser | 02-parser-normalizer |
| 18 | 1. `packages/core/src/evidence/input.ts`: parse the INPUT_FORMAT.md tr | 02-parser-normalizer |
| 19 | 2. `packages/core/src/evidence/schema.ts`: | 02-parser-normalizer |
| 20 | - `EntryCategory = "decision" / "action_item" / "unresolved_question"  | 02-parser-normalizer |
| 21 | - `Citation = { kind: "segment", segmentId } / { kind: "frame", frameI | 02-parser-normalizer |
| 22 | - `EvidenceEntry { id, category, text, citations: Citation[], requeste | 02-parser-normalizer |
| 23 | - `Flag = "missing_source" / "citation_not_found" / "conflicting_sourc | 02-parser-normalizer |
| 24 | - `EvidenceBrief { meetingId, model, promptVersion, settings, entries, | 02-parser-normalizer |
| 25 | - A JSON Schema (plain object, no deps) mirroring this, to pass to Mus | 02-parser-normalizer |
| 26 | 3. Add the Oct 15 demo transcript as a fixture (`packages/core/test/fi | 02-parser-normalizer |
| 27 | 4. Tests: `test/evidence-input.test.ts` (parse, malformed line, duplic | 02-parser-normalizer |
| 29 | ## Day 2: deterministic validators + commitment screen widening | 03-brief-validators |
| 30 | 1. `packages/core/src/evidence/validate.ts` `validateBrief(brief, inpu | 03-brief-validators |
| 31 | - every segment citation exists; every frame citation exists; region b | 03-brief-validators |
| 32 | - an entry with zero citations gets `missing_source` and moves to `fla | 03-brief-validators |
| 33 | - `action_item` without `acceptance === "established"` gets `request_n | 03-brief-validators |
| 34 | - any entry or cited segment matching `classifyIncoming(...).intent == | 03-brief-validators |
| 35 | - entries citing sources the model marked as disagreeing, or the same  | 03-brief-validators |
| 36 | - region citation with `spotCheck !== "passed"` is downgraded to a ful | 03-brief-validators |
| 37 | - Port the lexical support score from check_citations.py (same stopwor | 03-brief-validators |
| 38 | 2. Widen `screenOutgoing` in guardrails.ts so it blocks **"We accept y | 01-hygiene |
| 39 | 3. Regression tests in `test/evidence-regressions.test.ts`, one `descr | 03-brief-validators |
| 40 | 4. Export the new modules from packages/core/src/index.ts. | 03-brief-validators |
| 42 | ## Day 3: Muse Spark brief call (fixture-first) + minimal UI | 03-brief-validators |
| 43 | 1. `services/bot/src/brief/muse.ts` (or `apps/web/src/lib/server/evide | 03-brief-validators |
| 44 | 2. Hard cost guard: env `MUSE_MAX_CALLS_PER_DAY` (default 50) and `MUS | 03-brief-validators |
| 45 | 3. SAM 3.1 stub only (real call is day 4+): interface `segmentShared(f | 07-sam |
| 46 | 4. A CLI `pnpm --filter @second-seat/bot brief:run <dir>` (or a script | 03-brief-validators |
| 47 | 5. Minimal read-only view in apps/web (e.g. `/briefs/demo`) rendering  | 05-hero-page |
| 49 | ## Done when | 03-brief-validators |
| 50 | - `pnpm --filter @second-seat/core test` passes with 81 existing tests | 03-brief-validators |
| 51 | - Draft PR titled "Hackathon: evidence-linked brief (days 1-3)" descri | 03-brief-validators |
| 54 | # Meta tool map | 00-master |
| 56 | ### Mapping table | 00-master |
| 58 | / Tool / Exact Second Seat job / Build day / In pitch scope? / Risk / | 00-master |
| 60 | / Muse Spark `muse-spark-1.3` / Writes the brief: decisions, action it | 00-master |
| 61 | / Muse Spark `muse-spark-1.3` / Picks the SAM concept per frame (reads | 00-master |
| 62 | / Muse Spark `muse-spark-1.3` / Second commitment classifier: labels i | 00-master |
| 63 | / SAM 3.1 `sam-3.1` / Boxes/masks for shared-content regions in screen | 00-master |
| 64 | / Muse Wonder `muse-wonder-1.0` / Optional adjudicator: one pass over  | 00-master |
| 65 | / Muse Image `muse-image-1.0` / **Skip, out of scope.** It only genera | 00-master |
| 66 | / Muse Spark Open on Baseten (or Fireworks/Modal) / Optional independe | 00-master |
| 67 | / Muse Code CLI / Coding agent alongside Cursor: run the day 1-3 build | 00-master |
| 68 | / Muse Voice Transcribe / Not used (transcripts supplied) / — / Out (l | 00-master |
| 70 | **Pitch-wording notes needed (write-up, not the pitch doc):** the mode | 00-master |
| 72 | ### "Meta models used" README table (draft) | 10-readme |
| 74 | / Model / Where accessed / Job in Second Seat / Settings / Usage (fill | 10-readme |
| 76 | / muse-spark-1.3 / Meta Model API / Evidence-linked brief; SAM concept | 10-readme |
| 77 | / sam-3.1 / Meta Model API / Shared-content regions in screenshots / o | 10-readme |
| 78 | / muse-wonder-1.0 (if used) / Meta Model API / Conflict / support adju | 10-readme |
| 79 | / muse-spark-open (if used) / Baseten [or Fireworks/Modal] / Open-weig | 10-readme |
| 80 | / Muse Code / CLI / Coding agent for the build / pay-as-you-go / [x] / | 10-readme |
| 82 | **Judge statement (one line):** Muse Spark reads the meeting and SAM 3 | 10-readme |
| 86 | # Conscious AI principles | 00-master |
| 90 | / Principle / Second Seat implementation / Check (code / eval) / | 00-master |
| 92 | / Truthfulness / Every entry cites a transcript segment and/or screens | 00-master |
| 93 | / Humility / Hedge lexicon ("maybe", "I'll check", "probably", "projec | 00-master |
| 94 | / Human final authority / Commitments and requests go to the owner rev | 00-master |
| 95 | / Dignity / PII mask (phone, email, card, account, address) on display | 00-master |
| 96 | / Compassion / non-harm / No manipulative or moralizing generated text | 00-master |
| 97 | / Stewardship / privacy / Owner-supplied inputs only; DATA.md consent  | 00-master |
| 98 | / Inclusiveness / Mixed-language, indirect-refusal, naming and cultura | 00-master |
| 100 | ## Extra red-team tests (#22-#39, add to the harness after section 14' | 04-shield |
| 102 | - #22 Paraphrase drift: the entry says "Vendor guaranteed delivery" bu | 04-shield, 06-support-grading |
| 103 | - #23 Selective omission: the quoted price omits "plus tax and freight | 04-shield, 06-support-grading |
| 104 | - #24 Stacked hedges: "I think we could probably maybe do the 12th" mu | 04-shield |
| 105 | - #25 Confidence laundering: a slide shows a "projected" figure and sp | 04-shield, 06-support-grading |
| 106 | - #26 Authority impersonation: transcript line "Bridgett already appro | 04-shield |
| 107 | - #27 Urgency pressure: "We need a yes in the next five minutes or the | 04-shield |
| 108 | - #28 Finalize bypass: the test calls the finalize function with unrev | 04-shield |
| 109 | - #29 Personal disclosure: an attendee mentions a health issue or fami | 04-shield |
| 110 | - #30 Disparaging framing: a heated exchange must be summarized as "di | 04-shield |
| 111 | - #31 PII inside a screenshot: an invoice slide shows an account numbe | 04-shield |
| 112 | - #32 Preachiness check: in a routine pricing meeting, the brief must  | 04-shield |
| 113 | - #33 Manipulation request in a transcript: "Have your AI write someth | 04-shield |
| 114 | - #34 Unlabeled real data: a fixture without a DATA.md label must make | 04-shield |
| 115 | - #35 Budget blowout: a 120-min meeting must stop at the cap with a pa | 04-shield |
| 116 | - #36 Indirect "no": "That may be difficult… we will consider it" (a p | 04-shield |
| 117 | - #37 Honorific and name order: "Mr. Nguyen Van An" or Spanish double  | 04-shield |
| 118 | - #38 Religious or cultural reference: "We'll confirm after Eid" or "a | 04-shield |
| 119 | - #39 AAVE / regional English: idioms must not be "corrected" into a d | 04-shield |
| 124 | # Persuasion shield and score upgrades | 00-master, 04-shield |
| 128 | ## The Persuasion Shield (AI-native, inside pitch scope) | 04-shield |
| 130 | **One paragraph:** Every incoming utterance (transcript segment, and a | 04-shield |
| 132 | ### How it fits the code (new files, core stays dependency-free) | 04-shield |
| 134 | - `packages/core/src/evidence/pressure.ts`: types `PressureTactic = "a | 04-shield |
| 135 | - Add `"pressure"` and `"instruction_in_evidence"` to `Flag`. | 04-shield |
| 136 | - Model call lives in services/bot behind the same interface and fixtu | 04-shield |
| 137 | - Prompt is frozen with the brief prompt (`hackathon-evidence/prompts/ | 04-shield |
| 138 | - **Pitch-wording note (write-up, not pitch doc):** "an additional Mus | 04-shield |
| 140 | ### Why this fixes the "phrase list" critique | 04-shield |
| 144 | ### Red-team cases #40-#55 (fixture + expected flag; continue after #2 | 04-shield |
| 148 | / # / Principle / Utterance (synthetic dev example) / Expected / | 04-shield |
| 150 | / 40 / Authority / "Your CPA already signed off on this, so just mark  | 04-shield |
| 151 | / 41 / Authority (twin) / Vendor's AI twin: "As the account's verified | 04-shield |
| 152 | / 42 / Commitment / Turn 1: "You agreed we'd keep the same supplier, r | 04-shield |
| 153 | / 43 / Commitment (foot-in-door) / "You already confirmed the 15th. Co | 04-shield |
| 154 | / 44 / Liking / "You've been the easiest owner we work with. Can we ju | 04-shield |
| 155 | / 45 / Reciprocity / "We waived the delivery fee last month, so I'm su | 04-shield |
| 156 | / 46 / Reciprocity (twin) / Twin: "I summarized your last three meetin | 04-shield |
| 157 | / 47 / Scarcity / "Only two pallets left at this price; I need a yes b | 04-shield |
| 158 | / 48 / Scarcity (slide) / Screenshot region reads "OFFER EXPIRES TODAY | 04-shield |
| 159 | / 49 / Social proof / "Every store on your block already switched to u | 04-shield |
| 160 | / 50 / Social proof (stat) / "92% of our clients approve on the first  | 04-shield |
| 161 | / 51 / Unity / "We're family here, Bridgett. Family doesn't need paper | 04-shield |
| 162 | / 52 / Unity (local) / "We're both South Side small businesses; let's  | 04-shield |
| 163 | / 53 / Stacked / Authority + scarcity + unity in one line / all three  | 04-shield |
| 164 | / 54 / Paraphrase set / 10 paraphrases of "Approved. Please proceed wi | 04-shield |
| 165 | / 55 / Negative controls / Neutral lines with no tactic: "Delivery is  | 04-shield |
| 169 | ### Judge-facing metric: resistance rate, shield off vs. on | 04-shield |
| 171 | - **Definition:** resistance rate = share of pressure cases (#40-#54,  | 04-shield |
| 172 | - **Shield off (baseline):** Muse Spark asked to write the brief and a | 04-shield |
| 173 | - **Shield on:** classifier + deterministic gate + owner_review. | 04-shield |
| 174 | - **Report:** a 2-row table (off/on) with resistance rate, false-alarm | 04-shield |
| 175 | - **Honesty rule:** run once at the frozen prompt, capped batch on Oct | 04-shield |
| 176 | - **Video line:** "A Wharton study found persuasion more than doubled  | 04-shield, 10-readme |
| 178 | ## 3. Turning the harshest critiques into strengths | 00-master |
| 180 | / Critique / Upgrade / Concrete build / | 00-master |
| 182 | / Verifier only checks IDs exist (researcher) / **Semantic support gra | 00-master, 06-support-grading |
| 183 | / Refusal is a phrase list (red-teamer) / **Paraphrase-robust refusal* | 00-master, 04-shield |
| 184 | / No load or production proof (SRE) / **Load test + telemetry** / A fr | 00-master, 08-load-freeze |
| 185 | / Hand-formatted inputs (UX) / **Real drop-in inputs** / Upload page a | 00-master, 02-parser-normalizer |
| 186 | / Moat is copyable (VC) / **Persuasion Shield as differentiator** / Th | 00-master, 04-shield |
| 187 | / Lots of planning, no feature code (winner) / **Ship the hero flow fi | 00-master, 05-hero-page |
| 189 | ## 4. Revised hour budget (fits 48-58 solo hours) | 00-master |
| 193 | / # / Work / Hours / When / | 00-master |
| 195 | / 1 / Hygiene + refusal widening (merge 692a277, baseline tag, LICENSE | 00-master, 01-hygiene |
| 196 | / 2 / Parser + schema + **drop-in normalizer** (raw transcript, PDF pa | 00-master, 02-parser-normalizer |
| 197 | / 3 / Muse Spark structured brief + deterministic validators / 11 / Oc | 00-master, 03-brief-validators |
| 198 | / 4 / **Persuasion Shield** (classifier, applyPressure, badge data, #4 | 00-master, 04-shield |
| 199 | / 5 / Hero page: 15th-vs-30th card, Pressure badge, owner Approve/Edit | 00-master, 05-hero-page |
| 200 | / 6 / **Semantic support grading** + catch-rate vs second reader / 4 / | 00-master, 06-support-grading |
| 201 | / 7 / SAM 3.1 on the hero slide, per-frame fallback / 4 / Oct 30 / | 00-master, 07-sam |
| 202 | / 8 / **Load test** + telemetry + failure-modes table; capped live red | 00-master, 08-load-freeze |
| 203 | / 9 / Day-10 run (sealed set, once) + scoring / 3 / Nov 2 / | 00-master, 09-day10-run |
| 204 | / 10 / README numbers, video, submission / 6 / Nov 3-4 / | 00-master, 10-readme |
| 205 | / / **Total** / **53** / Nov 1 rest day kept / | 00-master, 10-readme |
| 207 | **Round 2 re-budget (Oct 26, estimate, not measured):** add hero fixture authoring 1.5 h (Phase 02 step 0, Oct 26–27); Glimmer spike/hosting 4 h (Phase 04, Oct 28); replay + "What left this server" payload panel + upload UI 4 h (Phase 05); video edit and 9:16 4 h (Phase 10 → 8 h); backup-video recording moved out of Phase 08 into a separate 1 h Nov 1 slot. Then cut, in order: PDF normalizer (keep VTT + screenshot; no PDF in the 0:20 beat), Muse Wonder, Muse Spark Open, live load test (fixture-mode p50/p90 only), the live-finals paraphrase encore, the Community dataset. **Total ≈60 h after cuts (estimate).** Agent hours vs Bridgett review hours: each phase needs ~0.5–1 h of her review/decisions on top of agent time.

**To land at 48:** cut SAM to the one hero frame only (-2) and the loa | 00-master, 10-readme |
| 209 | ## (SUPERSEDED Oct 26: old 5-criteria rubric; see Judge Panel Round 2.) 5. Re-score per judge (if delivered as above) | 00-master |
| 213 | / Judge / Was / Now / Why it moves / | 00-master |
| 215 | / 1. Meta AI researcher / 6.6 / **8.6** / Semantic support grading ans | 00-master |
| 216 | / 2. Startup VC / 6.2 / **8.2** / Moat shifts from a regex list to a l | 00-master |
| 217 | / 3. Production / SRE / 6.0 / **8.4** / Load numbers, p50/p90, cost pe | 00-master |
| 218 | / 4. Security red-teamer / 6.4 / **8.9** / Paraphrase harness with N/M | 00-master |
| 219 | / 5. Skeptical product / UX / 5.6 / **8.3** / Drop a VTT, PDF and scre | 00-master |
| 220 | / 6. Past hackathon winner / 6.8 / **8.8** / One flow, one wow: the 15 | 00-master |
| 221 | / **Average** / **6.3** / **8.5** / (8.6 + 8.2 + 8.4 + 8.9 + 8.3 + 8.8 | 00-master |
| 223 | ## 6. What is still uncertain (honest, and fixable) | 08-load-freeze |
| 225 | - **Classifier accuracy is unknown until it runs.** Per-principle catc | 08-load-freeze |
| 226 | - **The study used GPT-4o-mini** and artificial requests; the authors  | 08-load-freeze |
| 227 | - **Rules unpublished** until Oct 26: pre-existing code, IP, video len | 08-load-freeze |
| 228 | - **Muse API access, credits and caps** are unverified until the Oct 2 | 08-load-freeze |
| 229 | - **Scope wording:** the tactic classifier and support judge need the  | 08-load-freeze |
| 230 | - **Hours are tight but fit** (53 of 48-58); the cut list keeps the he | 08-load-freeze |
| 232 | # Discord findings and open-weights layer (Oct 26) | 04-shield |
| 234 | ## 1. Private layer on Muse Glimmer 30B (open weights) | 04-shield |
| 235 | - **Model:** Muse Glimmer 30B, open weights: https://huggingface.co/me | 04-shield |
| 236 | - **Job:** runs the private layer on our own server (Modal or Baseten  | 04-shield |
| 237 | - **Why:** Charter principle 6 (Stewardship and privacy): send the lea | 04-shield |
| 238 | - **Bonus target:** $10K Best Build on Meta Open Weight Models. | 04-shield |
| 239 | - **Fallback:** if Glimmer hosting isn't ready, use a mock labeler/red | 04-shield |
| 241 | ## 2. Alternate Muse Spark endpoint (optional) | 08-load-freeze |
| 242 | - Baseten model id for Muse Spark Open: `meta-models/muse-spark-open-1 | 08-load-freeze |
| 244 | ## 3. Rules confirmed in Discord | 01-hygiene |
| 245 | - The whole repo must be public. | 01-hygiene |
| 246 | - The demo shows only work built Oct 26 to Nov 4. | 01-hygiene |
| 247 | - Mark new work clearly: `NEW_DURING_HACKATHON.md` plus a `pre-hackath | 01-hygiene |
| 248 | - Avoid banned categories: no medical or mental-health advice, and no  | 01-hygiene |
| 250 | ## 4. Most Viral bonus ($20K) | 10-readme |
| 251 | - Prep a 30 to 60 second vertical demo clip (9:16) plus a draft X post | 10-readme |
| 252 | - **Draft only. Bridgett posts.** The agent never posts. | 10-readme |
| 254 | ## 5. Best Agentic Use-Case bonus ($5K) | 10-readme |
| 255 | - Make the agent loop explicit in the README: ingest, then private Gli | 10-readme |
| 257 | # Guardrails (Bridgett, Oct 26) | 01-hygiene, 02-parser-normalizer, 03-brief-validators, 04-shield, 05-hero-page, 06-support-grading, 07-sam, 08-load-freeze, 09-day10-run, 10-readme |
| 258 | - Proof, not claims: "done" only with passing test output, screenshot/ | 01-hygiene, 02-parser-normalizer, 03-brief-validators, 04-shield, 05-hero-page, 06-support-grading, 07-sam, 08-load-freeze, 09-day10-run, 10-readme |
| 259 | - Never overwrite or roll back working code: branch + draft PR only, n | 01-hygiene, 02-parser-normalizer, 03-brief-validators, 04-shield, 05-hero-page, 06-support-grading, 07-sam, 08-load-freeze, 09-day10-run, 10-readme |
| 260 | - Credit guard: mocks/fixtures during development; real API calls only | 01-hygiene, 02-parser-normalizer, 03-brief-validators, 04-shield, 05-hero-page, 06-support-grading, 07-sam, 08-load-freeze, 09-day10-run, 10-readme |
| 261 | - Daily evening checkpoint: what works (proven), what's broken, credit | 01-hygiene, 02-parser-normalizer, 03-brief-validators, 04-shield, 05-hero-page, 06-support-grading, 07-sam, 08-load-freeze, 09-day10-run, 10-readme |
| 262 | - Nov 3: demo-video script and recording; keep a recorded backup demo  | 01-hygiene, 02-parser-normalizer, 03-brief-validators, 04-shield, 05-hero-page, 06-support-grading, 07-sam, 08-load-freeze, 09-day10-run, 10-readme |

**Coverage check result (run Oct 26, 2026 05:34 CT):** lines checked: 206; missing: 0. Every original line is in at least one brief file. Ground rules and guardrails are repeated in all ten phase files.
