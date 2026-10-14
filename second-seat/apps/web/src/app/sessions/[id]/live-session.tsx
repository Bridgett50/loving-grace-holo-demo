"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { AlertTriangle, ArrowLeft, Brain, Check, Copy, Download, Hand, Loader2, Mail, MessageSquareText, OctagonX, PhoneOff, Send, ShieldCheck, Undo2, Volume2, VolumeX, Wand2 } from "lucide-react";
import { draftFollowUp, suggestMemories, type KnowledgeDoc } from "@second-seat/core";
import { rememberMemory } from "@/app/actions";
import { toast } from "sonner";
import { PLATFORM_LABEL, SessionStateBadge } from "@/components/status-pills";
import { TwinStage } from "@/components/twin-avatar";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { LIVE_STATES, money, type SessionView } from "@/lib/types";
import { cn } from "@/lib/utils";

const END_REASON: Record<string, string> = {
  owner_ended: "You ended the session",
  meeting_ended: "The meeting ended",
  cap_reached: "Reached your minute cap",
  no_video_timeout: "No avatar video within 20 seconds",
  video_lost: "Avatar video was lost for 20 seconds",
  avatar_silent: "Avatar went silent (retried once)",
  join_failed: "The twin couldn't join the meeting",
  preflight_blocked: "Pre-flight checks didn't pass",
  kill_switch: "Stopped with the kill switch",
  consent_revoked: "Consent was revoked",
  owner_takeover: "You took over",
};

function useSession(id: string) {
  const [view, setView] = useState<SessionView | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let stop = false;
    let timer: ReturnType<typeof setTimeout>;
    const poll = async () => {
      try {
        const res = await fetch(`/api/sessions/${id}`, { cache: "no-store" });
        const body = await res.json();
        if (!res.ok) throw new Error(body.error);
        if (!stop) {
          setView(body);
          setError(null);
        }
        const v = body as SessionView;
        const terminal = !LIVE_STATES.includes(v.state);
        if (terminal && (v.credential || v.state === "blocked" || (v.settlement && !v.safeguards.joinedAt))) return;
      } catch (e) {
        if (!stop) setError((e as Error).message);
      }
      if (!stop) timer = setTimeout(poll, 900);
    };
    void poll();
    return () => {
      stop = true;
      clearTimeout(timer);
    };
  }, [id]);
  return { view, setView, error };
}

async function act(id: string, action: string, body: Record<string, unknown> = {}): Promise<SessionView | null> {
  const res = await fetch(`/api/sessions/${id}/${action}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  const json = await res.json();
  if (!res.ok) {
    toast.error(json.error ?? "Something went wrong");
    return null;
  }
  return json;
}

export function LiveSession(props: { id: string; look: "realistic" | "stylized"; imageSrc?: string; backgroundCss: string; badge: string; ownerName: string; ownerFirstName: string; demoMode: boolean; knowledge: KnowledgeDoc[] }) {
  const { view, setView, error } = useSession(props.id);
  const [voiceOn, setVoiceOn] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const spoken = useRef(0);

  useEffect(() => {
    if (!view) return;
    const fresh = view.utterances.filter((u) => u.id > spoken.current);
    if (!fresh.length) return;
    spoken.current = fresh.at(-1)!.id;
    if (!voiceOn || typeof speechSynthesis === "undefined") {
      const on = setTimeout(() => setSpeaking(true), 0);
      const off = setTimeout(() => setSpeaking(false), Math.min(6000, fresh.at(-1)!.text.length * 55));
      return () => {
        clearTimeout(on);
        clearTimeout(off);
      };
    }
    for (const u of fresh) {
      const utter = new SpeechSynthesisUtterance(u.text);
      utter.rate = 1.05;
      utter.onstart = () => setSpeaking(true);
      utter.onend = () => setSpeaking(false);
      speechSynthesis.speak(utter);
    }
  }, [view, voiceOn]);

  if (error && !view) {
    return (
      <Alert variant="destructive" className="mx-auto max-w-xl">
        <AlertTriangle />
        <AlertTitle>Can&apos;t load this session</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }
  if (!view) {
    return (
      <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <Skeleton className="aspect-video w-full rounded-xl" />
        <Skeleton className="h-96 w-full rounded-xl" />
      </div>
    );
  }

  const isLive = LIVE_STATES.includes(view.state);
  const showVideo = view.mode === "full" && !view.safeguards.degradedToVoiceOnly && view.state !== "listen_only";
  const update = (v: SessionView | null) => v && setView(v);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <Link href="/sessions" className="mb-1 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="size-3.5" /> Sessions
          </Link>
          <h1 className="truncate text-2xl font-semibold tracking-tight">{view.meeting.title}</h1>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <SessionStateBadge state={view.state} />
            <span>{PLATFORM_LABEL[view.meeting.platform]}</span>
            {view.adapter && <span>· via {view.adapter}</span>}
            <span>· {view.mode === "full" ? "video + voice" : view.mode.replace("_", " ")}</span>
          </div>
        </div>
        {isLive && (
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => setVoiceOn((v) => !v)} aria-pressed={voiceOn}>
              {voiceOn ? <Volume2 /> : <VolumeX />} {voiceOn ? "Preview voice on" : "Hear preview"}
            </Button>
            <KillSwitch onConfirm={async () => update(await act(props.id, "end", { reason: "kill_switch" }))} />
          </div>
        )}
      </div>

      {view.state === "blocked" && view.preflight && (
        <Alert variant="destructive">
          <OctagonX />
          <AlertTitle>Pre-flight stopped this session before anything connected</AlertTitle>
          <AlertDescription>
            <ul className="mt-1 list-disc pl-5">
              {view.preflight.reasons.map((r) => (
                <li key={r}>{r}</li>
              ))}
            </ul>
            <p className="mt-2">Nothing was charged.</p>
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <div className="space-y-4">
          <div className="relative">
            {showVideo || !isLive ? (
              <TwinStage
                look={props.look}
                imageSrc={props.imageSrc}
                backgroundCss={props.backgroundCss}
                badge={view.takeover ? `${props.ownerFirstName} (live) · twin paused` : props.badge}
                speaking={speaking && !view.takeover && isLive}
                recording={!view.transcriptionPaused && isLive}
                className={cn(!isLive && "opacity-60 grayscale-[40%]", view.state === "waiting_for_media" && "animate-pulse")}
              />
            ) : (
              <div className="flex aspect-video w-full flex-col items-center justify-center gap-3 rounded-xl bg-[radial-gradient(ellipse_at_50%_40%,#2a2f4a,#07080d_70%)] text-white">
                <div className={cn("flex size-24 items-center justify-center rounded-full bg-white/10 ring-4 ring-white/20", speaking && "ring-fuchsia-400/70")}>
                  <Volume2 className="size-10" />
                </div>
                <div className="rounded-md bg-black/60 px-2.5 py-1 text-sm font-semibold">{props.badge}</div>
                <div className="text-xs text-white/70">{view.state === "listen_only" ? "Listening and taking notes only" : "Voice-only fallback: video paused to keep latency under 1 second"}</div>
              </div>
            )}
            {(view.state === "joining" || view.state === "waiting_for_media") && (
              <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-black/40 text-white">
                <div className="flex items-center gap-2 rounded-lg bg-black/70 px-4 py-2 text-sm">
                  <Loader2 className="size-4 animate-spin" />
                  {view.state === "joining" ? "Joining — waiting for the host to admit your twin" : `Waiting for first video + audio frames · stops at 20 s (${Math.floor(view.safeguards.waitingForMediaMs / 1000)} s)`}
                </div>
              </div>
            )}
          </div>

          {isLive && <AskMe view={view} id={props.id} ownerFirstName={props.ownerFirstName} onUpdate={update} />}

          {isLive && (
            <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
              <Button
                size="lg"
                variant={view.takeover ? "default" : "secondary"}
                className="h-12 text-base"
                onClick={async () => update(await act(props.id, "takeover", { on: !view.takeover }))}
                disabled={view.state === "listen_only"}
              >
                {view.takeover ? <Undo2 /> : <Hand />}
                {view.takeover ? "Hand back to my twin" : "Take over now"}
              </Button>
              <Button size="lg" variant="outline" className="h-12" onClick={async () => update(await act(props.id, "end"))}>
                <PhoneOff /> End session
              </Button>
            </div>
          )}

          {view.takeover && isLive && <OwnerSays id={props.id} onUpdate={update} />}
          {!isLive && <Summary view={view} />}
          {!isLive && view.summary && <FollowThrough view={view} ownerName={props.ownerName} knowledge={props.knowledge} />}
        </div>

        <Card className="min-h-[28rem]">
          <Tabs defaultValue={isLive ? "transcript" : "safeguards"} className="flex h-full flex-col">
            <CardHeader className="pb-0">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="transcript">Transcript</TabsTrigger>
                <TabsTrigger value="coach" disabled={!isLive}>
                  Coach
                </TabsTrigger>
                <TabsTrigger value="safeguards">Safeguards</TabsTrigger>
              </TabsList>
            </CardHeader>
            <CardContent className="flex-1 pt-4">
              <TabsContent value="transcript" className="mt-0">
                <Transcript view={view} />
                {props.demoMode && isLive && view.meeting.platform === "demo" && <DemoParticipant id={props.id} ownerFirstName={props.ownerFirstName} onUpdate={update} />}
              </TabsContent>
              <TabsContent value="coach" className="mt-0">
                <Coach id={props.id} onUpdate={update} takeover={view.takeover} />
              </TabsContent>
              <TabsContent value="safeguards" className="mt-0">
                <Safeguards view={view} />
              </TabsContent>
            </CardContent>
          </Tabs>
        </Card>
      </div>
    </div>
  );
}

/** Live "Ask me": questions the twin couldn't answer from notes, answered by the owner in one tap. */
function AskMe({ view, id, ownerFirstName, onUpdate }: { view: SessionView; id: string; ownerFirstName: string; onUpdate: (v: SessionView | null) => void }) {
  const pending = (view.questions ?? []).filter((q) => q.status === "pending");
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [now, setNow] = useState(0);
  const seen = useRef(new Set<string>());
  const pendingKey = pending.map((q) => q.id).join(",");

  useEffect(() => {
    const fresh = (view.questions ?? []).filter((q) => q.status === "pending" && !seen.current.has(q.id));
    if (!fresh.length) return;
    fresh.forEach((q) => seen.current.add(q.id));
    toast.message(`${fresh[0].askedBy} asked your twin something it needs you for`, { description: fresh[0].question });
    const original = document.title;
    let on = false;
    const blink = setInterval(() => {
      on = !on;
      document.title = on ? "● Your twin needs you" : original;
    }, 900);
    const stop = setTimeout(() => {
      clearInterval(blink);
      document.title = original;
    }, 12_000);
    return () => {
      clearInterval(blink);
      clearTimeout(stop);
      document.title = original;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingKey]);

  useEffect(() => {
    if (!pending.length) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [pending.length]);

  if (!pending.length) return null;
  const send = async (questionId: string, followUp = false) => {
    setBusy(questionId);
    onUpdate(await act(id, "answer", followUp ? { questionId, followUp: true } : { questionId, text: drafts[questionId] ?? "" }));
    setBusy(null);
  };
  return (
    <Card className="border-primary/40 bg-primary/5 shadow-md">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <span className="relative flex size-2.5">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-primary opacity-60" />
            <span className="relative inline-flex size-2.5 rounded-full bg-primary" />
          </span>
          Your twin is asking you
        </CardTitle>
        <CardDescription>It told the room it&apos;s checking with you. Your reply is relayed live as &ldquo;{ownerFirstName} just replied&rdquo;, and it still can&apos;t commit you to contracts or payments.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {pending.map((q) => {
          const waited = now ? Math.max(0, Math.floor((now - Date.parse(q.askedAt)) / 1000)) : 0;
          return (
            <form
              key={q.id}
              className="space-y-2 rounded-lg border bg-background p-3"
              onSubmit={(e) => {
                e.preventDefault();
                if ((drafts[q.id] ?? "").trim()) void send(q.id);
              }}
            >
              <div className="flex items-start justify-between gap-2 text-sm">
                <p>
                  <span className="font-medium">{q.askedBy}:</span> &ldquo;{q.question}&rdquo;
                </p>
                {waited > 0 && <span className="shrink-0 text-xs text-muted-foreground tabular-nums">{waited}s</span>}
              </div>
              <div className="flex gap-2">
                <Input autoFocus placeholder="Type your answer…" value={drafts[q.id] ?? ""} onChange={(e) => setDrafts((d) => ({ ...d, [q.id]: e.target.value }))} maxLength={500} aria-label={`Answer to ${q.askedBy}`} />
                <Button type="submit" disabled={busy === q.id || !(drafts[q.id] ?? "").trim()}>
                  {busy === q.id ? <Loader2 className="animate-spin" /> : <Send />} Send
                </Button>
              </div>
              <Button type="button" variant="ghost" size="sm" className="h-7 px-2 text-xs" disabled={busy === q.id} onClick={() => void send(q.id, true)}>
                I&apos;ll follow up after the meeting
              </Button>
            </form>
          );
        })}
      </CardContent>
    </Card>
  );
}

function KillSwitch({ onConfirm }: { onConfirm: () => void }) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="destructive" size="sm">
          <OctagonX /> Kill switch
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Stop your twin immediately?</DialogTitle>
          <DialogDescription>Your twin leaves the meeting right away, all workers are released and the session is refunded in full.</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <DialogClose asChild>
            <Button variant="destructive" onClick={onConfirm}>
              Stop now
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Transcript({ view }: { view: SessionView }) {
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const viewport = end.current?.closest<HTMLElement>('[data-slot="scroll-area-viewport"]');
    if (viewport) viewport.scrollTop = viewport.scrollHeight;
  }, [view.transcript.length]);
  return (
    <ScrollArea className="h-[22rem] pr-3">
      {view.transcript.length === 0 && <p className="py-10 text-center text-sm text-muted-foreground">{LIVE_STATES.includes(view.state) ? "Waiting for someone to speak…" : "Nothing was said."}</p>}
      <ul className="space-y-3" aria-live="polite">
        {view.transcript.map((l, i) => (
          <li key={i} className={cn("rounded-lg px-3 py-2 text-sm", l.isTwin ? "bg-secondary" : l.speaker.endsWith("(live)") ? "bg-accent" : "bg-muted/60")}>
            <div className="mb-0.5 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              {l.isTwin && <Badge className="h-4 px-1 text-[10px]">AI</Badge>}
              {l.speaker}
              <span className="ml-auto font-normal">{new Date(l.at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit", second: "2-digit" })}</span>
            </div>
            {l.text}
          </li>
        ))}
      </ul>
      <div ref={end} />
    </ScrollArea>
  );
}

function DemoParticipant({ id, ownerFirstName, onUpdate }: { id: string; ownerFirstName: string; onUpdate: (v: SessionView | null) => void }) {
  const [text, setText] = useState("");
  const suggestions = [`${ownerFirstName}, who leads the hardware work?`, `${ownerFirstName}, can you approve the payment for the deposit?`, "Please stop recording."];
  const send = async (t: string) => {
    if (!t.trim()) return;
    setText("");
    onUpdate(await act(id, "demo-say", { speaker: "You (as a guest)", text: t }));
  };
  return (
    <div className="mt-3 space-y-2 border-t pt-3">
      <div className="text-xs font-medium text-muted-foreground">Speak as a meeting guest (demo)</div>
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          void send(text);
        }}
      >
        <Input value={text} onChange={(e) => setText(e.target.value)} placeholder={`Ask ${ownerFirstName}'s twin something…`} aria-label="Say something as a guest" />
        <Button type="submit" size="icon" aria-label="Send">
          <Send />
        </Button>
      </form>
      <div className="flex flex-wrap gap-1.5">
        {suggestions.map((s) => (
          <button key={s} type="button" onClick={() => void send(s)} className="rounded-full border px-2.5 py-1 text-xs hover:bg-muted">
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}

function Coach({ id, onUpdate, takeover }: { id: string; onUpdate: (v: SessionView | null) => void; takeover: boolean }) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const send = async (kind: "whisper" | "say") => {
    if (!text.trim()) return;
    setBusy(true);
    const v = await act(id, "coach", { text, kind });
    setBusy(false);
    if (v) {
      onUpdate(v);
      setText("");
      toast.success(kind === "say" ? "Your twin is saying it now" : "Whisper sent. Your twin will use it in its next answer.");
    }
  };
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">Only your twin hears this. Whispers become private context for its next answer; “Say this” speaks your words in your voice, after the same safety screen.</p>
      {takeover && <p className="text-sm text-warning">You&apos;re in takeover, so your twin is paused.</p>}
      <Textarea value={text} onChange={(e) => setText(e.target.value)} rows={5} maxLength={500} placeholder="e.g. If they ask about timing, say we're on track for March but the Atlanta site needs one more inspection." />
      <div className="grid grid-cols-2 gap-2">
        <Button variant="secondary" onClick={() => send("whisper")} disabled={busy || !text.trim()}>
          <MessageSquareText /> Whisper
        </Button>
        <Button onClick={() => send("say")} disabled={busy || !text.trim() || takeover}>
          <Wand2 /> Say this
        </Button>
      </div>
    </div>
  );
}

function OwnerSays({ id, onUpdate }: { id: string; onUpdate: (v: SessionView | null) => void }) {
  const [text, setText] = useState("");
  return (
    <form
      className="flex gap-2 rounded-lg border bg-accent/40 p-3"
      onSubmit={async (e) => {
        e.preventDefault();
        if (!text.trim()) return;
        onUpdate(await act(id, "owner-says", { text }));
        setText("");
      }}
    >
      <Input value={text} onChange={(e) => setText(e.target.value)} placeholder="Type as yourself (posted as you, live — not your clone)" aria-label="Type as yourself" />
      <Button type="submit">Send</Button>
    </form>
  );
}

function Row({ label, value, ok }: { label: string; value: React.ReactNode; ok?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 py-1.5 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className={cn("text-right font-medium tabular-nums", ok === true && "text-success", ok === false && "text-destructive")}>{value}</span>
    </div>
  );
}

function Safeguards({ view }: { view: SessionView }) {
  const s = view.safeguards;
  const capPct = Math.min(100, (s.liveSeconds / (s.capMinutes * 60)) * 100);
  const live = LIVE_STATES.includes(view.state);
  return (
    <ScrollArea className="h-[26rem] pr-3">
      <div className="space-y-5">
        <section>
          <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Disclosure</h3>
          <Row label="Spoken “AI twin” intro" value={view.disclosure.intro ? "Given" : "Pending"} ok={view.disclosure.intro} />
          <Row label="Recording notice" value={view.disclosure.recordingNotice ? "Given" : "Pending"} ok={view.disclosure.recordingNotice} />
          <Row label="Chat notice" value={view.disclosure.chatNotice ? "Posted" : "Pending"} ok={view.disclosure.chatNotice} />
          <Row label="Transcription" value={view.transcriptionPaused ? "Paused at a guest's request" : "On"} />
        </section>
        <section>
          <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Ready means real</h3>
          <Row label="First video frame" value={s.firstVideoAt ? "Received" : view.mode === "full" ? "Waiting" : "Not needed"} ok={s.firstVideoAt ? true : undefined} />
          <Row label="First audio frame" value={s.firstAudioAt ? "Received" : view.mode === "listen_only" ? "Not needed" : "Waiting"} ok={s.firstAudioAt ? true : undefined} />
          <Row label="Frames (video / audio)" value={`${s.videoFrames} / ${s.audioFrames}`} />
          <Row label="No-video stop" value={`${s.noVideoTimeoutMs / 1000} s`} />
          <Row label="Silence watchdog" value={`${s.silenceTimeoutMs / 1000} s, retries used ${s.silenceRetriesUsed}/1`} />
          {s.degradedToVoiceOnly && <Row label="Fallback" value="Voice only" />}
        </section>
        <section>
          <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Cost</h3>
          <Row label="Reserved (cap)" value={money(s.reservedCents)} />
          <Row label="Live time" value={`${Math.floor(s.liveSeconds / 60)}:${String(s.liveSeconds % 60).padStart(2, "0")} of ${s.capMinutes}:00`} />
          <Progress value={capPct} className="my-1.5" />
          {view.settlement && (
            <>
              <Row label="Charged" value={money(view.settlement.chargedCents)} />
              <Row label="Refunded automatically" value={money(view.settlement.refundedCents)} ok={view.settlement.refundedCents > 0 ? true : undefined} />
            </>
          )}
        </section>
        <section>
          <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Latency (target under 1 s)</h3>
          <Row label="Median turn" value={view.latency.medianMs ? `${view.latency.medianMs} ms` : "—"} ok={view.latency.medianMs ? view.latency.medianMs <= view.latency.targetMs : undefined} />
          <Row label="Without avatar" value={view.latency.medianWithoutAvatarMs ? `${view.latency.medianWithoutAvatarMs} ms` : "—"} />
          <Row label="Voice" value={view.providers.voiceCloned ? "OpenVoice clone" : "Demo voice (preview)"} />
          <Row label="Avatar" value={view.providers.avatar} />
          <Row label="Answers" value={view.providers.brain === "llm" ? "LLM grounded in your notes" : "Your notes (retrieval)"} />
        </section>
        {view.flagged.length > 0 && (
          <section>
            <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Needs you</h3>
            <ul className="space-y-1.5 text-sm">
              {view.flagged.map((f, i) => (
                <li key={i} className="flex gap-1.5">
                  <AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-warning" />
                  {f}
                </li>
              ))}
            </ul>
          </section>
        )}
        <section>
          <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Session log</h3>
          <ol className="space-y-1 font-mono text-[11px] leading-relaxed text-muted-foreground">
            {view.log.map((e, i) => (
              <li key={i} className={cn(e.level === "error" && "text-destructive", e.level === "warn" && "text-warning")}>
                {new Date(e.at).toLocaleTimeString()} {e.event}
              </li>
            ))}
          </ol>
        </section>
        {!live && view.adapterAttempts.some((a) => !a.ok) && (
          <section>
            <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Join attempts</h3>
            {view.adapterAttempts.map((a) => (
              <p key={a.adapter} className="text-xs">
                <strong>{a.adapter}</strong>: {a.ok ? "joined" : a.error}
              </p>
            ))}
          </section>
        )}
      </div>
    </ScrollArea>
  );
}

/** After the meeting: a recap the owner reviews and sends, and memories the owner approves for next time. */
function FollowThrough({ view, ownerName, knowledge }: { view: SessionView; ownerName: string; knowledge: KnowledgeDoc[] }) {
  const draft = useMemo(() => draftFollowUp({ title: view.meeting.title, ownerName, summary: view.summary!, questions: view.questions }), [view.meeting.title, ownerName, view.summary, view.questions]);
  // Suggestions use the notes as they were on arrival, so a memory saved here stays visible as "Saved".
  const [knowledgeAtOpen] = useState(knowledge);
  const memories = useMemo(() => suggestMemories({ sessionId: view.id, title: view.meeting.title, summary: view.summary, questions: view.questions, knowledge: knowledgeAtOpen }), [view.id, view.meeting.title, view.summary, view.questions, knowledgeAtOpen]);
  const [body, setBody] = useState(draft.body);
  const [saved, setSaved] = useState<Set<string>>(new Set());
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [copied, setCopied] = useState(false);
  const visible = memories.filter((m) => !dismissed.has(m.id));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wand2 className="size-4 text-primary" /> Follow-through
        </CardTitle>
        <CardDescription>Your twin drafted the recap and spotted what to remember. Nothing is sent or saved until you say so.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="space-y-2">
          <div className="text-sm font-medium">Recap email · {draft.subject}</div>
          <Textarea value={body} onChange={(e) => setBody(e.target.value)} rows={10} className="font-mono text-xs" aria-label="Recap email draft" />
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={async () => {
                await navigator.clipboard.writeText(`Subject: ${draft.subject}\n\n${body}`);
                setCopied(true);
                setTimeout(() => setCopied(false), 1500);
              }}
            >
              {copied ? <Check /> : <Copy />} {copied ? "Copied" : "Copy"}
            </Button>
            <Button asChild size="sm" variant="outline">
              <a href={`mailto:?subject=${encodeURIComponent(draft.subject)}&body=${encodeURIComponent(body)}`}>
                <Mail /> Open in email
              </a>
            </Button>
          </div>
        </div>
        <div className="space-y-2">
          <div className="flex items-center gap-1.5 text-sm font-medium">
            <Brain className="size-4 text-primary" /> Remember for next time
          </div>
          {visible.length === 0 ? (
            <p className="text-sm text-muted-foreground">{memories.length ? "All handled." : "Nothing new to remember from this meeting."}</p>
          ) : (
            <ul className="space-y-2">
              {visible.map((m) => (
                <li key={m.id} className="flex flex-col gap-2 rounded-lg border p-3 text-sm sm:flex-row sm:items-center">
                  <div className="min-w-0 flex-1">
                    <Badge variant="secondary" className="mb-1">{m.kind === "owner_answer" ? "Your answer" : "Decision"}</Badge>
                    <div className="font-medium">{m.title}</div>
                    <div className="text-muted-foreground">{m.content}</div>
                  </div>
                  {saved.has(m.id) ? (
                    <span className="flex items-center gap-1 text-xs text-success">
                      <Check className="size-3.5" /> Saved to notes
                    </span>
                  ) : (
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        onClick={async () => {
                          const r = await rememberMemory({ id: m.id, title: m.title, content: m.content });
                          if (r.ok) setSaved((x) => new Set(x).add(m.id));
                          else toast.error(r.error);
                        }}
                      >
                        Remember
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setDismissed((x) => new Set(x).add(m.id))}>
                        Skip
                      </Button>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function Summary({ view }: { view: SessionView }) {
  const [verify, setVerify] = useState<string | null>(null);
  const reason = view.endReason ? END_REASON[view.endReason] ?? view.endReason : "";
  const failed = view.state === "failed";
  const download = useMemo(() => (view.summaryMarkdown ? URL.createObjectURL(new Blob([view.summaryMarkdown], { type: "text/markdown" })) : null), [view.summaryMarkdown]);
  const credUrl = useMemo(() => (view.credential ? URL.createObjectURL(new Blob([JSON.stringify(view.credential, null, 2)], { type: "application/json" })) : null), [view.credential]);

  return (
    <div className="space-y-4">
      <Alert variant={failed ? "destructive" : "default"}>
        {failed ? <AlertTriangle /> : <ShieldCheck />}
        <AlertTitle>{reason || "Session ended"}</AlertTitle>
        <AlertDescription>
          {view.settlement ? (
            <>
              Live for {view.safeguards.liveSeconds} s · charged {money(view.settlement.chargedCents)} · {money(view.settlement.refundedCents)} returned to your wallet
              {failed ? " (automatic refund)." : view.billing && !view.billing.billed ? " (under 30 seconds, not billed)." : "."}
            </>
          ) : view.state === "blocked" ? (
            "Nothing connected and nothing was charged."
          ) : (
            "Settling…"
          )}
        </AlertDescription>
      </Alert>

      {view.summary ? (
        <Card>
          <CardHeader>
            <CardTitle>Meeting notes</CardTitle>
            <CardDescription>Posted by your twin after the meeting. Watermarked and signed with Content Credentials.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5 text-sm">
            {view.summary.flaggedForOwner.length > 0 && (
              <div className="rounded-lg border border-warning/50 bg-warning/10 p-3">
                <div className="mb-1 font-medium">Needs your attention</div>
                <ul className="list-disc space-y-1 pl-5">
                  {view.summary.flaggedForOwner.map((f, i) => (
                    <li key={i}>{f}</li>
                  ))}
                </ul>
              </div>
            )}
            <div>
              <div className="mb-1 font-medium">Action items</div>
              {view.summary.actionItems.length ? (
                <ul className="space-y-1">
                  {view.summary.actionItems.map((a, i) => (
                    <li key={i} className="flex gap-2">
                      <input type="checkbox" className="mt-1" aria-label={a.text} />
                      <span>
                        <strong>{a.owner}:</strong> {a.text}
                        {a.due && <span className="text-muted-foreground"> · due {a.due}</span>}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-muted-foreground">No action items.</p>
              )}
            </div>
            {view.summary.decisions.length > 0 && (
              <div>
                <div className="mb-1 font-medium">Decisions</div>
                <ul className="list-disc space-y-1 pl-5">
                  {view.summary.decisions.map((d, i) => (
                    <li key={i}>{d}</li>
                  ))}
                </ul>
              </div>
            )}
            <div>
              <div className="mb-1 font-medium">Notes</div>
              <ul className="list-disc space-y-1 pl-5">
                {view.summary.notes.map((n, i) => (
                  <li key={i}>{n}</li>
                ))}
              </ul>
            </div>
            <div className="flex flex-wrap gap-2 border-t pt-4">
              {download && (
                <Button asChild variant="outline" size="sm">
                  <a href={download} download={`${view.id}-notes.md`}>
                    <Download /> Notes & transcript (.md)
                  </a>
                </Button>
              )}
              {credUrl && (
                <Button asChild variant="outline" size="sm">
                  <a href={credUrl} download={`${view.id}-content-credentials.json`}>
                    <Download /> Content Credentials
                  </a>
                </Button>
              )}
              {view.credential && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={async () => {
                    const r = await fetch("/api/credentials/verify", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ credential: view.credential, asset: view.summaryMarkdown }) });
                    const b = await r.json();
                    setVerify(b.valid ? "Signature valid · content unmodified" : `Invalid: ${b.reason}`);
                  }}
                >
                  <ShieldCheck /> Verify credentials
                </Button>
              )}
              {verify && <span className="self-center text-xs text-success">{verify}</span>}
            </div>
          </CardContent>
        </Card>
      ) : (
        view.state !== "blocked" &&
        !failed && (
          <Card>
            <CardContent className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" /> Writing your notes…
            </CardContent>
          </Card>
        )
      )}
    </div>
  );
}
