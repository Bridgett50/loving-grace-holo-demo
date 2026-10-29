"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import {
  A11Y_FOCUS_RING,
  A11Y_LABELS,
  MAILTO_LABEL,
  createDemoController,
  createLocalStorageRoomStore,
  createTwinRoom,
  demoStepAnnouncement,
  diffAnnouncements,
  isDemoMode,
  pluginControlLabel,
  type DemoStep,
  type EmailComparison,
  type TwinRoom,
  type TwinRoomView,
} from "@second-seat/core";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

// The demo flag never changes while the page is open, so nothing to subscribe to.
function subscribeToNothing(): () => void {
  return () => {};
}

export default function MeetingRoom({ testMode }: { testMode: boolean }) {
  // testMode comes from the server-side gate in page.tsx (fakeSendAllowed):
  // sends are only enabled for SECOND_SEAT_TEST_MODE=1 on a loopback host.
  const [room] = useState<TwinRoom>(() =>
    createTwinRoom({
      testMode,
      transport: async () => {},
      store: createLocalStorageRoomStore(),
    }),
  );
  const [restored] = useState(() => room.restoredFromStore());
  const [, setTick] = useState(0);
  const [guide, setGuide] = useState("");
  const [sending, setSending] = useState(false);
  const [sendNote, setSendNote] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [draftText, setDraftText] = useState(room.view().draft.body);
  const [importText, setImportText] = useState("");
  const [compared, setCompared] = useState<EmailComparison | null | undefined>(undefined);
  const [announcements, setAnnouncements] = useState<string[]>([]);
  const prevViewRef = useRef<TwinRoomView | null>(null);
  // Read ?demo=1 only on the client: the server snapshot is always false, so
  // the server HTML and the first client render match (no hydration error).
  const demoOn = useSyncExternalStore(
    subscribeToNothing,
    () => isDemoMode(window.location.search),
    () => false,
  );
  const [demoCtrl] = useState(() => createDemoController(room));
  const [demoStep, setDemoStep] = useState<DemoStep | null>(() =>
    demoCtrl.current(),
  );
  const v = room.view();

  useEffect(() => {
    const t = setInterval(() => {
      room.streamNextLine();
      setTick((n) => n + 1);
    }, 1500);
    return () => clearInterval(t);
  }, [room]);

  // Announce every room state change into the polite live region below.
  useEffect(() => {
    const prev = prevViewRef.current;
    prevViewRef.current = v;
    if (prev === null) return;
    const notes = diffAnnouncements(prev, v);
    if (notes.length > 0) {
      setAnnouncements((a) => [...a.slice(-19), ...notes]);
    }
  }, [v]);

  function refresh() {
    setTick((n) => n + 1);
  }

  useEffect(() => {
    if (!demoOn) return;
    function onKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      const typing =
        target !== null &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable);
      void (async () => {
        const acted = await demoCtrl.demoKeyAction(e.key, typing);
        if (acted !== null) {
          setDemoStep(demoCtrl.current());
          setDraftText(room.view().draft.body);
          setCopied(false);
          setCompared(undefined);
          setTick((n) => n + 1);
        }
      })();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [demoOn, demoCtrl, room]);

  async function onDemoNext() {
    const step = await demoCtrl.next();
    if (step !== null) {
      setAnnouncements((a) => [...a.slice(-19), demoStepAnnouncement(step)]);
    }
    setDemoStep(demoCtrl.current());
    setDraftText(room.view().draft.body);
    setCopied(false);
    setCompared(undefined);
    refresh();
  }

  function onDemoRestart() {
    demoCtrl.reset();
    setDemoStep(demoCtrl.current());
    setDraftText(room.view().draft.body);
    setCopied(false);
    setCompared(undefined);
    refresh();
  }

  function onStreamNext() {
    room.streamNextLine();
    refresh();
  }

  async function onSend() {
    setSending(true);
    try {
      const res = await room.send();
      setSendNote(res.ok ? "Sent through the test fake transport." : (res.reason ?? "Send refused."));
    } finally {
      setSending(false);
      refresh();
    }
  }

  async function onCopy() {
    const text = room.copyText();
    if (text === null) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  function onDownload() {
    const file = room.exportFile();
    if (file === null) return;
    const url = URL.createObjectURL(new Blob([file.text], { type: "text/plain" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = file.filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  function onExportEvidence() {
    const json = room.exportEvidenceJson();
    if (json === null) return;
    const url = URL.createObjectURL(new Blob([json], { type: "application/json" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `evidence-${v.selectedMeetingId}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const mailto = room.mailtoHref();
  const evidence = room.evidenceRecord();
  const pluginsLocked = v.twinStatus !== "active" || v.draft.sendState !== "unsent";

  return (
    <div className="mr-room space-y-6">
      <style>{`.mr-room :focus-visible { outline: 3px solid ${A11Y_FOCUS_RING.color}; outline-offset: 2px; }
@media (max-width: 640px) { .mr-room .flex { flex-direction: column; } }`}</style>
      <Alert>
        <AlertTitle>Demo: invented data, fake transport, no real email.</AlertTitle>
        <AlertDescription>
          Scripted meetings, a test-mode fake owner switch, and an in-browser fake mail transport.
        </AlertDescription>
      </Alert>

      <section aria-label="Meeting room announcements">
        <div
          role="status"
          aria-live="polite"
          aria-label="Meeting room announcements"
        >
          {announcements.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No announcements yet. Stream the transcript, guide the twin, or approve the package.
            </p>
          ) : (
            <ul className="space-y-1">
              {announcements.slice(-5).map((a, i) => (
                <li key={i} className="text-sm text-muted-foreground">
                  {a}
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {demoOn && (
        <section aria-labelledby="mr-demo-heading">
          <Card>
            <CardHeader>
              <CardTitle id="mr-demo-heading">Guided demo</CardTitle>
              <CardDescription>
                Synthetic walkthrough of the twin room. Nothing here is real
                data and nothing is really sent.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div
                role="status"
                aria-live="polite"
                aria-label={demoStep ? demoStep.label : "Guided demo complete"}
              >
                <p className="text-sm font-medium">
                  {demoStep
                    ? demoStep.caption
                    : "Demo complete — you took over and the twin is paused."}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  id="demo-next"
                  aria-label={A11Y_LABELS["demo-next"]}
                  onClick={onDemoNext}
                  disabled={demoStep === null}
                >
                  Next step
                </Button>
                <Button
                  id="demo-restart"
                  variant="outline"
                  aria-label={A11Y_LABELS["demo-restart"]}
                  onClick={onDemoRestart}
                >
                  Restart demo
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">
                Shortcuts: Right arrow or N advances one step, R restarts. Keys
                typed in inputs are ignored.
              </p>
            </CardContent>
          </Card>
        </section>
      )}

      <div className="flex flex-wrap gap-2">
        {["bridgett", "dana"].map((id) => (
          <Button
            key={id}
            variant={v.ownerId === id ? "default" : "outline"}
            onClick={() => {
              room.switchOwner(id);
              setDraftText(room.view().draft.body);
              setCopied(false);
              setCompared(undefined);
              refresh();
            }}
          >
            {id === "bridgett" ? "Bridgett Sanders" : "Dana Okafor"}
          </Button>
        ))}
      </div>

      <section aria-labelledby="mr-meeting-heading">
        <Card>
          <CardHeader>
            <CardTitle id="mr-meeting-heading">{v.twinIdentity}</CardTitle>
            <CardDescription>
              Owner: {v.ownerName} · Meeting: {v.selectedMeetingTitle} · Twin: {v.twinStatus}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div
              id="meeting-picker"
              role="listbox"
              aria-label={A11Y_LABELS["meeting-picker"]}
              className="flex flex-wrap gap-2"
            >
              {v.meetings.map((m) => (
                <Button
                  key={m.id}
                  size="sm"
                  variant={m.id === v.selectedMeetingId ? "default" : "outline"}
                  onClick={() => {
                    room.selectMeeting(m.id);
                    setDraftText(room.view().draft.body);
                    setCopied(false);
                    setCompared(undefined);
                    refresh();
                  }}
                >
                  {m.title}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      </section>

      <section aria-labelledby="mr-stream-heading">
        <Card>
          <CardHeader>
            <CardTitle id="mr-stream-heading">Live transcript</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {v.transcript.length === 0 && (
              <p className="text-sm text-muted-foreground">Waiting for the first scripted line…</p>
            )}
            <ul className="space-y-1">
              {v.transcript.map((line, i) => (
                <li key={i} className="text-sm">
                  {line}
                  {v.steeredLines.includes(i) && (
                    <span className="ml-2 font-medium">· steered by your guidance (private)</span>
                  )}
                </li>
              ))}
            </ul>
            {v.refusal && (
              <p role="alert" className="text-sm font-medium text-destructive">
                {v.refusal}
              </p>
            )}
            <Button
              id="stream-next"
              variant="outline"
              size="sm"
              aria-label={A11Y_LABELS["stream-next"]}
              onClick={onStreamNext}
            >
              Stream next line
            </Button>
          </CardContent>
        </Card>
      </section>

      <section aria-labelledby="mr-guidance-heading">
        <Card>
          <CardHeader>
            <CardTitle id="mr-guidance-heading">Guide the twin</CardTitle>
            <CardDescription>
              Private guidance for the twin. It stays private to the owner.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-2">
              <Input
                id="guidance-input"
                value={guide}
                onChange={(e) => setGuide(e.target.value)}
                placeholder="Guide the twin…"
                aria-label={A11Y_LABELS["guidance-input"]}
              />
              <Button
                id="guidance-send"
                aria-label={A11Y_LABELS["guidance-send"]}
                onClick={() => {
                  if (guide.trim().length > 0) room.guide(guide);
                  setGuide("");
                  refresh();
                }}
              >
                Guide
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              Guidance is private to the owner — never shown to participants,
              never added to the transcript, and never put in the package.
            </p>
            {v.guidance.length > 0 && (
              <div className="space-y-1">
                <p className="text-sm font-medium">Private guidance (only you see this)</p>
                <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                  {v.guidance.map((g, i) => (
                    <li key={i}>{g}</li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      <section aria-labelledby="mr-takeover-heading">
        <Card>
          <CardHeader>
            <CardTitle id="mr-takeover-heading">Take over</CardTitle>
            <CardDescription>
              Pause the twin and take over the meeting yourself.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              id="takeover"
              variant="destructive"
              aria-label={A11Y_LABELS.takeover}
              onClick={() => {
                room.takeOver();
                refresh();
              }}
            >
              Take over
            </Button>
          </CardContent>
        </Card>
      </section>

      <section aria-labelledby="mr-package-heading">
        <Card>
          <CardHeader>
            <CardTitle id="mr-package-heading">Draft follow-up package</CardTitle>
            <CardDescription>sha256: {v.draft.sha256}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {restored && (
              <p className="text-sm text-muted-foreground">
                Restored from this browser&apos;s local storage (draft and send state survive reloads; approval
                never does).
              </p>
            )}
            {room.approvalNote() !== null && (
              <p className="text-sm font-medium">{room.approvalNote()}</p>
            )}
            {v.draft.sendState === "unconfirmed" && (
              <p role="alert" className="text-sm font-medium text-destructive">
                Send unconfirmed — check your outbox before retrying. A send was attempted before the last
                reload but its result was never seen, so this app will not resend automatically.
              </p>
            )}
            <pre className="whitespace-pre-wrap rounded-md bg-muted p-3 text-sm">{v.draft.body}</pre>
            {v.draft.sendState === "sent" && (
              <p className="text-sm font-medium">Sent — package locked. Export, edit, and re-approve are disabled; the evidence record below stays available.</p>
            )}
            {v.draft.sendState === "cancelled" && (
              <p className="text-sm font-medium text-destructive">
                Send cancelled by takeover before the transport finished. It will not be retried.
              </p>
            )}
            <Textarea
              id="package-editor"
              key={`${v.ownerId}-${v.selectedMeetingId}`}
              defaultValue={draftText}
              onChange={(e) => setDraftText(e.target.value)}
              aria-label={A11Y_LABELS["package-editor"]}
            />
            <div className="flex flex-wrap gap-2">
              <Button
                id="package-save"
                onClick={() => {
                  room.editDraft(draftText);
                  setCopied(false);
                  refresh();
                }}
                variant="outline"
                aria-label={A11Y_LABELS["package-save"]}
                disabled={v.draft.sendState === "sent"}
              >
                Save edit
              </Button>
            </div>
            <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
              {v.notes.map((n, i) => (
                <li key={i}>{n}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </section>

      <section aria-labelledby="mr-plugins-heading">
        <Card>
          <CardHeader>
            <CardTitle id="mr-plugins-heading">Plugins</CardTitle>
            <CardDescription>
              Synthetic local-only helpers. Proposed outputs are excluded from the package
              until the owner includes them.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {pluginsLocked && (
              <p className="text-sm text-muted-foreground">
                Plugins cannot run after takeover or once the package is sent, locked,
                cancelled, or unconfirmed.
              </p>
            )}
            {v.plugins.map((p) => (
              <div key={p.id} className="space-y-2 rounded-md border p-3">
                <p className="text-sm font-medium">{p.label}</p>
                <p className="text-sm text-muted-foreground">
                  {p.status === "approved"
                    ? "Included in the package."
                    : p.status === "rejected"
                      ? "Excluded by the owner."
                      : "Proposed — excluded from the package until the owner includes it."}
                </p>
                {p.lines.length > 0 && (
                  <pre className="whitespace-pre-wrap rounded-md bg-muted p-3 text-sm">
                    {p.title}
                    {"\n"}
                    {p.lines.join("\n")}
                  </pre>
                )}
                {p.status === "approved" && p.snapshotAt !== null && (
                  <p className="text-sm text-muted-foreground">
                    Snapshot from {new Date(p.snapshotAt).toISOString()}
                    {p.stale ? " — newer lines available" : ""}
                  </p>
                )}
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    aria-label={pluginControlLabel("include", p.id)}
                    disabled={pluginsLocked}
                    onClick={() => {
                      room.approvePluginOutput(p.id);
                      setDraftText(room.view().draft.body);
                      refresh();
                    }}
                  >
                    Include
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    aria-label={pluginControlLabel("exclude", p.id)}
                    disabled={pluginsLocked}
                    onClick={() => {
                      room.rejectPluginOutput(p.id);
                      setDraftText(room.view().draft.body);
                      refresh();
                    }}
                  >
                    Exclude
                  </Button>
                  {p.status === "approved" && p.stale && (
                    <Button
                      size="sm"
                      variant="outline"
                      aria-label={pluginControlLabel("refresh", p.id)}
                      disabled={pluginsLocked}
                      onClick={() => {
                        room.refreshPluginOutput(p.id);
                        setDraftText(room.view().draft.body);
                        refresh();
                      }}
                    >
                      Refresh
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>

      <section aria-labelledby="mr-approval-heading">
        <Card>
          <CardHeader>
            <CardTitle id="mr-approval-heading">Approve and send</CardTitle>
            <CardDescription>
              Approved: {v.draft.approved ? "yes" : "no"} · Send: {v.draft.sendState}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {sendNote !== null && <p className="text-sm text-muted-foreground">{sendNote}</p>}
            <div className="flex flex-wrap gap-2">
              <Button
                id="approve"
                onClick={() => {
                  room.approve();
                  refresh();
                }}
                aria-label={A11Y_LABELS.approve}
                disabled={
                  v.draft.sendState === "sent" ||
                  v.draft.sendState === "cancelled" ||
                  v.draft.sendState === "unconfirmed"
                }
              >
                Approve
              </Button>
              <Button id="send" onClick={onSend} aria-label={A11Y_LABELS.send} disabled={sending}>
                Send (test fake transport)
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button onClick={onCopy} variant="outline" disabled={!v.exportInventory.copy}>
                {copied ? "Copied" : "Copy"}
              </Button>
              {mailto && v.exportInventory.mailto ? (
                <Button asChild variant="outline">
                  <a href={mailto}>{MAILTO_LABEL}</a>
                </Button>
              ) : (
                <Button variant="outline" disabled>
                  {MAILTO_LABEL}
                </Button>
              )}
              <Button onClick={onDownload} variant="outline" disabled={!v.exportInventory.file}>
                Download .txt
              </Button>
            </div>
          </CardContent>
        </Card>
      </section>

      <section aria-labelledby="mr-compare-heading">
        <Card>
          <CardHeader>
            <CardTitle id="mr-compare-heading">Imported email comparison</CardTitle>
            <CardDescription>
              Synthetic draft import only — paste text or read a local .txt/.eml file. Nothing leaves
              the browser; the import is compared read-only against the selected meeting&apos;s current
              approved package.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Textarea
              id="compare-input"
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
              aria-label={A11Y_LABELS["compare-input"]}
              placeholder={"To: priya@example.test\nCc:\nSubject: Follow-up: Q3 launch sync\nAttachments: notes-q3-launch-sync.txt\n\nHi everyone,\n\n…"}
            />
            <div className="flex flex-wrap items-center gap-2">
              <Input
                id="compare-file"
                type="file"
                accept=".txt,.eml"
                aria-label={A11Y_LABELS["compare-file"]}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const reader = new FileReader();
                  reader.onload = () => {
                    if (typeof reader.result === "string") setImportText(reader.result);
                  };
                  reader.readAsText(file);
                }}
              />
              <Button
                id="compare-run"
                aria-label={A11Y_LABELS["compare-run"]}
                onClick={() => {
                  setCompared(room.compareImported(importText));
                }}
              >
                Compare
              </Button>
            </div>
            {compared === null && (
              <p className="text-sm text-muted-foreground">
                No approved package for the selected meeting yet. Approve the draft first, then
                compare.
              </p>
            )}
            {compared && (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-muted-foreground">
                    <th className="py-1 pr-2 font-medium">Field</th>
                    <th className="py-1 pr-2 font-medium">Status</th>
                    <th className="py-1 font-medium">Detail</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-t">
                    <td className="py-1 pr-2">Recipients</td>
                    <td className="py-1 pr-2">
                      {compared.recipients.equal ? "match" : "MISMATCH"}
                    </td>
                    <td className="py-1">
                      {compared.recipients.equal
                        ? compared.recipients.expected.join(", ")
                        : `missing: ${compared.recipients.missing.join(", ") || "—"} · extra: ${compared.recipients.extra.join(", ") || "—"}`}
                    </td>
                  </tr>
                  <tr className="border-t">
                    <td className="py-1 pr-2">Subject</td>
                    <td className="py-1 pr-2">{compared.subject.equal ? "match" : "MISMATCH"}</td>
                    <td className="py-1">
                      {compared.subject.equal
                        ? compared.subject.expected
                        : `approved: ${compared.subject.expected} · imported: ${compared.subject.actual || "—"}`}
                    </td>
                  </tr>
                  <tr className="border-t">
                    <td className="py-1 pr-2">Body diff</td>
                    <td className="py-1 pr-2">{compared.body.equal ? "match" : "MISMATCH"}</td>
                    <td className="py-1">
                      {compared.body.equal ? (
                        "identical"
                      ) : (
                        <>
                          {compared.body.removed.map((line, i) => (
                            <div key={`r-${i}`}>− {line}</div>
                          ))}
                          {compared.body.added.map((line, i) => (
                            <div key={`a-${i}`}>+ {line}</div>
                          ))}
                        </>
                      )}
                    </td>
                  </tr>
                  <tr className="border-t">
                    <td className="py-1 pr-2">Attachments</td>
                    <td className="py-1 pr-2">
                      {compared.attachments.equal ? "match" : "MISMATCH"}
                    </td>
                    <td className="py-1">
                      {compared.attachments.equal
                        ? compared.attachments.expected.join(", ")
                        : `missing: ${compared.attachments.missing.join(", ") || "—"} · extra: ${compared.attachments.extra.join(", ") || "—"}`}
                    </td>
                  </tr>
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>
      </section>

      <section aria-labelledby="mr-evidence-heading">
        <Card>
          <CardHeader>
            <CardTitle id="mr-evidence-heading">Evidence record</CardTitle>
            <CardDescription>
              Local saved record for the selected meeting&apos;s approved package. Synthetic data
              only; nothing leaves the browser.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {evidence === null && (
              <p className="text-sm text-muted-foreground">
                No evidence record for this meeting yet. Approve the package first.
              </p>
            )}
            {evidence !== null && (
              <>
                <dl className="space-y-1 text-sm">
                  <div className="flex gap-2">
                    <dt className="font-medium">Package hash:</dt>
                    <dd className="break-all">{evidence.packageHash}</dd>
                  </div>
                  <div className="flex gap-2">
                    <dt className="font-medium">Approved at:</dt>
                    <dd>{new Date(evidence.approvedAt).toISOString()}</dd>
                  </div>
                  <div className="flex gap-2">
                    <dt className="font-medium">Sent at:</dt>
                    <dd>
                      {evidence.sentAt === null
                        ? "not sent yet"
                        : new Date(evidence.sentAt).toISOString()}
                    </dd>
                  </div>
                  <div className="flex gap-2">
                    <dt className="font-medium">Send state:</dt>
                    <dd>{evidence.sendState}</dd>
                  </div>
                  <div className="flex gap-2">
                    <dt className="font-medium">Approved by:</dt>
                    <dd>{evidence.approvalPrincipal}</dd>
                  </div>
                </dl>
                <div>
                  <p className="text-sm font-medium">Redactions</p>
                  <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                    {evidence.redactions.map((r) => (
                      <li key={r.category}>
                        {r.category}: count {r.count} · {r.placeholders.join(", ") || "—"}
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="text-sm font-medium">Takeover events</p>
                  {evidence.takeoverEvents.length === 0 ? (
                    <p className="text-sm text-muted-foreground">None.</p>
                  ) : (
                    <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                      {evidence.takeoverEvents.map((e, i) => (
                        <li key={i}>
                          {e.kind} at {new Date(e.at).toISOString()}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <Button
                  id="evidence-export"
                  onClick={onExportEvidence}
                  variant="outline"
                  aria-label={A11Y_LABELS["evidence-export"]}
                >
                  Export evidence JSON
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
