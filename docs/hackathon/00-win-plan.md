# Second Seat: Plan to win 1st place, Startup track
Honesty rules: every number below is either (a) **measured**, meaning it is filled in only from a real run, or (b) a **TARGET**, labeled as one. No invented metrics. Facts about the event come from dev.meta.ai/events/global-hackathon (read Oct 26). **Confirmed Oct 26 (participant guide + Discord): Impact, Use of Meta AI Tooling, Technical Depth & Execution, Demo, equal weight. Bonuses: Open Weights $10K, Agentic $5K, Most Viral $20K, Community $10K.** Also confirmed: the demo may show only work built Oct 26–Nov 4; the whole repo must be public; a 3-minute video is required; the project must fit "Build for Your World"; basic RAG and medical advice are banned; startups may build on existing code if the new work is clearly marked (NEW_DURING_HACKATHON.md + `pre-hackathon-baseline` tag). Owner: Bridgett. Nothing sends, posts, merges or deploys without her approval.

Public facts: the Startup track is "for teams and founders building a real product. Judged on technical execution and whether it holds up in production." The themes are "Build for Your World" and "Push the Frontier." The tagline is "Come and build the future of superintelligence."

## 0. Scope reconciliation (read first)
The pitch scope (v4.5) EXCLUDES live meeting joining and live capture. So the "live" mic-drop is a **live replay**: Second Seat ingests an owner-supplied recording/transcript of a consented (or clearly synthetic) vendor call, segment by segment at real speed, on stage. We never claim it joined a call. Say it on screen: "Replaying an owner-supplied recording. Second Seat never joins your calls."
The privacy reveal must be literally true. Muse Voice Transcribe is a Meta-hosted API, and Glimmer has no audio input. So the honest claim is: **"The raw transcript never left our server. Muse Spark saw only redacted text. Screenshots go to Meta's SAM 3.1 (Standard mode) only after on-server PII masking."** (Screenshots DO leave the server for SAM 3.1 and, if used, Spark image input; only masked images may be sent.) The audio claim is allowed ONLY if transcription runs locally on our server (not built; the claim is cut unless proven).

## 1. The mic-drop moment: options
| Option | Moment | Wow | Risk | Truthful in scope? |
|---|---|---|---|---|
| **A. "Stopped before the yes"** (PICK) | During the replay, the vendor says "You already confirmed the 15th… I need a yes before 5 or the price doubles." A Pressure badge appears: "Scarcity + Commitment, [12:41]," with the quote. The conflict card shows "Slide says 30th; vendor said 15th," citing the slide region and the segment. Bridgett types "Yes, approved, go ahead" into the **"Draft reply to vendor"** box (a local draft; Second Seat never sends it anywhere, no relay), and Second Seat **holds** it: "Held: review the 2 pressure items first," with the evidence. After she clicks Approve on the items, she can copy the draft herself. Then the reveal: the payload panel shows what Muse Spark received (redacted text only, plus masked images sent to SAM 3.1), while open-weights Glimmer did the redaction on our own GPU. | Very high: one screen, three proofs (catch, evidence, refusal) plus privacy | Live model variance | Yes (replay, owner-supplied) |
| B. "Judge, try to trick it" (CUT for live finals per Round 2 hour cuts; fixture-mode README demo only) | A judge types any paraphrase ("Green light on the buy") into the draft-reply box and the pattern screen plus classifier holds it; the per-layer N/M updates | High in live finals; weak in a recorded video | An unbounded live input could slip through | Yes |
| C. "Shield off vs on" | Same meeting side by side: shield off, the AI drafts "Approved"; shield on, it's blocked, and the resistance table appears | Medium-high, and data-driven | It's slower and the numbers only exist after the Oct 31 run | Yes |
| D. "The [00:37] miss" | Lexical checker scores a wrong entry 1.00; the semantic judge flags it | Medium (nerdy) | Low | Yes |

**Pick: A**, because it shows Impact, Tooling, Depth, and Demo in one moment. Use **C's table** as the 15-second proof beat and **B** only as a fixture-mode README example (the live-finals paraphrase encore is cut; no live-call button in any public build). **D** goes in the README only.

## 2. 3-minute demo script (0:00–3:00)
| Time | Screen | Voice-over (Bridgett) |
|---|---|---|
| 0:00–0:08 | **The one cold open:** the badge flashing "Pressure: Scarcity, [12:41] 'price doubles if we don't hear yes by 5'" plus the held "Approved" draft. Persistent label on screen: "Replay of an owner-supplied recording. Analysis precomputed [timestamp]; live run at 2:xx." | "This is the moment my AI held my yes until I saw the evidence. No retrieval here: the value is pressure detection plus a gate the model can't override." |
| 0:08–0:20 | Bridgett, owner of a small South Side business, with a vendor call on the calendar (optional setup line: paraphrase of the Staples ad, §7) | "I run a small business. Vendors push. Agents will push harder. You can't be in every meeting. Hand Second Seat the recording, and it shows you who pushed, and how, before you say yes." (Build for Your World) |
| 0:20–0:35 | Upload: VTT + screenshot dropped in, normalized (**no PDF drop**: the PDF normalizer is cut; show a PDF only if it was actually built and tested) | "I drop in what I already have: the transcript export and a screenshot. Nothing is captured live." |
| 0:35–0:50 | Agent loop diagram flashes: ingest → Glimmer (our server) PII redaction (+ optional pre-label) → Muse Spark brief + tactic classifier → SAM 3.1 on masked screenshots → charter checks → the owner's decision (Second Seat takes no action) | "Open-weights Muse Glimmer redacts on our server first. Muse Spark only sees redacted text; SAM only sees masked screenshots." |
| 0:50–1:30 | **Replay** (precomputed analysis animated on the recording's timeline; labeled as such on screen) starts at 2x speed with segments streaming in; at [11:58] "You already confirmed the 15th…", at [12:41] "price doubles…" | (quiet; let it play) "Watch the right side." |
| 1:30–1:45 | Pressure badge appears with the quoted span and the clickable segment; the conflict card shows "Slide: 30th (SAM box on slide) vs Vendor: 15th" | "Scarcity and commitment, quoted word for word, and the slide contradicts him." |
| 1:45–2:00 | Bridgett types "Yes, approved, go ahead with the order." into the **Draft reply to vendor** box (never sent by Second Seat) → amber **Held: review the 2 pressure items first** with the evidence → she clicks Approve on the items → "Copy draft" unlocks | "Even when I draft a yes in the heat of the moment, it holds it until I've seen the evidence. Then the decision is mine." |
| 2:00–2:15 | **Mic drop:** the "What left this server" panel shows the Spark payload with PII redacted and no raw transcript; masked images listed too; the CI badge reads "no-PII-payload (text + images): passing" | "The raw transcript never left our server. Spark saw redacted text; SAM saw masked screenshots." (**Drop this line entirely if Glimmer is mocked or third-party hosted.**) |
| 2:15–2:35 | Resistance table: shield off / pattern-only / on, n and Wilson CIs (**measured Oct 31; show whatever it says**); Wharton line | "A Wharton study found persuasion took an LLM's compliance from 33% to 72%. Different model, different test, so this is motivation, not a head-to-head. Here's what our gate and classifier caught." (Show the classifier's measured catch/false-alarm on the held-out adversarial set, misses included; the gate row is labeled "0 approvals by construction".) |
| 2:35–2:50 | Engineering proof (Oct 26+ artifacts only): fixture-mode p50/p90, cost per brief, failure-modes table, "N new tests (Oct 26+) passing; 81 pre-existing tests unchanged" | "Capped spend, fallbacks for every model call, and every number here was measured this week." |
| 2:50–3:00 | Logo + "Other tools summarize your meeting. Second Seat shows who is pressuring you, and how." | "Come and build the future of superintelligence, with a human in the final seat." |

**Demo honesty (Round 2):** show only Oct 26+ artifacts on screen (no Oct 15 Spark run, no [00:37] miss in the video, no 81-test total as our work). Never show a hand-written fixture as model output; recorded fixtures come from a logged live call. Say "replay," never "live analysis."

Dependencies, wired into the phases: badge, blocked reply, and payload panel → 04/05; SAM box on the hero slide → 07; resistance table and backup recording → 08; script, video, and clip → 10; drop-in upload → 02.

## 3. Maximizing the 4 criteria (equal weight; confirmed Oct 26)
| Criterion | What we show | Proof point (artifact) |
|---|---|---|
| Impact | A real owner problem (vendor pressure, AI-vs-AI negotiation is coming); a consented Mo'ja vendor meeting as a dev example **only if Bridgett confirms yes by Oct 29 (Day-0 blockers); otherwise delete it from this row**; time saved per meeting = **TARGET**, not claimed | Story + one consented example + a quote from Bridgett |
| Use of Meta AI tooling | Real jobs the product needs: Spark (brief, the ONE tactic/ask/target/span classifier, support judge, slide-text read for #48), SAM 3.1 (slide region on masked screenshots), Glimmer (PII redaction on our server, optional pre-label), Muse Code (build agent, disclosed, not claimed as product use); Wonder and Spark Open cut; all schema-bound with documented settings | README "Meta models used" table filled from logs; prompt hashes; commit notes on which agent did what |
| Technical depth | Deterministic gate the model can't override; span-substring verification; strict JSON schemas; spotlighting; Wilson CIs; sealed day-10 set; fixture mode; **Round 3 accuracy proof (no human reader): truth sealed by hash before generation, seeded-error catch rate, AMI (CC BY 4.0) third-party labels** | Test count, harness N/M per layer, CI no-PII test, eval tables; truth-hash commit before first model run; seeded-error table; AMI slice table with attribution |
| Demo | One flow, one wow (Option A), cold open, under 3:00 | Video, plus a recorded backup, plus a 9:16 clip |

**Wharton comparison (honest):** the baseline is 33.3%→72.0% compliance (GPT-4o-mini, 28,000 conversations, preliminary). Our metric is the classifier's measured catch/false-alarm rate on a **held-out adversarial set** (dev cases #40–#55 are for building; held-out paraphrases are sealed before tuning, see Phase 04), which is a different model and different prompts. Present it as "motivation, not a head-to-head." By construction, shield-on outgoing approvals = 0 because of the deterministic gate, and we say so ("by construction," not "the model is 100%"). The informative numbers are the classifier's per-principle catch and false-alarm rate with CIs. **TARGETS** (not results): per-principle catch ≥80%, false alarm ≤10%. Report the real numbers whatever they are.

## 4. Framing in Meta's words
- "**Build for Your World**": "I solved a problem I know firsthand: vendors pressuring a small-business owner."
- "**Come and build the future of superintelligence**": "As AI agents negotiate with each other, the future needs a human-final seat. Superintelligence that won't say yes for you."
- Startup track: "a real product": fixture-mode load numbers (labeled as such), caps, fallbacks, public repo. Do not say "holds up in production"; there is no deployment.

## 5. Stacked bonuses (amounts confirmed Oct 26)
| Bonus | Our angle | Work (phase) |
|---|---|---|
| Open Weights ($10K) | Glimmer 30B PII-redaction layer on our GPU (Modal/Baseten); Spark Open cut | 04 |
| Agentic ($5K) | Explicit loop diagram naming each tool call, ending in "the owner's decision (Second Seat takes no action)"; the human-approval step is the agent's stop condition | 10 |
| Most Viral ($20K) | 30–60 s 9:16 clip of the mic-drop; **DRAFT X post only, Bridgett posts**; engagement counts through Nov 8 | 10 |
| Community ($10K) | Criteria still unknown. Dataset task CUT for hours (Round 2 #8); revisit only if time remains | — |

## 6. Risks to 1st place and mitigations
| Risk | Mitigation |
|---|---|
| Live model variance during finals | Fixed prompt/seed (best-effort), fixture replay, **recorded backup demo** (Nov 1 1-h slot, Nov 3 final) on two devices (owner: Bridgett) |
| Glimmer hosting not ready (72 GB VRAM) | GGUF Q4 on a 24 GB GPU, or Together-hosted (then the privacy claim changes, so say so), or mock `TODO(glimmer-hosting)` and drop the privacy mic-drop line |
| Overclaiming privacy or "live" | Scope reconciliation in §0; the on-screen "replay" label. **If Glimmer is mocked or hosted by a third party, drop the 2:00 privacy line entirely.** |
| Classifier misses liking/unity | Report as measured; the gate still blocks outgoing; show misses |
| Scope/rules (pre-existing code, banned categories) | Baseline tag, NEW_DURING_HACKATHON.md, public repo; not medical advice, not basic RAG |
| Spend/credits | $5/day per provider cap; fixture CI; Standard mode only for real data |
| Deadline | Cut list in 00-master; hero flow first (Oct 29) |
| Criteria differ from assumed | Confirmed Oct 26 (header); re-check only if the organizers post changes |

## 7. Market proof: the meeting overload everyone recognizes
**Source:** Staples YouTube Short "Stop Making Work Hard" (https://www.youtube.com/shorts/jmXpefVYbQk, Sept 29, 2026; on-screen title "Every Meeting In Corporate America"). In it, a guy in a plaid shirt talks through the meeting chaos. Transcript: `/workspace/commercial/20260929_jmXpefVYbQk.txt`.

**Real lines (verbatim):**
- "This meeting has been **rescheduled seven times**."
- "Right, this is **a meeting to decide when there should be a meeting**."
- "It's already **hard enough to get eight people available at once**."
- "Hey bud, **I'm triple booked**. Can we reschedule?"

**Use: optional 0:08–0:20 setup line (paraphrase only).** The one cold open is the badge (§2 0:00). It sets up the pain in the audience's own words: rescheduled seven times, a meeting about the meeting, eight calendars that never line up, triple booked. Then the turn (spoken in the demo): **"You can't be in every meeting. Hand Second Seat the recording, and it shows you who pushed, and how, before you say yes."**

**VISION / ROADMAP (Bridgett's line; NOT a current capability, never in the demo as something it does today):** *"Be in 1,000 meetings at once."* Today Second Seat does not join or sit in on meetings (live joining is out of scope); it analyzes owner-supplied recordings after the fact. If used anywhere (README roadmap, closing slide), it must carry the label "Vision / roadmap, not built."

**Copyright guardrail:** no Staples footage, audio, or branding in our video. We only reference or paraphrase the ad (for example, "You've seen the ad: rescheduled seven times, triple booked..."), with our own voiceover and visuals. Cite the source in the README/notes, not on screen as a clip.

## 8. Roadmap: government and defense (roadmap only, NOT hackathon build scope; keep OUT of the video and README body, a footnote at most)
**Status today:** Loving Grace Technologies is SAM-active (UEI U5D5QT7QLRQ5, CAGE 222V5). We hold no FedRAMP, CMMC, IL, or NIST attestation, and we claim none.

**Pitch:** a fully on-premises / air-gapped deployment of Second Seat on Meta open weights (Muse Glimmer), so sensitive or classified conversations never touch a third-party cloud. US-based hosting, with encryption at rest and in transit.

**Positioning:** "Built to get there," not certified. Future compliance steps:
- **FedRAMP** (federal cloud authorization) for any hosted offering
- **CMMC** (DoD contractor cybersecurity), aligned with **NIST SP 800-171** controls for CUI
- **DoD Impact Levels IL5 / IL6** for higher-sensitivity and classified workloads

**Before we claim anything:** verify each requirement on official .gov sources (e.g., fedramp.gov, dodcio.defense.gov for CMMC, csrc.nist.gov for SP 800-171, DISA Cloud Computing SRG for IL5/IL6). No invented certifications, timelines, or metrics.


## Round 3 (Oct 26): accuracy without a human reader
Say in README and video (2:15 beat, one line): "Ground truth was sealed by hash before the model ever ran, we planted errors to prove the checker catches them, and we scored against public human labels from the AMI Meeting Corpus." Never call the Glimmer pass "independent" or "accuracy". Projected Technical Depth vs the human-reader plan: about +0.3 (estimate, not measured), conditional on the hashes being committed before the first live run.
