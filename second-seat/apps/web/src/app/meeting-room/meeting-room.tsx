"use client";

import { useEffect, useState } from "react";
import {
  MAILTO_LABEL,
  createTwinRoom,
  type EmailComparison,
  type TwinRoom,
} from "@second-seat/core";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export default function MeetingRoom() {
  const [room] = useState<TwinRoom>(() =>
    createTwinRoom({ testMode: true, transport: async () => {} }),
  );
  const [, setTick] = useState(0);
  const [guide, setGuide] = useState("");
  const [sending, setSending] = useState(false);
  const [copied, setCopied] = useState(false);
  const [draftText, setDraftText] = useState(room.view().draft.body);
  const [importText, setImportText] = useState("");
  const [compared, setCompared] = useState<EmailComparison | null | undefined>(undefined);
  const v = room.view();

  useEffect(() => {
    const t = setInterval(() => {
      room.streamNextLine();
      setTick((n) => n + 1);
    }, 1500);
    return () => clearInterval(t);
  }, [room]);

  function refresh() {
    setTick((n) => n + 1);
  }

  async function onSend() {
    setSending(true);
    try {
      await room.send();
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

  const mailto = room.mailtoHref();

  return (
    <div className="space-y-6">
      <Alert>
        <AlertTitle>Demo: invented data, fake transport, no real email.</AlertTitle>
        <AlertDescription>
          Scripted meetings, a test-mode fake owner switch, and an in-browser fake mail transport.
        </AlertDescription>
      </Alert>

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

      <Card>
        <CardHeader>
          <CardTitle>{v.twinIdentity}</CardTitle>
          <CardDescription>
            Owner: {v.ownerName} · Meeting: {v.selectedMeetingTitle} · Twin: {v.twinStatus}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2">
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
          <div className="flex gap-2">
            <Input
              value={guide}
              onChange={(e) => setGuide(e.target.value)}
              placeholder="Guide the twin…"
              aria-label="Guide the twin"
            />
            <Button
              onClick={() => {
                if (guide.trim().length > 0) room.guide(guide);
                setGuide("");
                refresh();
              }}
            >
              Guide
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                room.takeOver();
                refresh();
              }}
            >
              Take over
            </Button>
          </div>
          {v.guidance.length > 0 && (
            <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
              {v.guidance.map((g, i) => (
                <li key={i}>{g}</li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Live transcript</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {v.transcript.length === 0 && (
            <p className="text-sm text-muted-foreground">Waiting for the first scripted line…</p>
          )}
          <ul className="space-y-1">
            {v.transcript.map((line, i) => (
              <li key={i} className="text-sm">
                {line}
              </li>
            ))}
          </ul>
          {v.refusal && (
            <p role="alert" className="text-sm font-medium text-destructive">
              {v.refusal}
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Draft follow-up package</CardTitle>
          <CardDescription>sha256: {v.draft.sha256}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <pre className="whitespace-pre-wrap rounded-md bg-muted p-3 text-sm">{v.draft.body}</pre>
          <p className="text-sm text-muted-foreground">
            Approved: {v.draft.approved ? "yes" : "no"} · Send: {v.draft.sendState}
          </p>
          <Textarea
            key={`${v.ownerId}-${v.selectedMeetingId}`}
            defaultValue={draftText}
            onChange={(e) => setDraftText(e.target.value)}
            aria-label="Edit draft"
          />
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={() => {
                room.editDraft(draftText);
                setCopied(false);
                refresh();
              }}
              variant="outline"
            >
              Save edit
            </Button>
            <Button
              onClick={() => {
                room.approve();
                refresh();
              }}
            >
              Approve
            </Button>
            <Button onClick={onSend} disabled={sending}>
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
          <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
            {v.notes.map((n, i) => (
              <li key={i}>{n}</li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Imported email comparison</CardTitle>
          <CardDescription>
            Synthetic draft import only — paste text or read a local .txt/.eml file. Nothing leaves
            the browser; the import is compared read-only against the selected meeting&apos;s current
            approved package.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Textarea
            value={importText}
            onChange={(e) => setImportText(e.target.value)}
            aria-label="Paste imported draft"
            placeholder={"To: priya@example.test\nCc:\nSubject: Follow-up: Q3 launch sync\nAttachments: notes-q3-launch-sync.txt\n\nHi everyone,\n\n…"}
          />
          <div className="flex flex-wrap items-center gap-2">
            <Input
              type="file"
              accept=".txt,.eml"
              aria-label="Upload local draft file"
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
    </div>
  );
}
