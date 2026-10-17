# Second Seat evidence-linked brief: input format

The documented input format for the hackathon build's brief workflow, and for the day-10 evaluation described in the application. The October 15, 2026 Muse Spark experiment (2026-10-15-spark-brief.md, in this folder) used the transcript portion of this format.

## 1. Transcript segments

Plain text, one segment per line:

```
[MM:SS] Speaker Name: what was said
```

- `[MM:SS]` is the segment's offset from the start of the meeting (cumulative, matching the platform recording's clock).
- Speaker names are given as recorded; the owner is identified by name so owner-review routing can be checked.
- A segment is one speaker turn. Requests, decisions, and commitments are NOT pre-labeled: distinguishing them is the system's job.

## 2. Screenshots

- Image files (PNG or JPG) of shared content: slides, documents, whiteboards, screens.
- Each screenshot carries its capture time, in the same meeting clock as the transcript, either in the filename (`frame-00-14.png` = captured at [00:14]) or in a sidecar line in `frames.txt`:

```
frame-00-14.png  [00:14]
```

- Screenshots are owner-supplied or taken from the platform recording. Nothing is captured live by the system.

## 3. What the brief must return

For every entry: its category (decision, action item, unresolved question, requires owner review), the transcript timestamp(s) and/or screenshot frame that support it, and, for action items, the requester and whether acceptance is established in the transcript. Entries whose support is missing or conflicting are flagged, not written up as fact.
