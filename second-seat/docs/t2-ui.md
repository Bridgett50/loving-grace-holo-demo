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

- F2: "Takeover can't recall an email that's already sending." Takeover now
  aborts an in-flight send (the room hands the transport an `AbortSignal`):
  when the transport rejects because of the abort, the send becomes
  `cancelled` — never `failed`, never `sent`, never retried, durable across
  reloads, and not re-approvable. Limit: a send that already completed (or a
  transport that ignores the abort and completes anyway) is truthfully
  reported `sent`; a recall that did not happen is never claimed.
- F3: "A sent package stays exportable until the meeting changes." A sent
  package is now LOCKED immediately: Copy / mailto / Download return nothing,
  Save edit is refused, and Approve is refused for that meeting (no
  re-approval of an already-sent package). The evidence-record JSON export
  stays available — it is the audit record, not the package.
- Related fix: `approve()` is refused while a durable send intent is
  `pending` (shown as `unconfirmed` after reload), `sent`, or `cancelled`,
  so an unconfirmed package can no longer be re-approved and sent twice.
  `failed` stays terminal for sends, as before.

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
  Takeover stays durable even before any approval: the paused flag and
  every takeover event (room-clock timestamp + meeting, per owner) persist
  through the room store, so a reload keeps the twin paused and a later
  approval merges the earlier events into the evidence record in order,
  exactly once.

## What is shown (continued)

- **T11 takeover-cancel + sent lock.** `send()` creates an `AbortController`
  per attempt and passes its signal to the transport (one-arg transports keep
  working by ignoring it). `takeOver()` aborts the owner's in-flight sends.
  An aborted transport lands the send in the new `cancelled` state with the
  durable intent marked `cancelled` and the evidence record saying so; a
  reload keeps `cancelled`, and the send is never retried or re-approved.
  Immediately after a successful send the package locks (`Sent — package
  locked` in the UI; export/edit/approve controls disabled). A slot whose
  body and approved body were rewritten consistently but whose stored hashes
  are stale still loads as not approved.

## What is shown (continued)

- **T12 owner-gated plugins.** A "Plugins" panel lists two synthetic local-only
  plugins (`packages/core/src/t2/plugins.ts`: `action-items`, which extracts
  action items from the selected meeting's scripted transcript/notes, and
  `calendar-followup`, which proposes a follow-up slot as plain text with a
  fixed made-up date/time derived from the meeting — no network, no real
  calendar, no `.ics`). `runPlugins()` produces PROPOSED outputs from the
  selected meeting's context only; they are shown with Include / Exclude
  buttons and are clearly marked excluded until the owner includes them. The
  owner includes with `approvePluginOutput(id)` or excludes with
  `rejectPluginOutput(id)`; only included outputs are appended (redacted like
  the draft) to the package body and covered by its sha256. Including or
  removing an output clears any existing package approval exactly like an
  edit. Plugins cannot run or change anything after takeover or once the
  package is sent/locked/cancelled/unconfirmed. Include/exclude state persists
  through the existing store so a reload keeps it.

## What is shown (continued)

- **T13 guided demo mode (`?demo=1`).** Opening `/meeting-room?demo=1`
  shows a "Guided demo" card above the room: a caption bar
  (`role="status"`, `aria-live="polite"`, labelled per step), a labelled
  "Next step" button (plus Restart), and the shortcut hint (Right arrow /
  `N` = next, `R` = restart; keys typed in inputs are ignored). Without
  `?demo=1` the UI is unchanged. All demo logic lives in core
  (`packages/core/src/t2/demo-mode.ts` — `isDemoMode()`, the ordered
  `DEMO_STEPS` script, `createDemoController()`), so the web UI only
  renders the current caption and forwards button/keypresses. The script
  runs headlessly against a real twin room: join the Q3 launch sync ->
  stream the twin's proactive answer -> owner guidance -> include the
  `action-items` plugin output -> approve the exact package -> send once
  through the test fake transport -> comparison view (imported text
  compared to the approved package) -> evidence record view/export ->
  owner takeover (last, twin paused). Honest note: the flow test
  (`t2-demo-mode.test.ts`) is headless — it drives `next()` step by step
  and asserts the room state, but there is no browser end-to-end test
  because this repo has no DOM test tooling (no Playwright, no
  testing-library, no jsdom) and dependencies are frozen. One subtlety the
  demo documents in code: a sent package locks by design, so the room's
  own `compareImported()` returns null after sending; the demo's
  comparison step therefore rebuilds the approved package from the exact
  sent body and diffs with the same pure comparison the room uses.

## What is shown (continued)

- **T14 review-gap closes.** `createTwinRoom` accepts a test-only `plugins`
  option (defaults to the built-ins, so built-in behaviour is unchanged) so a
  synthetic plugin carrying invented email/phone/amount values proves
  plugin-output masking end to end: the raw proposal is shown, but the
  included section, package body, package hash input, transport body, and
  exported file carry only redaction placeholders. A persisted slot whose
  body and approved body were rewritten together with stale hashes still
  loads as not approved; a slot whose hashes were also recomputed is still
  rejected unless its evidence record pins the same package hash (a forged
  body has no connector approval, so the reload re-bind finds no matching
  evidence and stays unapproved/unsendable). The room exposes a single
  evidence record accessor (`evidenceRecord`) and a single evidence export
  (`exportEvidenceJson`); the unused `getEvidenceRecord` / `exportEvidence`
  aliases were removed. `evidence.ts` and the `t2`/`core` index files had no
  similar duplicate exports.

## What is shown (continued)

- **T15 durable pre-approval takeover + explicit plugin snapshots.** A
  takeover before any approval persists per owner through the room store:
  the paused flag plus one event per meeting (room-clock timestamp +
  meeting title). After a reload the room is still paused — streamed lines
  are refused, plugins propose nothing and cannot be included/excluded/
  refreshed, and sends are refused; nothing is auto-approved or auto-sent.
  The owner can later approve the frozen package, and that approval merges
  the earlier takeover events into the evidence record in order, exactly
  once (reloads never rewrite the events key, so repeated reloads cannot
  duplicate them). An included plugin section is an explicit snapshot: it
  records `snapshotAt` (room clock) and the transcript length it was built
  from, and later streamed lines never rewrite it. The room view exposes
  per plugin whether live output now differs (`stale`) — the UI shows
  "Snapshot from \<time\> — newer lines available" with a labelled Refresh
  button when stale. `refreshPluginOutput(id)` re-snapshots from live
  output, which changes the package and clears approval like an edit; it is
  refused after takeover or once the send state leaves `unsent`.

## What is shown (continued)

- **T16 private owner guidance.** The "Guide the twin" input records private,
  per-meeting guidance with a room-clock timestamp: it is never added to the
  transcript, never shown to participants, and never put in the package body
  unless the owner edits it in themselves. The next proactive twin answer
  streamed for that meeting (the next `Twin:` scripted line) is rendered
  with the pending guidance applied, under a small synthetic rule set
  (`packages/core/src/t2/guidance.ts`): "short"/"brief" trims the answer to
  its first sentence, "defer dates"/"no dates" replaces concrete
  dates/months with "a date Bridgett will confirm", and anything else
  prefixes the answer with "Noted — " unchanged. One guidance steers exactly
  one twin answer; non-twin lines are never altered. Guidance never grants
  authority: "send the email now" or "approve it" only steers transcript
  rendering and never approves, sends, or changes the package. Guidance is
  blocked after takeover (the twin is paused); once a meeting's send state
  leaves `unsent`, guidance is still recorded but cannot change the package.
  Each steering is logged in the evidence record (timestamp, meeting, steered
  line index, guidance text REDACTED with the existing redactor) — events
  from before approval merge into the record on approval — and guidance
  events persist through the room store so a reload keeps each one exactly
  once. The room view exposes `steeredLines` (transcript indexes steered by
  guidance) and the UI marks those twin lines with a private indicator.
  Limit: the seed scripts' twin answers are single sentences, so the
  "short"/"brief" trim is observable in the steered-line marking and the
  evidence event rather than in changed wording.

## What is shown (continued)

- **T18 headless end-to-end demo script.** `runDemoEndToEnd(opts)`
  (`packages/core/src/t2/demo-e2e.ts`) parses a `demo=1` query with the
  same `isDemoMode()` the web page calls on `window.location.search`
  (default `?demo=1`; any other query refuses with `started: false` and
  never touches a room), creates a real twin room (in-memory store,
  injectable clock), and runs every guided step in order through the
  public demo-mode API (`createDemoController` + `next()` — no internal
  shortcuts). It returns the steps completed (ids in order), transcript,
  guidance texts/steered lines/guidance events, package hash, approval/
  send state, transport calls/bodies, the compare result, the takeover
  state, the evidence record plus its JSON export, and per-check
  assertion results. `assertDemoFinalState(state)` returns `{ ok,
  failures[] }`: every step done once in order with takeover last,
  package approved before send (evidence `approvedAt <= sentAt`), final
  `sent` state with exactly one transported body equal to the package,
  hash equality, evidence present with a takeover event last and the
  pinned hash, no un-redacted synthetic sensitive value in the
  transcript/package/evidence JSON, a clean consistent compare result,
  and a paused twin. `second-seat/scripts/demo-e2e.mjs` runs the
  committed `test/t2-demo-e2e.test.ts` headlessly through the core
  package's existing vitest binary (`node
  second-seat/scripts/demo-e2e.mjs`), printing PASS/FAIL and exiting
  non-zero on failure. The narrated version is the "Demo walkthrough"
  section in `second-seat/README.md`.

## T19 hardening review (part 1)

- **Steered lines are recorded steered.** `streamNextLine()` peeks at the
  oldest pending guidance for a twin line, renders the steered text first,
  and records THAT text with the connector — the room transcript and the
  connector log agree, and `room.connectorTranscript()` exposes the
  connector-side log for the selected meeting.
- **Every refusal carries an exported reason.** Stream, stale-line, guide,
  and send refusals return a `reason` that is an exported
  `*REFUSAL`/`*REASON` constant from `twin-room.ts`, worded with "refus-"
  and free of sensitive values and meeting ids. Approve and plugin
  include/refresh refusals keep their existing boolean-only shape
  (existing tests pin it with `toEqual`).
- **Export routes agree with the view.** Once the send state leaves
  `unsent` (sent, failed, cancelled, unconfirmed) the package routes
  (`copyText`, `mailtoHref`, `exportFile`, `compareImported`) return null
  and the view reports all three export routes unavailable, so a control
  the view shows as available never throws `MeetingDenied`.

## Not built / follow-ups

- Real authenticated server-side connector route (needed before any real send;
  `productionDispatch` stays disabled).
- Browser e2e/DOM tests (no DOM test framework in this repo; not added).
  The T13 guided demo is covered by a headless core test instead
  (see above); T18 adds a headless whole-flow runner plus a script, but
  still drives core directly, not a real browser DOM.
- Protection against a store edit that forges the evidence record itself to
  match a forged body (the T14 evidence binding catches stale evidence, not
  fully consistent forgeries).

No real email, conferencing, or model behaviour is claimed anywhere here.
