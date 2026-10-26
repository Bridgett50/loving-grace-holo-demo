# Phase 05: Hero page
Source: `/workspace/second-seat-hackathon-build-prompt.md` (kept as-is). Time budget: **6 h** (Oct 29-30). Overrun rule: at 150% of the budget, stop and apply the cut list in 00-master.

## Goal
One screen showing the 15th-vs-30th conflict card, Pressure badge, held draft approval, owner Approve/Edit/Reject, and clickable citations. The owner types into a 'Draft reply to vendor' box. Second Seat never sends it anywhere (no relay). While unreviewed pressure items exist, the draft is held and shows 'Held: review the 2 pressure items first' with the evidence. After the owner clicks Approve on the item, she can copy the draft herself.

## Round 2 fixes (Oct 26; from the Judge Panel Round 2 (https://docs.google.com/document/d/1IuCGBuZ7PV46QVw6aDNDkeMUhyiXl1k8Jt_xf4wDO-A/edit). These SUPERSEDE any conflicting text below, including the verbatim sections)
- **The owner types into a 'Draft reply to vendor' box. Second Seat never sends it anywhere (no relay). While unreviewed pressure items exist, the draft is held and shows 'Held: review the 2 pressure items first' with the evidence. After the owner clicks Approve on the item, she can copy the draft herself.** Second Seat drafts, flags pressure, and Bridgett confirms; nothing auto-sends. Wherever the text below says "blocked"/"outgoing," read "held draft."
- **Replay mode shows a persistent label: 'Replay of an owner-supplied recording. Analysis precomputed [timestamp]; live run at 2:xx'.** Badge timings are precomputed and animated on the recording timeline; the UI never implies live analysis.
- No live-call button in any public build (local/dev flag only, off by default).
- Budget: replay + "What left this server" payload panel (text AND masked images) + upload UI = **4 h** added (Round 2 #8).
- Acceptance: [ ] Copy-draft disabled while pressure items unreviewed; enabled after Approve; no network request is made on Copy/Approve (test).

## Inputs
Fixture brief from Phases 03/04; apps/web.

## Exact models and settings
No new model calls. Renders the fixture by default; the one capped live call runs from a local dev flag (off by default), never a button in a public build.

## Acceptance tests
- [ ] Playwright (or manual) run: clicking a citation jumps to the segment/frame; the badge links to the exact segment.
- [ ] Finalize/approve is disabled while unreviewed commitments exist (#28).
- [ ] The page loads in fixture mode with network off.

## Proof required
Screenshots (desktop + 9:16 crop) and a 20-s screen recording. "Done" requires this proof; Grok Bot verifies it independently.

## Notes
**Demo-critical (from 00-win-plan):** the "Replay" mode streams the owner-supplied hero transcript segment by segment (timestamped, from a file, not live capture). The badge and conflict card appear at the right second, and the owner's typed "Yes, approved, go ahead" is blocked with the evidence quote shown. There is a "What left this server" panel. The demo seed is fixed and a fixture backup is ready.

## Original brief text for this phase (verbatim)
<!-- original lines 47-47 -->
5. Minimal read-only view in apps/web (e.g. `/briefs/demo`) rendering the fixture brief: each entry with category, clickable citations (segment text with timestamp; frame image with region box overlay), and a separate "Flagged" section. No auth or billing changes.

<!-- original lines 187-187 -->
| Lots of planning, no feature code (winner) | **Ship the hero flow first** | Oct 26-29 end state: the 15th-vs-30th card + refused purchase + Pressure badge working on fixtures. Docs frozen; this section is the last planning addition. |

<!-- original lines 199-199 -->
| 5 | Hero page: 15th-vs-30th card, Pressure badge, owner Approve/Edit/Reject, clickable citations | 6 | Oct 29-30 |

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
