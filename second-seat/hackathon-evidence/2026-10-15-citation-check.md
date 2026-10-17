# Citation check — Oct 15 Muse Spark brief (mechanical)

**Date:** October 15, 2026 · **Checker:** `check_citations.py` (committed beside this file) · **Subject:** `2026-10-15-spark-brief.md`

For every entry in the brief, the checker verifies (1) the cited timestamp exists in the input transcript, and (2) lexical support — the share of the entry's content words appearing in the cited transcript line (speaker included), threshold 0.35.

| Entry | Citation | Support |
| --- | --- | --- |
| Move the design review to next Tuesday | [01:19] | 1.00 |
| Jordan to send the updated hardware budget by Friday | [00:20] | 1.00 |
| Share the voice sample checklist with the team | [00:37] | 1.00 |
| Kiosk launch timeline question (Maya to Bridget) | [00:11] | 0.86 |
| Voice pipeline lead question (Maya to Twin) | [00:45] | 0.88 |
| Revised contract terms ask (Pat) — owner review | [00:28] | 0.91 |
| Hiring two more engineers in Q1 (Pat) — owner review | [00:53] | 0.88 |

**Result: 7/7 entries pass.** Scope note: this is a structural check (the citation exists and its line lexically matches the entry). It does not by itself prove semantic correctness — that is what the day-10 evaluation's held-out set, including missing-evidence and conflicting-source cases with human inspection, is for.

## Review-round notes — Oct 16, 2026

- Lowest support among the seven entries: 0.86 (kiosk launch timeline question, [00:11]).
- The [00:37] entry scores 1.00 and is a known semantic miss: a request recorded as an action item, with the requester and any acceptance dropped. This check cannot catch it. See the review annotation in 2026-10-15-spark-brief.md.
- Negative control, run Oct 16, 2026: swapping the [00:20] and [01:19] citations between the design-review and budget entries drops both entries to 0.00 support, and the run reports 5/7. The checker fails corrupted citations as designed.
