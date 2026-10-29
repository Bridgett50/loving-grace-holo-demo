# T2 UI — twin meeting room

Second Seat's twin meeting room (`/meeting-room`): Bridgett Sanders watches her
twin answer from her permitted notes, sends owner guidance, takes over, and
approves an exact follow-up package. All data is invented; nothing is real.

## What is shown

- **T2-1 room view.** Owner switcher (Bridgett Sanders / Dana Okafor), twin
  identity ("Bridgett's twin" / "Dana's twin"), meeting identity (selected
  title), live transcript, twin status (`active` | `paused (you took over)`),
  guidance list, Guide and Take over controls, the draft package with its
  sha256, approval/send state, and the export inventory.
- **T2-2 reasoning context.** `{ system, ownerNotes, meeting, transcript,
  guidance }` with only the active owner's permitted notes and only the
  selected meeting's transcript. `system` is a fixed authority-policy string;
  transcript lines are placed only in the `transcript` field and can never
  replace or override it.
- **T2-3 live transcript.** A timer streams the next scripted line through the
  connector's `appendTranscript` — there is no paste box and no Ask button.
  After `Take over`, new lines are refused with a visible reason ("Line
  refused: you took over; the twin is paused."). A stale line naming another
  meeting cannot append to the current transcript.
- **T2-4 exact-package approve/send/export.** The twin drafts a deterministic
  follow-up body; the view shows `sha256 = packageHash(body)`. Approve binds
  the approval to the sha256 of the shown body (a job is issued and its
  callback resolved with the body first). Editing the draft visibly clears
  approval and invalidates the connector approval via a source edit. Send runs
  only in test mode through the fake transport exactly once; a rejecting
  transport shows `failed` and is never resent. Copy, `Open in your mail app`
  (mailto), and Download .txt exit only the exact approved, current package;
  unapproved or stale/edited drafts get nothing.

## Always-visible notes

- F2: "Takeover can't recall an email that's already sending."
- F3: "A sent package stays exportable until the meeting changes."

## What is faked

- The email transport is an in-browser test fake that only records the body;
  `Send` is labelled "Send (test fake transport)" and is disabled outside test
  mode.
- Meetings, participants, twin answers, notes, and follow-ups are scripted,
  invented data.
- The owner switch is a test-mode fake principal, not production auth.
- `packages/core/src/t2/connector.ts` is an in-browser mirror of the
  second-seat-hackathon connector @ ea11592 (same names, signatures, and guard
  logic; `node:crypto` replaced with pure-TS SHA-256 and local ids).

## What is shown (continued)

- **T8 imported-email comparison.** An "Imported email comparison" card lets the
  owner paste a synthetic existing draft or read a local `.txt`/`.eml` file
  (FileReader, labelled synthetic/local — nothing leaves the browser) and press
  Compare. The room's `compareImported(text)` compares read-only against the
  selected meeting's CURRENT APPROVED package (null / "no approved package"
  before approval or after an edit clears it) and renders a field-by-field table
  — Recipients (missing/extra), Subject (match or not), Body diff (added/removed
  lines), Attachments (missing/extra) — with a MISMATCH flag per differing
  field. An identical draft shows no flags. The comparison never mutates the
  draft, approval, job, or package hash. Recipients/attachments are derived
  deterministically from synthetic meeting data (scripted `Name:` speakers as
  `<name>@example.test`, `notes-<slug>.txt` attachment).

## Not built / follow-ups

- Redaction-evidence saved record.
- Real authenticated server-side connector route (needed before any real send;
  `productionDispatch` stays disabled).
- Browser e2e/DOM tests (no DOM test framework in this repo; not added).

No real email, conferencing, or model behaviour is claimed anywhere here.
