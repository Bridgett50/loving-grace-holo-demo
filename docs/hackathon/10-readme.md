# Phase 10: README numbers, video, submission, bonuses
Source: `/workspace/second-seat-hackathon-build-prompt.md` (kept as-is). Time budget: **6 h** (Nov 3-4). Overrun rule: at 150% of the budget, stop and apply the cut list in 00-master.

## Goal
Submission: README with real numbers, the Meta models table, agent-loop diagram, 3-min video, 9:16 clip, draft X post. Submit before Nov 4, 9 PM ET (8 PM Central).

## Round 2 fixes (Oct 26; from the Judge Panel Round 2 (https://docs.google.com/document/d/1IuCGBuZ7PV46QVw6aDNDkeMUhyiXl1k8Jt_xf4wDO-A/edit). These SUPERSEDE any conflicting text below, including the verbatim sections)
- Add README rows: **"Muse Glimmer 30B | self-hosted vLLM [or mock: TODO] | PII redaction (+ pre-label) | temp 1.0/top_p 0.95/top_k 64 | [N] calls"**; "muse-spark-1.3 | Meta Model API | Persuasion Shield tactic/ask/target/span classifier (the one commitment classifier; adds flags only) | ... | [N] calls"; "muse-spark-1.3 | Meta Model API | Semantic support judge | ... | [N] calls". Drop Wonder/Spark Open rows unless used.
- **Judge statement:** "Muse Spark reads the meeting and labels pressure tactics, SAM 3.1 finds the evidence on screen, open-weights Glimmer redacts on our server, and deterministic code verifies every citation and quote and holds every commitment for the owner."
- Agentic loop: change "then action" to **"then the owner's decision (Second Seat takes no action)."**
- Video line: "Different model, different test, so this is motivation, not a head-to-head. Here's what our gate and classifier caught."
- Cold open = the badge (one cold open). "Be in 1,000 meetings at once" appears only as a labeled **Vision / roadmap, not built** line, never as a capability.
- Gov/defense roadmap: out of the video and README body (footnote at most). Diagram: screenshots → on-server masking → SAM 3.1.
- Budget **8 h** (video edit + 9:16 = 4 h). Submission link: the `hackathon/evidence-brief` branch, or `main` after Bridgett merges. Proof "README rendered on the public repo" = rendered on that public branch; no deploy. X post: DRAFT only, Bridgett posts. Bridgett submits/approves the submission.

## Inputs
All results; 00-win-plan.md script.

## Exact models and settings
No new model calls except re-recording the demo (fixture or capped).

## Acceptance tests
- [ ] The README table is filled from the logs; the judge statement is present; pitch-wording notes are in the write-up.
- [ ] Agent-loop diagram naming each tool call.
- [ ] The video is ≤3 min (verify the rule) and the backup recording is saved.
- [ ] The X post is a DRAFT ONLY, for Bridgett to post.

## Proof required
Submission confirmation screenshot; video file; README rendered on the public repo. "Done" requires this proof; Grok Bot verifies it independently.

## Notes
**Demo-critical:** follow the second-by-second script in 00-win-plan.md; cold-open on the mic-drop; finals backup video on two devices.

## Original brief text for this phase (verbatim)
<!-- original lines 72-82 -->
### "Meta models used" README table (draft)

| Model | Where accessed | Job in Second Seat | Settings | Usage (fill at end) |
|---|---|---|---|---|
| muse-spark-1.3 | Meta Model API | Evidence-linked brief; SAM concept choice; commitment classifier (adds flags only) | developer role, structured output, reasoning effort [x], prompt hash [x] | [N] calls |
| sam-3.1 | Meta Model API | Shared-content regions in screenshots | one concept per request | [N] frames, [N] passed spot-check, [N] full-frame fallback |
| muse-wonder-1.0 (if used) | Meta Model API | Conflict / support adjudication, adds flags only | [x] | [N] calls |
| muse-spark-open (if used) | Baseten [or Fireworks/Modal] | Open-weights cross-check | [x] | [N] calls |
| Muse Code | CLI | Coding agent for the build | pay-as-you-go | [x] |

**Judge statement (one line):** Muse Spark reads the meeting and SAM 3.1 finds the evidence on screen, and deterministic code then checks every citation before the owner signs off.

<!-- original lines 176-176 -->
- **Video line:** "A Wharton study found persuasion more than doubled an LLM's compliance, 33% to 72%. Here is our resistance rate with the shield off, and on."

<!-- original lines 204-207 -->
| 10 | README numbers, video, submission | 6 | Nov 3-4 |
| | **Total** | **53** | Nov 1 rest day kept |

**To land at 48:** cut SAM to the one hero frame only (-2) and the load test to fixture-mode only (-1), and trim the normalizer to VTT + screenshots (PDF later, -2). **Cut first if late (unchanged):** signed receipts/C2PA, multilingual switch, Muse Wonder adjudicator, Prompt Guard 2, charter cases not doubling as regressions.

<!-- original lines 250-255 -->
## 4. Most Viral bonus ($20K)
- Prep a 30 to 60 second vertical demo clip (9:16) plus a draft X post. Engagement counts through Nov 8.
- **Draft only. Bridgett posts.** The agent never posts.

## 5. Best Agentic Use-Case bonus ($5K)
- Make the agent loop explicit in the README: ingest, then private Glimmer label/redact, then Muse Spark brief, then charter checks, then human review, then action. Include a diagram and name each tool call.

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
