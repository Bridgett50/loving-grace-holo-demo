# Phase 03: Muse Spark structured brief + deterministic validators
Source: `/workspace/second-seat-hackathon-build-prompt.md` (kept as-is). Time budget: **11 h** (Oct 28-29). Overrun rule: at 150% of the budget, stop and apply the cut list in 00-master.

## Goal
Spark writes the evidence-linked brief; deterministic code verifies existence, acceptance, commitment, conflict, region, and speaker.

## Round 2 fixes (Oct 26; from the Judge Panel Round 2 (https://docs.google.com/document/d/1IuCGBuZ7PV46QVw6aDNDkeMUhyiXl1k8Jt_xf4wDO-A/edit). These SUPERSEDE any conflicting text below, including the verbatim sections)
- Blocked on the Meta key (Day-0 blockers, due Oct 27 12:00 CT): without it stay fixture-only; do not hand-write fixtures displayed as model output.
- Phases 03 and 04 overlap Oct 28–29 (17 h over two days) and 04 depends on 03's pipeline: finish the 03 schema + validators before starting the 04 classifier.
- Runtime key: `MODEL_API_KEY` exported in the shell or CI secret only.

## Inputs
Phase 02 schema/parser; Oct 15 raw response fixture; prompts/brief-v1.txt.

## Exact models and settings
`muse-spark-1.3` (Standard mode, never `-contributor` on real data) via `POST https://api.meta.ai/v1/chat/completions`, `MODEL_API_KEY` from env (never logged). Settings: `developer` role, `response_format: {type:"json_schema", json_schema:{name, strict:true, schema}}`, sampling left unset (temp 1.0, top_p 1.0), fixed `seed` (best-effort only, so record fixtures), and `max_completion_tokens` capped (reasoning tokens count against it; start at 16000 and log `usage.completion_tokens_details.reasoning_tokens`). Stream if a call runs long (non-streaming requests 504 on total time). Retry 429/5xx with backoff and jitter, honoring Retry-After. Never retry a 400 unchanged. `reasoning_effort:"medium"`. Prompt order is cache-friendly: stable developer prompt and schema first, transcript last, wrapped in data tags (spotlighting). Hard cost guard `MUSE_MAX_CALLS_PER_DAY` (50), `MUSE_MAX_TOKENS_PER_CALL`, $5/day per provider. `EVIDENCE_BRIEF_MODE=fixture` is the default in CI.

## Acceptance tests
- [ ] `test/evidence-regressions.test.ts`: one describe per pitch case, all green with the model OFF.
- [ ] The [00:37] entry becomes `request_not_accepted` / owner review.
- [ ] `brief:run <dir>` writes brief.json + brief.md in fixture mode with zero network (test with network disabled).
- [ ] A capped live call returns schema-valid JSON on the first try; log tokens and cost.
- [ ] Done-when list: 81 + new tests, typecheck, draft PR titled as specified.

## Proof required
Test output; the brief.json of one live call (keys redacted); the cost log line. "Done" requires this proof; Grok Bot verifies it independently.

## Original brief text for this phase (verbatim)
<!-- original lines 29-37 -->
## Day 2: deterministic validators + commitment screen widening
1. `packages/core/src/evidence/validate.ts` `validateBrief(brief, input)`; deterministic only, documented as **existence checks, not proof of support**:
   - every segment citation exists; every frame citation exists; region boxes lie within frame bounds when dimensions are known;
   - an entry with zero citations gets `missing_source` and moves to `flagged`;
   - `action_item` without `acceptance === "established"` gets `request_not_accepted` and is recategorized to `unresolved_question` / owner review (the [00:37] voice-sample-checklist regression);
   - any entry or cited segment matching `classifyIncoming(...).intent === "binding_request"` or the widened commitment patterns must be `owner_review`, never `decision`/`action_item` (gets `commitment_language`);
   - entries citing sources the model marked as disagreeing, or the same fact with differing values, get `conflicting_sources` and go to `flagged`;
   - region citation with `spotCheck !== "passed"` is downgraded to a full-frame citation (`region` removed) and gets `region_spotcheck_failed` (per-frame fallback from the pitch).
   - Port the lexical support score from check_citations.py (same stopwords, 0.35 threshold) as an advisory `lexicalSupport` number, and note in code that it scored the [00:37] miss 1.00.

<!-- original lines 39-40 -->
3. Regression tests in `test/evidence-regressions.test.ts`, one `describe` per pitch case: commitment language the screen missed; missing evidence; conflicting sources; request promoted to action item without acceptance (the Oct 15 [00:37] entry, using the committed raw response as fixture); negation flip (e.g. source "we are NOT moving the review" vs entry "moving the review"); wrong speaker attribution (entry attributes a line to the wrong speaker; validator checks `speaker` against the cited segment's speaker).
4. Export the new modules from packages/core/src/index.ts.

<!-- original lines 42-44 -->
## Day 3: Muse Spark brief call (fixture-first) + minimal UI
1. `services/bot/src/brief/muse.ts` (or `apps/web/src/lib/server/evidence-brief.ts`, whichever is simpler; keep it server-side): OpenAI-compatible call to `https://api.meta.ai/v1/chat/completions`, model `muse-spark-1.3`, key from env `MODEL_API_KEY` (never logged), instructions in a `developer` message (not `system`), `response_format` = the JSON Schema from day 1, default sampling (no temperature change), fixed `seed`, `reasoning_effort` set explicitly (`"medium"`), `max_completion_tokens` capped. Transcript as text; screenshots as image inputs only if the image-understanding docs confirm Chat Completions accepts them, otherwise leave a TODO and use the Responses API. Store the exact prompt text and version string in the repo (`hackathon-evidence/prompts/brief-v1.txt`) so the day-10 run uses a fixed prompt.
2. Hard cost guard: env `MUSE_MAX_CALLS_PER_DAY` (default 50) and `MUSE_MAX_TOKENS_PER_CALL`; refuse when exceeded. A `--fixture` / `EVIDENCE_BRIEF_MODE=fixture` path returns a recorded response so CI and the public demo never spend money.

<!-- original lines 46-46 -->
4. A CLI `pnpm --filter @second-seat/bot brief:run <dir>` (or a script under second-seat/scripts/) that reads an INPUT_FORMAT directory, calls the model (or fixture), runs `validateBrief`, and writes `brief.json` + `brief.md`.

<!-- original lines 49-51 -->
## Done when
- `pnpm --filter @second-seat/core test` passes with 81 existing tests plus the new ones; `pnpm -r typecheck` passes.
- Draft PR titled "Hackathon: evidence-linked brief (days 1-3)" describing: what changed, the new test count, which pitch regression cases are covered, what remains (real SAM call, conflict detection tuning, day-10 test), and confirming no deploy and no keys committed.

<!-- original lines 197-197 -->
| 3 | Muse Spark structured brief + deterministic validators | 11 | Oct 28-29 |

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
