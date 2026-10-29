"use client";

import { useEffect, useState } from "react";
import { Ban, Check, Copy, Download, Hand, Mail, Pause, Play, Send, ShieldCheck, UserRound } from "lucide-react";
import { t2, type TwinLook } from "@second-seat/core";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { TwinStage } from "@/components/twin-avatar";
import { cn } from "@/lib/utils";

const STATUS_LABEL: Record<t2.PackageStatus, string> = {
  none: "No package yet",
  pending: "Waiting for the twin",
  delivered: "Delivered for review",
  invalidated: "Invalidated",
  failed: "Send failed",
};

/** The fake transport: records the exact package in an on-screen outbox. Nothing leaves the browser. */
function fakeTransport(outbox: string[], fail: boolean) {
  return async (pkg: { jobId: string; packageHash: string; body: string }) => {
    await new Promise((done) => setTimeout(done, 600));
    if (fail) throw new Error("Fake transport failure (simulated)");
    outbox.push(pkg.packageHash);
  };
}

export function MeetingRoom(props: {
  fakeSend: boolean;
  ownerName: string;
  look: TwinLook;
  imageSrc?: string;
  backgroundCss: string;
  badge: string;
}) {
  const { fakeSend } = props;
  // Owner A is your own twin; the meetings and the second owner are invented.
  // One in-memory room per page load. Nothing is saved.
  const [roster] = useState(() => t2.rosterFor(props.ownerName));
  const [room] = useState(() => t2.createTwinRoom({ scripts: roster.scripts }));
  const [ownerIdx, setOwnerIdx] = useState(0);
  const [meetingIdx, setMeetingIdx] = useState(0);
  const [, setTick] = useState(0);
  const refresh = () => setTick((n) => n + 1);

  const owner = roster.owners[ownerIdx];
  const isYou = ownerIdx === 0;
  const me = { ownerId: owner.ownerId };
  const meetings = room.meetings(me);
  const meeting = meetings[Math.min(meetingIdx, meetings.length - 1)];
  const meetingId = meeting?.meetingId ?? "";

  const [playing, setPlaying] = useState(false);
  const [refusal, setRefusal] = useState<string | null>(null);
  const [guidance, setGuidance] = useState("");
  const [draft, setDraft] = useState<string | null>(null);
  const [failNext, setFailNext] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [outbox] = useState<string[]>([]);
  const [approvalCleared, setApprovalCleared] = useState(false);

  const transcript = room.transcript(me, meetingId);
  const takenOver = room.isTakenOver(me, meetingId);
  const pkg = room.packageView(me, meetingId);
  const exported = room.exportApproved(me, meetingId);
  const context = room.reasoningContext(me, meetingId);
  const linesLeft = room.linesLeft(me, meetingId);

  function select(nextOwner: number, nextMeeting: number) {
    setOwnerIdx(nextOwner);
    setMeetingIdx(nextMeeting);
    setPlaying(false);
    setRefusal(null);
    setDraft(null);
    setSendError(null);
    setApprovalCleared(false);
    setFailNext(false);
  }

  function step() {
    if (linesLeft === 0) {
      // The scripted meeting simply ended; that is not a refusal.
      setPlaying(false);
      return;
    }
    const res = room.nextLine(me, meetingId);
    if (!res.appended) {
      setPlaying(false);
      setRefusal(res.reason ?? "Refused.");
    }
    refresh();
  }

  useEffect(() => {
    if (!playing) return;
    const timer = setInterval(step, 1400);
    return () => clearInterval(timer);
  });

  function takeOver() {
    const { invalidatedJobs } = room.takeover(me, meetingId);
    setPlaying(false);
    toast.warning(`You took over. The twin is paused${invalidatedJobs ? " and the unsent package was invalidated" : ""}.`);
    refresh();
  }

  function sendGuidance() {
    const res = room.guide(me, meetingId, guidance);
    if (res.accepted) {
      setGuidance("");
      toast.success("Guidance sent to your twin");
    } else toast.error(res.reason ?? "Guidance refused");
    refresh();
  }

  function deliver(text: string) {
    const wasApproved = pkg?.approved ?? false;
    const v = room.deliverPackage(me, meetingId, text);
    if (!v) toast.error("The connector refused this package.");
    setApprovalCleared(wasApproved && !!v && !v.approved);
    setDraft(null);
    setSendError(null);
    refresh();
  }

  async function send() {
    setSending(true);
    setSendError(null);
    const res = await room.send(me, meetingId, fakeTransport(outbox, failNext));
    setSending(false);
    if (res.error) setSendError(res.error);
    else if (!res.ran) toast.error("Not sent: only an approved, unsent package can be sent, once.");
    else toast.success("Sent once through the fake transport");
    refresh();
  }

  function download(text: string) {
    const url = URL.createObjectURL(new Blob([text], { type: "text/plain;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `${meeting?.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-approved-package.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const editing = draft !== null;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Meeting room</h1>
          <p className="text-muted-foreground">
            Your twin answers in the meeting, you can guide it or take over, and only the exact package you approve can be sent.
          </p>
        </div>
        <Badge variant="outline">Offline preview · invented meetings · nothing is saved or emailed</Badge>
      </div>

      <Card>
        <CardContent className="flex flex-wrap items-center gap-3 pt-6">
          <span className="text-sm font-medium">Signed in as</span>
          {roster.owners.map((o, i) => (
            <Button key={o.ownerId} variant={i === ownerIdx ? "default" : "outline"} size="sm" onClick={() => select(i, 0)} aria-pressed={i === ownerIdx}>
              <UserRound /> {o.displayName}
              {i === 0 ? " (you)" : " (invented second owner)"}
            </Button>
          ))}
          <span className="mx-2 hidden h-6 w-px bg-border sm:block" />
          <span className="text-sm font-medium">Meeting</span>
          {meetings.map((m, i) => (
            <Button key={m.meetingId} variant={m.meetingId === meetingId ? "secondary" : "ghost"} size="sm" onClick={() => select(ownerIdx, i)} aria-pressed={m.meetingId === meetingId}>
              {m.title}
            </Button>
          ))}
          <span className="w-full text-xs text-muted-foreground">
            {owner.displayName} sees {meetings.length} meeting{meetings.length === 1 ? "" : "s"}. Everything below is read through the connector as {owner.displayName}, so the other owner&apos;s meetings, transcript and packages never load.
          </span>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-2">
                <CardTitle className="flex items-center gap-2">
                  <span className="flex size-9 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">{owner.displayName[0]}</span>
                  {owner.twinName}
                </CardTitle>
                <Badge variant={takenOver ? "destructive" : "secondary"}>{takenOver ? "Paused: you took over" : "Live in meeting"}</Badge>
              </div>
              <CardDescription>
                Acting for {owner.displayName} in &ldquo;{meeting?.title}&rdquo;. Always disclosed as an AI twin.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {isYou && (
                <TwinStage
                  look={props.look}
                  imageSrc={props.imageSrc}
                  backgroundCss={props.backgroundCss}
                  badge={takenOver ? `${owner.displayName.split(" ")[0]} (live) · twin paused` : props.badge}
                  recording={!takenOver}
                  className={cn(takenOver && "opacity-60 grayscale-[40%]")}
                />
              )}
              <form
                className="flex gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  sendGuidance();
                }}
              >
                <Input value={guidance} onChange={(e) => setGuidance(e.target.value)} placeholder="Guide your twin, e.g. keep the April date firm" aria-label="Guidance for your twin" disabled={takenOver} />
                <Button type="submit" variant="outline" disabled={takenOver || !guidance.trim()}>
                  Guide
                </Button>
              </form>
              {room.guidance(me, meetingId).map((g, i) => (
                <p key={i} className="rounded-md bg-muted px-3 py-1.5 text-sm">
                  Guidance: {g}
                </p>
              ))}
              <Button variant="destructive" onClick={takeOver} disabled={takenOver} className="w-full">
                <Hand /> Take over
              </Button>
              <p className="text-xs text-muted-foreground">{t2.F2_NOTE}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-2">
                <CardTitle>Live transcript</CardTitle>
                <Button size="sm" variant="outline" onClick={() => (playing ? setPlaying(false) : (setRefusal(null), setPlaying(true)))} disabled={linesLeft === 0 && !playing}>
                  {playing ? <Pause /> : <Play />} {playing ? "Pause" : linesLeft === 0 ? "Meeting ended" : "Play meeting"}
                </Button>
              </div>
              <CardDescription>Lines arrive from a scripted, invented meeting through the connector&apos;s transcript append.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {transcript.length === 0 && <p className="text-sm text-muted-foreground">No lines yet. Press Play meeting.</p>}
              <ol className="space-y-2" aria-live="polite">
                {transcript.map((line, i) => {
                  const twin = line.startsWith(owner.twinName);
                  return (
                    <li key={i} className={cn("rounded-md px-3 py-2 text-sm", twin ? "bg-primary/10" : "bg-muted")}>
                      {line}
                    </li>
                  );
                })}
              </ol>
              {refusal && (
                <Alert variant="destructive">
                  <Ban />
                  <AlertTitle>Line refused</AlertTitle>
                  <AlertDescription>{refusal}</AlertDescription>
                </Alert>
              )}
              {takenOver && !refusal && linesLeft > 0 && (
                <Button size="sm" variant="ghost" onClick={step}>
                  Try the next line
                </Button>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>What your twin can see</CardTitle>
              <CardDescription>Only {owner.displayName}&apos;s prep notes, transcript and guidance for this one meeting.</CardDescription>
            </CardHeader>
            <CardContent>
              <pre className="max-h-56 overflow-auto whitespace-pre-wrap rounded-md bg-muted p-3 text-xs" data-testid="reasoning-context">
                {context}
              </pre>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-2">
                <CardTitle>Email package</CardTitle>
                <div className="flex gap-1.5">
                  {pkg && <Badge variant={pkg.status === "failed" || pkg.status === "invalidated" ? "destructive" : "outline"}>{STATUS_LABEL[pkg.status]}</Badge>}
                  {pkg?.approved && <Badge>Approved</Badge>}
                  {pkg?.sent && <Badge variant="secondary">Sent once</Badge>}
                </div>
              </div>
              <CardDescription>You approve the exact text. Its sha256 is checked again at send.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {!pkg && (
                <Button onClick={() => deliver(room.draftText(me, meetingId) ?? "")} disabled={takenOver}>
                  <Mail /> Twin delivers the draft
                </Button>
              )}
              {pkg && (
                <>
                  <Textarea
                    value={editing ? draft : pkg.text}
                    onChange={(e) => setDraft(e.target.value)}
                    rows={10}
                    className="font-mono text-xs"
                    aria-label="Email package"
                    readOnly={pkg.status !== "delivered" || pkg.sent}
                  />
                  <p className="break-all font-mono text-xs" data-testid="package-hash">
                    sha256 {pkg.hash}
                  </p>
                  {approvalCleared && (
                    <Alert>
                      <AlertTitle>Approval cleared</AlertTitle>
                      <AlertDescription>You edited the package, so it has a new hash and needs approval again.</AlertDescription>
                    </Alert>
                  )}
                  <div className="flex flex-wrap gap-2">
                    {editing && draft !== pkg.text && (
                      <Button variant="outline" onClick={() => deliver(draft)}>
                        Save edit
                      </Button>
                    )}
                    <Button onClick={() => (room.approve(me, meetingId).approved ? (setApprovalCleared(false), toast.success("Approved this exact package")) : toast.error("Approval refused"), refresh())} disabled={editing || pkg.approved || pkg.status !== "delivered"}>
                      <Check /> Approve exact package
                    </Button>
                    <Button variant="secondary" onClick={send} disabled={!fakeSend || sending || !pkg.approved || pkg.sent}>
                      <Send /> {sending ? "Sending…" : "Send (fake transport)"}
                    </Button>
                  </div>
                  {fakeSend ? (
                    <label className="flex items-center gap-2 text-xs text-muted-foreground">
                      <input type="checkbox" checked={failNext} onChange={(e) => setFailNext(e.target.checked)} /> Make the fake transport fail
                    </label>
                  ) : (
                    <p className="text-xs text-muted-foreground">Sending is off. This preview has no real email transport; the fake one runs only in local test mode.</p>
                  )}
                  {sendError && (
                    <Alert variant="destructive">
                      <Ban />
                      <AlertTitle>Failed, and it won&apos;t be retried</AlertTitle>
                      <AlertDescription>{sendError}. The package is marked failed, nothing was counted as sent, and Send stays off for it.</AlertDescription>
                    </Alert>
                  )}
                  {fakeSend && <p className="text-xs text-muted-foreground">Fake outbox: {outbox.length} sent.</p>}
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShieldCheck className="size-4" /> Export approved package
              </CardTitle>
              <CardDescription>Only the exact approved text can be exported. {t2.F3_NOTE}</CardDescription>
            </CardHeader>
            <CardContent>
              {exported === null ? (
                <p className="text-sm text-muted-foreground">Nothing to export until you approve a package.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" onClick={() => void navigator.clipboard.writeText(exported).then(() => toast.success("Copied"))}>
                    <Copy /> Copy
                  </Button>
                  <Button variant="outline" asChild>
                    <a href={t2.mailtoHref(exported)}>
                      <Mail /> {t2.MAIL_APP_LABEL}
                    </a>
                  </Button>
                  <Button variant="outline" onClick={() => download(exported)}>
                    <Download /> Download .txt
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
