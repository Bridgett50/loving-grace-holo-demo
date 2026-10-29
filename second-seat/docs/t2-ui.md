# T2 UI: meeting room (approve, send, takeover)

The `/meeting-room` page (linked from **Sessions**) makes the T2 meeting-to-email flow visible. It runs entirely in the browser with invented meetings. Nothing is saved, nothing is emailed, and no model is called.

## What's on screen

| T2 item | What you see |
|---|---|
| T2-1 Twin panel | Your own twin (the signed-in owner's display name and avatar on the existing `TwinStage`), labeled as an AI twin. **Guide** sends guidance to the twin. **Take over** calls `takeover`: the twin shows as paused, the stage greys out, and an unsent package shows as **Invalidated**. An owner switcher with an invented second owner (Jordan Reyes) shows that each owner sees only their own meetings, transcript, guidance and packages. |
| T2-2 Scoped context | "What your twin can see" shows only the current owner's prep notes, transcript lines and guidance for the selected meeting, all read through the connector with that owner's principal. |
| T2-3 Live transcript | **Play meeting** streams scripted lines through `appendTranscript`, one every 1.4 s. There is no paste box and no Ask button. After takeover, new lines are refused with the reason shown. |
| T2-4 Exact-package approval | The twin delivers a draft package (`To`, `Subject`, body) and its sha256 is shown. **Approve exact package** calls `approvePackage` with that hash. Editing and saving creates a new package with a new hash and shows "Approval cleared". **Send (fake transport)** sends once. A second Send is refused, and a simulated failure shows "Send failed" and is never retried. |
| T2-4 Export | Only the exact approved package can be exported: **Copy**, **Open in your mail app** (a `mailto:` link that opens the viewer's own mail app and never sends) and **Download .txt**. |

## What's faked

- **The connector is a mirror.** `packages/core/src/t2/connector.ts` is a copy of `second-seat-hackathon` `services/bot/src/meeting/connector.ts` at main `ea11592`, with only `node:crypto` swapped for browser-safe `sha256Hex`/`randomId`. The connector's own 42 tests run unchanged against the mirror (`packages/core/test/t2-connector-mirror.test.ts`).
- **Adapter-only read.** `jobStatus(principal, jobId)` exists only in the mirror, so the UI can show "Invalidated" or "Send failed" honestly. It is read-only and owner-scoped.
- **The transport is fake.** It records the package hash in an on-screen outbox. It appears only when `SECOND_SEAT_TEST_MODE=1` and both `Host` and any `X-Forwarded-Host` are loopback (`fakeSendAllowed`). Otherwise Send stays off with an explanation. `productionDispatch` is never called.
- **The meetings, lines and drafts are scripted.** The twin's answers don't change with guidance. Guidance is recorded and shown in the twin's context only.
- **State is per page load.** Reloading resets the room.

## Known behaviour to show honestly

- **F2:** "Takeover can't recall an email that's already sending." This is shown under Take over and covered by a test.
- **F3:** "A sent package stays exportable until the meeting changes." This is shown on the export card.

## Follow-ups

Backend changes in second-seat-hackathon, none of them made here:
1. Add `jobStatus(principal, jobId)` (read-only, owner-scoped) to the real connector.
2. Add a guidance event on the session. Guidance is UI-only state today.
3. Add a way to withdraw approval of an older package when the owner edits. Today the old job stays approved, unsent and exportable by job ID. The UI only tracks the newest one.
4. Serve the connector behind an authenticated route, so the UI can call the real one instead of the in-browser mirror. Persist state, and add durable send intent (T9).

UI follow-ups:
5. **Imported-email comparison** (draft side by side with the imported thread). It doesn't exist in this repo or in the connector yet, so it was not invented here.
6. Saved meeting record with redaction evidence.
7. Component and browser (e2e) tests. The web app has no component or e2e test framework yet. The page's logic lives in `packages/core/src/t2/twin-room.ts` and is covered by Vitest there, and the page was checked by hand in a browser.
