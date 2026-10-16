# Evidence run — Muse Spark brief from the demo transcript
**Date:** October 15, 2026 · **Model:** muse-spark-1.3 (response-reported) · **Endpoint:** api.meta.ai/v1/chat/completions (Meta Model API)
**Purpose:** Pre-submission verification for the Meta Global AI Developer Hackathon application. The application's Q6 proposes an evidence-linked meeting brief; this file proves the core call works today, on the product's own material.

**Input:** Second Seat's built-in demo meeting, verbatim from the repo's demo adapter (second-seat/services/bot/src/adapters/demo.ts), with cumulative timestamps from the script's line timings. Speakers: Maya (host), Jordan, Pat (vendor), Priya; the twin attends for owner Bridget Sander.

```
[00:04] Maya (host): Thanks for joining, everyone. Quick check-in on the Holo Lab pilot.
[00:11] Maya (host): Bridget, where are we on the kiosk launch timeline?
[00:20] Jordan: I'll send the updated hardware budget by Friday.
[00:28] Pat (vendor): Bridget, can you agree to the revised contract terms today so we can lock the price?
[00:37] Priya: Can you share the voice sample checklist with the team?
[00:45] Maya (host): Twin, who is leading the voice pipeline work?
[00:53] Pat (vendor): What does Bridget think about hiring two more engineers in Q1?
[00:59] Maya (host): No rush, let's keep going while we wait on that.
[01:19] Maya (host): We decided to move the design review to next Tuesday.
[01:28] Maya (host): That's everything for today. Thanks, all.
```

**Instructions given to the model (summary):** produce an evidence-linked brief in four sections (Decisions; Action items; Unresolved questions; Requires owner review); every factual entry must end with its supporting transcript timestamp; commitments, contract terms, payments, and hiring decisions are never decided by the twin and belong under "Requires owner review"; do not invent names, dates, figures, or outcomes.

## Output — the model's brief, verbatim

Decisions
- Move the design review to next Tuesday [01:19]

Action items
- Jordan to send the updated hardware budget by Friday [00:20]
- Share the voice sample checklist with the team [00:37]

Unresolved questions
- Where are we on the kiosk launch timeline, asked by Maya to Bridget [00:11]
- Who is leading the voice pipeline work, asked by Maya to Twin [00:45]

Requires owner review
- Pat (vendor) asked Bridget to agree to the revised contract terms today to lock the price [00:28]
- Pat (vendor) asked about hiring two more engineers in Q1 [00:53]

## What this establishes
- The vendor's contract ask at [00:28] was routed to owner review — surfaced, cited, and NOT agreed to — on a live model call, not a script.
- Every entry carries its supporting timestamp; no names, dates, or figures were invented beyond the transcript.
- This is a single transcript-only call (no screenshots), run before the hackathon; the SAM 3.1 screen-evidence half of the proposal was not part of this run.
