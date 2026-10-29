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

## What is shown (continued)

- **T9 redaction-evidence saved record.** Package text is redacted before it is
  shown, hashed, or approved: a deterministic synthetic redactor
  (`packages/core/src/t2/redaction.ts`) replaces invented `email` / `phone`
  (`555-01xx`) / `amount` (`$12,000`-style) values with numbered placeholders
  like `[REDACTED:phone:1]`, keeping only per-category count/placeholders/
  positions (offsets in the redacted output) — never the plaintext. One seeded
  meeting ("Q3 launch sync") carries a made-up contact line so redaction is
  exercised; `view().draft.body` is the redacted text that is hashed and
  approved. On approve the room saves an `EvidenceRecord`
  (`packages/core/src/t2/evidence.ts`, in-memory store, injectable `now` clock)
  with meeting id/title, package hash, `approvedAt`, `sentAt` (null until sent),
  `sendState`, the approving owner id, the redaction metadata, and owner
  takeover events (logged before or after approval). A successful send stamps
  `sentAt`/`sendState`. Record writes never alter the package, hash, or
  approval state. The meeting room shows an "Evidence record" card (hash,
  times, principal, redactions with category/count/placeholders, takeover
  events) with an "Export evidence JSON" button that downloads a local `.json`
  file (Blob + object URL, no network); `exportEvidenceJson()` emits stable,
  pretty JSON.

## What is shown (continued)

- **T10 durable send intent + persistence.** The room accepts a synchronous
  key-value `RoomStore` (`packages/core/src/t2/persistence.ts`: in-memory
  store for tests, guarded `localStorage` adapter for the web UI). Per
  owner + meeting it persists the draft body, its sha256, the approval state
  (approved body + hash), the send state, the evidence record, and a DURABLE
  SEND INTENT. `send()` writes
  `{ meetingId, packageHash, status: "pending" }` BEFORE calling the
  transport, then marks it `sent`/`failed` after. A new room on the same
  store (= reload) resumes: unapproved drafts restore unapproved; approved
  unsent packages re-bind connector state internally and send exactly once
  (only if `packageHash(body)` still equals the persisted approved hash); a
  `pending` intent NEVER auto-resends and refuses manual sends with an
  "unconfirmed — check your outbox" state (`draft.sendState` is
  `"unconfirmed"`); `sent`/`failed` stay terminal and never resend.
  Tampered or corrupt data (hash mismatch, bad JSON, hand-edited
  intent/state mixes) fails closed to unapproved/unsendable. The meeting
  room uses the `localStorage` store and shows a "Restored from this
  browser's local storage" note plus the unconfirmed alert when applicable.
  Pre-approval takeover events (pending, no record yet) are not durable
  across reloads.

## Not built / follow-ups

- Real authenticated server-side connector route (needed before any real send;
  `productionDispatch` stays disabled).
- Browser e2e/DOM tests (no DOM test framework in this repo; not added).

No real email, conferencing, or model behaviour is claimed anywhere here.
