"use client";

/* eslint-disable @next/next/no-img-element */
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Camera, Check, CircleStop, FileUp, IdCard, Loader2, Mic, ShieldCheck, Upload } from "lucide-react";
import { toast } from "sonner";
import type { ConsentScope } from "@second-seat/core";
import { completeVerification, createTwin, saveBasics } from "@/app/actions";
import { StylizedAvatar, TwinStage } from "@/components/twin-avatar";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { frameFromVideoElement, pickRecorderMime, referenceFrameFromFile, upload } from "@/lib/media";
import { cn } from "@/lib/utils";
import { useSafeTransition } from "@/lib/use-safe-transition";
import { BRAND } from "@/lib/brand";

const STEPS = ["About you", "Verify & scan", "Voice", "Look", "Consent"];
const CHALLENGES = [
  { id: "look_straight", label: "Look straight at the camera" },
  { id: "turn_left", label: "Slowly turn your head left" },
  { id: "turn_right", label: "Now turn to the right" },
  { id: "blink", label: "Blink twice" },
  { id: "smile", label: "Give us a smile" },
];
const VOICE_SCRIPT =
  `Hi, this is my voice sample for my ${BRAND.name} twin. My twin will always tell people it's an AI, its contract, payment and offer-acceptance capabilities are forbidden in code, and it flags anything like that for me, and I can take over at any time.`;
const SCOPES: Array<{ id: ConsentScope; label: string; required?: boolean }> = [
  { id: "likeness_video", label: "Use my face and likeness to animate my twin on video", required: true },
  { id: "voice_clone", label: "Clone my voice so my twin can speak", required: true },
  { id: "meeting_join", label: "Let my twin join meetings I authorize", required: true },
  { id: "recording", label: "Transcribe meetings my twin attends (with a notice to everyone)" },
  { id: "knowledge_use", label: "Let my twin answer from the notes I upload" },
];

interface Media {
  scanId?: string;
  referenceId?: string;
  referenceUrl?: string;
  voiceId?: string;
  idDocId?: string;
  challenges: string[];
}

export function OnboardingWizard(props: { initialName: string; initialEmail: string; alreadyVerified: boolean; consentTemplate: string; demoMode: boolean }) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [name, setName] = useState(props.initialName);
  const [email, setEmail] = useState(props.initialEmail);
  const [media, setMedia] = useState<Media>({ challenges: [] });
  const [verified, setVerified] = useState(props.alreadyVerified);
  const [chosenLook, setLook] = useState<"realistic" | "stylized">("realistic");
  const [scopes, setScopes] = useState<ConsentScope[]>(SCOPES.map((s) => s.id));
  const [signature, setSignature] = useState("");
  const [attest, setAttest] = useState(false);
  const [creating, setCreating] = useState<number | null>(null);
  const [pending, start] = useSafeTransition();

  const look = media.referenceId ? chosenLook : "stylized";
  const next = () => setStep((s) => s + 1);

  function submitBasics() {
    start(async () => {
      const r = await saveBasics({ name, email });
      if (!r.ok) toast.error(r.error);
      else next();
    });
  }

  function submitVerification() {
    start(async () => {
      if (!media.idDocId || !media.scanId) return;
      const r = await completeVerification({ idDocumentAssetId: media.idDocId, livenessAssetId: media.scanId, challenges: media.challenges });
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      setVerified(true);
      toast.success("Identity verified");
      next();
    });
  }

  function submitCreate() {
    start(async () => {
      const r = await createTwin({ look, scanAssetId: media.scanId!, voiceAssetId: media.voiceId!, referenceAssetId: media.referenceId, signerName: signature, scopes, attestSelf: attest });
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      const stages = [10, 35, 60, 85, 100];
      for (const p of stages) {
        setCreating(p);
        await new Promise((res) => setTimeout(res, 550));
      }
      router.push("/twin?welcome=1");
    });
  }

  if (creating !== null) {
    const label = creating < 35 ? "Encrypting your scan and voice sample" : creating < 60 ? "Training your consented voice clone" : creating < 85 ? `Preparing your ${look === "realistic" ? "realistic" : "stylized 3D"} avatar` : "Adding disclosure badge and content credentials";
    return (
      <Card className="mx-auto max-w-lg">
        <CardHeader>
          <CardTitle>Creating your twin</CardTitle>
          <CardDescription>{label}…</CardDescription>
        </CardHeader>
        <CardContent>
          <Progress value={creating} />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Create your twin</h1>
        <p className="text-muted-foreground">About three minutes. Only you can create or run your twin.</p>
      </div>
      <ol className="flex gap-2" aria-label="Progress">
        {STEPS.map((s, i) => (
          <li key={s} className="flex-1">
            <div className={cn("h-1.5 rounded-full", i <= step ? "bg-primary" : "bg-muted")} />
            <span className={cn("mt-1.5 hidden text-xs sm:block", i === step ? "font-medium" : "text-muted-foreground")}>{s}</span>
          </li>
        ))}
      </ol>

      {step === 0 && (
        <Card>
          <CardHeader>
            <CardTitle>About you</CardTitle>
            <CardDescription>Your twin is labeled “AI Twin of {name || "your name"}” in every meeting.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">Full legal name</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" placeholder="Bridget Sander" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" placeholder="bridgett@example.com" />
            </div>
          </CardContent>
          <CardFooter className="justify-end">
            <Button onClick={submitBasics} disabled={pending}>
              {pending && <Loader2 className="animate-spin" />} Continue
            </Button>
          </CardFooter>
        </Card>
      )}

      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Verify it&apos;s you, and scan your face</CardTitle>
            <CardDescription>We check your ID and that you&apos;re a live person while we capture your scan, so no one else can make a twin of you.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {verified && props.alreadyVerified ? (
              <Alert>
                <ShieldCheck />
                <AlertTitle>Identity already verified</AlertTitle>
                <AlertDescription>You still need a fresh scan for your twin.</AlertDescription>
              </Alert>
            ) : (
              <IdUpload done={!!media.idDocId} onDone={(id) => setMedia((m) => ({ ...m, idDocId: id }))} />
            )}
            <ScanCapture
              done={!!media.scanId}
              referenceUrl={media.referenceUrl}
              onDone={(r) => setMedia((m) => ({ ...m, scanId: r.scanId, referenceId: r.referenceId, referenceUrl: r.referenceUrl, challenges: r.challenges }))}
              demoMode={props.demoMode}
            />
          </CardContent>
          <CardFooter className="justify-between">
            <Button variant="ghost" onClick={() => setStep(0)}>
              Back
            </Button>
            {props.alreadyVerified ? (
              <Button onClick={next} disabled={!media.scanId}>
                Continue
              </Button>
            ) : (
              <Button onClick={submitVerification} disabled={pending || !media.idDocId || !media.scanId}>
                {pending && <Loader2 className="animate-spin" />} Verify and continue
              </Button>
            )}
          </CardFooter>
        </Card>
      )}

      {step === 2 && (
        <Card>
          <CardHeader>
            <CardTitle>Record your voice</CardTitle>
            <CardDescription>Read the passage below naturally. 15–30 seconds is plenty. Your voice clone is used only by your twin.</CardDescription>
          </CardHeader>
          <CardContent>
            <VoiceCapture done={!!media.voiceId} onDone={(id) => setMedia((m) => ({ ...m, voiceId: id }))} />
          </CardContent>
          <CardFooter className="justify-between">
            <Button variant="ghost" onClick={() => setStep(1)}>
              Back
            </Button>
            <Button onClick={next} disabled={!media.voiceId}>
              Continue
            </Button>
          </CardFooter>
        </Card>
      )}

      {step === 3 && (
        <Card>
          <CardHeader>
            <CardTitle>Choose how your twin looks</CardTitle>
            <CardDescription>Attendees always see the “AI Twin” badge, whichever look you choose. You can switch later.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            {(["realistic", "stylized"] as const).map((l) => {
              const disabled = l === "realistic" && !media.referenceUrl;
              return (
                <button
                  key={l}
                  type="button"
                  disabled={disabled}
                  onClick={() => setLook(l)}
                  aria-pressed={look === l}
                  className={cn("overflow-hidden rounded-xl border-2 text-left transition", look === l ? "border-primary ring-2 ring-primary/20" : "border-border", disabled && "cursor-not-allowed opacity-50")}
                >
                  <TwinStage look={l} imageSrc={media.referenceUrl} backgroundCss="radial-gradient(ellipse at 50% 35%, #1b2236 0%, #05060a 70%)" badge={`AI Twin of ${name}`} recording={false} className="rounded-none" />
                  <div className="p-4">
                    <div className="font-medium">{l === "realistic" ? "Realistic" : "Stylized 3D"}</div>
                    <p className="text-sm text-muted-foreground">
                      {l === "realistic"
                        ? disabled
                          ? "Needs a clear frame of your face from your scan. Shown here with a sample person."
                          : "Animated from your own video with photoreal lip-sync. Natural, not cartoonish."
                        : "A polished animated-film style character built from your scan, with your voice. Shown here with a sample character."}
                    </p>
                  </div>
                </button>
              );
            })}
          </CardContent>
          <CardFooter className="justify-between">
            <Button variant="ghost" onClick={() => setStep(2)}>
              Back
            </Button>
            <Button onClick={next}>Continue</Button>
          </CardFooter>
        </Card>
      )}

      {step === 4 && (
        <Card>
          <CardHeader>
            <CardTitle>Sign your consent</CardTitle>
            <CardDescription>Stored in your consent vault. Revoking it stops your twin everywhere, immediately.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <pre className="max-h-56 overflow-auto whitespace-pre-wrap rounded-lg border bg-muted/50 p-4 font-sans text-sm leading-relaxed">{props.consentTemplate.replaceAll("{{NAME}}", name)}</pre>
            <fieldset className="space-y-2">
              <legend className="mb-2 text-sm font-medium">I allow my twin to:</legend>
              {SCOPES.map((s) => (
                <Label key={s.id} className="flex items-start gap-2 font-normal">
                  <Checkbox
                    checked={scopes.includes(s.id)}
                    disabled={s.required}
                    onCheckedChange={(c) => setScopes((xs) => (c ? [...xs, s.id] : xs.filter((x) => x !== s.id)))}
                    className="mt-0.5"
                  />
                  <span>
                    {s.label}
                    {s.required && <span className="text-muted-foreground"> (required)</span>}
                  </span>
                </Label>
              ))}
            </fieldset>
            <Label className="flex items-start gap-2 font-normal">
              <Checkbox checked={attest} onCheckedChange={(c) => setAttest(!!c)} className="mt-0.5" />
              <span>I am the person in the scan and voice sample, I am 18 or older, and I am not creating a twin of anyone else.</span>
            </Label>
            <div className="space-y-2">
              <Label htmlFor="sig">Type your full name to sign</Label>
              <Input id="sig" value={signature} onChange={(e) => setSignature(e.target.value)} placeholder={name} className="font-medium italic" />
            </div>
          </CardContent>
          <CardFooter className="justify-between">
            <Button variant="ghost" onClick={() => setStep(3)}>
              Back
            </Button>
            <Button onClick={submitCreate} disabled={pending || !attest || signature.trim().toLowerCase() !== name.trim().toLowerCase()}>
              {pending && <Loader2 className="animate-spin" />} Sign and create my twin
            </Button>
          </CardFooter>
        </Card>
      )}
    </div>
  );
}

function IdUpload({ done, onDone }: { done: boolean; onDone: (id: string) => void }) {
  const [busy, setBusy] = useState(false);
  return (
    <div className="flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-center">
      <IdCard className="size-8 shrink-0 text-primary" />
      <div className="flex-1">
        <div className="font-medium">Photo of your government ID</div>
        <p className="text-sm text-muted-foreground">Driver&apos;s license, passport or national ID. Used only to confirm the scan matches you; never shown in meetings.</p>
      </div>
      {done ? (
        <span className="flex items-center gap-1 text-sm font-medium text-success">
          <Check className="size-4" /> Uploaded
        </span>
      ) : (
        <Button asChild variant="outline" disabled={busy}>
          <label className="cursor-pointer">
            {busy ? <Loader2 className="animate-spin" /> : <Upload />} Upload ID
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="sr-only"
              onChange={async (e) => {
                const f = e.target.files?.[0];
                if (!f) return;
                setBusy(true);
                try {
                  onDone((await upload("id_document", f, f.name)).id);
                } catch (err) {
                  toast.error((err as Error).message);
                } finally {
                  setBusy(false);
                }
              }}
            />
          </label>
        </Button>
      )}
    </div>
  );
}

function ScanCapture({ done, referenceUrl, onDone, demoMode }: { done: boolean; referenceUrl?: string; demoMode: boolean; onDone: (r: { scanId: string; referenceId?: string; referenceUrl?: string; challenges: string[] }) => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [phase, setPhase] = useState<"idle" | "camera" | "recording" | "uploading" | "upload-prompts">("idle");
  const [idx, setIdx] = useState(0);
  const [confirmed, setConfirmed] = useState<string[]>([]);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);

  useEffect(() => () => stream?.getTracks().forEach((t) => t.stop()), [stream]);

  async function openCamera() {
    setCameraError(null);
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: { width: 1280, height: 720, facingMode: "user" }, audio: false });
      setStream(s);
      setPhase("camera");
      requestAnimationFrame(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = s;
          void videoRef.current.play();
        }
      });
    } catch {
      setCameraError("We couldn't open your camera. You can upload a selfie video or phone scan instead.");
    }
  }

  async function record() {
    if (!stream || !videoRef.current) return;
    setPhase("recording");
    const mime = pickRecorderMime("video");
    const rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
    const chunks: Blob[] = [];
    rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
    let reference: Blob | undefined;
    const doneChallenges: string[] = [];
    rec.start(500);
    for (let i = 0; i < CHALLENGES.length; i++) {
      setIdx(i);
      await new Promise((r) => setTimeout(r, 2200));
      if (i === 0) reference = await frameFromVideoElement(videoRef.current);
      doneChallenges.push(CHALLENGES[i].id);
    }
    await new Promise<void>((r) => {
      rec.onstop = () => r();
      rec.stop();
    });
    stream.getTracks().forEach((t) => t.stop());
    setStream(null);
    setPhase("uploading");
    try {
      const blob = new Blob(chunks, { type: (mime || "video/webm").split(";")[0] });
      const scan = await upload("scan", blob, "selfie-scan.webm");
      const ref = reference ? await upload("reference", reference, "reference.jpg") : undefined;
      onDone({ scanId: scan.id, referenceId: ref?.id, referenceUrl: ref?.url, challenges: doneChallenges });
      setPhase("idle");
    } catch (e) {
      toast.error((e as Error).message);
      setPhase("idle");
    }
  }

  async function finishUpload() {
    if (!pendingFile) return;
    setPhase("uploading");
    try {
      const scan = await upload("scan", pendingFile, pendingFile.name);
      let ref;
      try {
        ref = await upload("reference", await referenceFrameFromFile(pendingFile), "reference.jpg");
      } catch (e) {
        toast.message((e as Error).message || "Couldn't extract a face frame; the stylized look is still available.");
      }
      onDone({ scanId: scan.id, referenceId: ref?.id, referenceUrl: ref?.url, challenges: confirmed });
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setPhase("idle");
      setPendingFile(null);
    }
  }

  if (done) {
    return (
      <div className="flex items-center gap-4 rounded-lg border p-4">
        {referenceUrl ? <img src={referenceUrl} alt="Your scan reference frame" className="size-16 rounded-lg object-cover" /> : <div className="size-16 rounded-lg bg-muted"><StylizedAvatar /></div>}
        <div className="flex-1">
          <div className="flex items-center gap-1 font-medium text-success">
            <Check className="size-4" /> Scan and liveness captured
          </div>
          <p className="text-sm text-muted-foreground">{referenceUrl ? "We'll animate your twin from this frame." : "No face frame found, so only the stylized look is available."}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3 rounded-lg border p-4">
      <div className="font-medium">Selfie scan with liveness check</div>
      {phase === "camera" || phase === "recording" ? (
        <div className="space-y-3">
          <div className="relative overflow-hidden rounded-lg bg-black">
            <video ref={videoRef} muted playsInline className="aspect-video w-full -scale-x-100 object-cover" />
            <div className="pointer-events-none absolute inset-0 m-auto aspect-[3/4] h-[78%] rounded-[50%] border-4 border-white/70" />
            {phase === "recording" && (
              <div className="absolute inset-x-0 bottom-0 bg-black/60 p-3 text-center text-white">
                <div className="text-xs uppercase tracking-wide text-white/70">
                  Prompt {idx + 1} of {CHALLENGES.length}
                </div>
                <div className="text-lg font-medium">{CHALLENGES[idx].label}</div>
              </div>
            )}
          </div>
          {phase === "camera" && (
            <Button onClick={record} className="w-full">
              <Camera /> Start 12-second scan
            </Button>
          )}
        </div>
      ) : phase === "upload-prompts" ? (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Confirm your video includes each prompt. {demoMode ? "In demo mode we trust your confirmation; in production the identity vendor checks these in the video." : "Our identity partner checks these in the video."}
          </p>
          {CHALLENGES.map((c) => (
            <Label key={c.id} className="flex items-center gap-2 font-normal">
              <Checkbox checked={confirmed.includes(c.id)} onCheckedChange={(v) => setConfirmed((xs) => (v ? [...xs, c.id] : xs.filter((x) => x !== c.id)))} />
              {c.label}
            </Label>
          ))}
          <Button onClick={finishUpload} disabled={confirmed.length < 2} className="w-full">
            Use this video
          </Button>
        </div>
      ) : (
        <>
          <p className="text-sm text-muted-foreground">Good light, face centered. We&apos;ll prompt you to turn, blink and smile, which proves it&apos;s really you and gives your twin natural motion.</p>
          {cameraError && <p className="text-sm text-destructive">{cameraError}</p>}
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button onClick={openCamera} disabled={phase === "uploading"}>
              <Camera /> Use my camera
            </Button>
            <Button asChild variant="outline" disabled={phase === "uploading"}>
              <label className="cursor-pointer">
                {phase === "uploading" ? <Loader2 className="animate-spin" /> : <FileUp />} Upload selfie video or phone scan
                <input
                  type="file"
                  accept="video/mp4,video/webm,video/quicktime,image/jpeg,image/png,image/webp"
                  className="sr-only"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) {
                      setPendingFile(f);
                      setPhase("upload-prompts");
                    }
                  }}
                />
              </label>
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

function VoiceCapture({ done, onDone }: { done: boolean; onDone: (id: string) => void }) {
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [busy, setBusy] = useState(false);
  const recRef = useRef<MediaRecorder | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  async function startRec() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mime = pickRecorderMime("audio");
      const rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      const chunks: Blob[] = [];
      rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
      rec.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunks, { type: (mime || "audio/webm").split(";")[0] });
        setPreview(URL.createObjectURL(blob));
        await save(blob, "voice-sample.webm");
      };
      recRef.current = rec;
      rec.start(500);
      setRecording(true);
      setSeconds(0);
      const t = setInterval(() => setSeconds((s) => s + 1), 1000);
      rec.addEventListener("stop", () => clearInterval(t));
    } catch {
      toast.error("We couldn't open your microphone. Upload a recording instead.");
    }
  }

  async function save(blob: Blob, name: string) {
    setBusy(true);
    try {
      onDone((await upload("voice", blob, name)).id);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <blockquote className="rounded-lg border-l-4 border-primary bg-muted/50 p-4 text-[15px] leading-relaxed">{VOICE_SCRIPT}</blockquote>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        {recording ? (
          <Button variant="destructive" onClick={() => (recRef.current?.stop(), setRecording(false))}>
            <CircleStop /> Stop ({seconds}s)
          </Button>
        ) : (
          <Button onClick={startRec} disabled={busy}>
            <Mic /> {done ? "Record again" : "Start recording"}
          </Button>
        )}
        <Button asChild variant="outline" disabled={busy || recording}>
          <label className="cursor-pointer">
            {busy ? <Loader2 className="animate-spin" /> : <Upload />} Upload a recording
            <input
              type="file"
              accept="audio/*"
              className="sr-only"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) {
                  setPreview(URL.createObjectURL(f));
                  void save(f, f.name);
                }
              }}
            />
          </label>
        </Button>
        {done && (
          <span className="flex items-center gap-1 text-sm font-medium text-success">
            <Check className="size-4" /> Voice sample saved
          </span>
        )}
      </div>
      {preview && <audio controls src={preview} className="w-full" />}
    </div>
  );
}
