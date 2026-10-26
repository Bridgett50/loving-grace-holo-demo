# Phase 08: Load test, telemetry, failure modes, live red-team batch, prompt freeze
Source: `/workspace/second-seat-hackathon-build-prompt.md` (kept as-is). Time budget: **3 h** (Oct 31). Overrun rule: at 150% of the budget, stop and apply the cut list in 00-master.

## Goal
Production proof and a frozen prompt.

## Round 2 fixes (Oct 26; from the Judge Panel Round 2 (https://docs.google.com/document/d/1IuCGBuZ7PV46QVw6aDNDkeMUhyiXl1k8Jt_xf4wDO-A/edit). These SUPERSEDE any conflicting text below, including the verbatim sections)
- Load test: **fixture-mode p50/p90 only**, labeled "fixture mode, not production." No "holds up in production" claim. The live long-meeting run is cut unless time remains. Case #15 (inlined): very long meeting, 90–120 min, 300+ segments, 30+ frames; completes under caps, citations valid, latency/cost logged.
- Wonder and Spark Open: CUT (Round 2 #8). The Discord `-1026` Spark Open slug is unverified; do not use it.
- Backup-video recording moved OUT of this phase to a separate 1 h Nov 1 slot.
- The resistance table uses rows off / pattern-only / pattern+Spark (+Glimmer pre-label column if built), measured on the held-out adversarial split (Phase 04).

## Inputs
All prior phases.

## Exact models and settings
k6 or autocannon in fixture mode. One long-meeting live run (#15) under caps. Optional: Muse Wonder adjudicator (`muse-wonder-1.0`, $4/$20 per 1M, adds flags only; cut first). Optional: Muse Spark Open on Baseten (`https://inference.baseten.co/v1`; verify the slug with `GET /v1/models`; the official slug is `meta-models/muse-spark-open`, the Discord `-1026` is unverified). **No structured output on Baseten**, so validate in code. Always set `reasoning_effort` (the default is xhigh).

## Acceptance tests
- [ ] A p50/p90 table from the real run.
- [ ] A failure-modes table (SAM zero matches, Spark 504/429, retry then fixture).
- [ ] The resistance table from ONE frozen-prompt run, misses shown.
- [ ] Prompt hashes recorded in the README draft.

## Proof required
k6/autocannon output; cost log; resistance table; freeze commit hash. "Done" requires this proof; Grok Bot verifies it independently.

## Notes
**Demo-critical:** (Round 2: moved to a separate 1 h Nov 1 slot) record the backup demo video of the full 3-min script (a fixture-mode run), then re-record Nov 3.

## Original brief text for this phase (verbatim)
<!-- original lines 184-184 -->
| No load or production proof (SRE) | **Load test + telemetry** | A free open-source load tool (k6 or autocannon) against the brief page and CLI in fixture mode (e.g. concurrent briefs, p50/p90); one long-meeting run (#15, 300+ segments) live under caps; latency, tokens and cost logged per call; failure-modes table (SAM zero matches, Spark timeout, retry then fixture). Numbers are whatever the run produces. |

<!-- original lines 202-202 -->
| 8 | **Load test** + telemetry + failure-modes table; capped live red-team batch; prompt freeze | 3 | Oct 31 |

<!-- original lines 223-230 -->
## 6. What is still uncertain (honest, and fixable)

- **Classifier accuracy is unknown until it runs.** Per-principle catch and false alarms on short meeting lines have not been measured; liking and unity are likely the hardest to separate from ordinary friendliness. Report as measured.
- **The study used GPT-4o-mini** and artificial requests; the authors say effects vary by model and implementation. We cite it as motivation, not as a prediction for Muse Spark.
- **Rules unpublished** until Oct 26: pre-existing code, IP, video length and judging weights. The 8.5 assumes the hero flow and day-10 run land; scores are simulated judges.
- **Muse API access, credits and caps** are unverified until the Oct 26 spike; fixture mode keeps the demo and CI free either way.
- **Scope wording:** the tactic classifier and support judge need the pitch-wording note ("can only add flags"). Upload of exported files stays inside "owner-supplied... nothing captured live."
- **Hours are tight but fit** (53 of 48-58); the cut list keeps the hero flow safe.

<!-- original lines 241-242 -->
## 2. Alternate Muse Spark endpoint (optional)
- Baseten model id for Muse Spark Open: `meta-models/muse-spark-open-1026`. Keep it config-only (env var). Keys go in env/secrets, never in the repo.

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
