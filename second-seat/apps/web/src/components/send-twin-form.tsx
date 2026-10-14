"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Send } from "lucide-react";
import { toast } from "sonner";
import { startSession } from "@/app/actions";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { money } from "@/lib/types";
import { useSafeTransition } from "@/lib/use-safe-transition";

function detect(url: string) {
  try {
    const h = new URL(url).hostname;
    if (h === "meet.google.com") return "google_meet";
    if (h.endsWith("zoom.us")) return "zoom";
    if (h.endsWith("teams.microsoft.com") || h.endsWith("teams.live.com")) return "teams";
  } catch {}
  return null;
}

const FAULTS = [
  { id: "none", label: "Everything works" },
  { id: "no_video", label: "Avatar video never arrives (20 s stop + refund)" },
  { id: "avatar_silent", label: "Avatar goes silent (retry, then stop + refund)" },
  { id: "join_fail", label: "Host never admits the twin (refund)" },
  { id: "slow_avatar", label: "Slow avatar (> 1 s, falls back to voice-only)" },
];

export function SendTwinForm({ ratePerMinuteCents, availableCents, demoMode, disabled }: { ratePerMinuteCents: number; availableCents: number | null; demoMode: boolean; disabled?: string }) {
  const router = useRouter();
  const [pending, start] = useSafeTransition();
  const [target, setTarget] = useState<"demo" | "link">("demo");
  const [url, setUrl] = useState("");
  const [mode, setMode] = useState<"full" | "voice_only" | "listen_only">("full");
  const [cap, setCap] = useState(15);
  const [fallback, setFallback] = useState(true);
  const [fault, setFault] = useState("none");
  const platform = target === "demo" ? "demo" : detect(url);
  const required = useMemo(() => Math.ceil((ratePerMinuteCents * cap * 110) / 100), [ratePerMinuteCents, cap]);
  const short = availableCents !== null && availableCents < required;

  function submit() {
    start(async () => {
      const r = await startSession({ platform: platform ?? "demo", joinUrl: target === "link" ? url : undefined, mode, voiceOnlyFallback: fallback, capMinutes: cap, demoFault: fault });
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      router.push(`/sessions/${r.data!.id}`);
    });
  }

  return (
    <div className="space-y-5">
      <Tabs value={target} onValueChange={(v) => setTarget(v as "demo" | "link")}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="demo">Demo meeting</TabsTrigger>
          <TabsTrigger value="link">Paste a meeting link</TabsTrigger>
        </TabsList>
      </Tabs>
      {target === "link" ? (
        <div className="space-y-2">
          <Label htmlFor="join-url">Google Meet, Zoom or Teams link</Label>
          <Input id="join-url" placeholder="https://meet.google.com/abc-defg-hij" value={url} onChange={(e) => setUrl(e.target.value)} inputMode="url" />
          {url && !platform && <p className="text-sm text-destructive">That doesn&apos;t look like a Meet, Zoom or Teams link.</p>}
          {platform && platform !== "demo" && (
            <p className="text-xs text-muted-foreground">
              Real platforms need their bot credentials configured (see docs/PLATFORM_APPROVALS.md). If the twin can&apos;t join, the session fails safely and is refunded.
            </p>
          )}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">A simulated meeting with four colleagues. Try asking your twin questions from the session page.</p>
      )}

      <div className="space-y-2">
        <Label>What should your twin do?</Label>
        <RadioGroup value={mode} onValueChange={(v) => setMode(v as typeof mode)} className="grid gap-2 sm:grid-cols-3">
          {[
            { v: "full", t: "Video + voice", d: "Appears and speaks" },
            { v: "voice_only", t: "Voice only", d: "No video" },
            { v: "listen_only", t: "Listen only", d: "Notes, never speaks" },
          ].map((o) => (
            <Label key={o.v} htmlFor={`mode-${o.v}`} className="flex cursor-pointer items-start gap-2 rounded-lg border p-3 has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-secondary">
              <RadioGroupItem id={`mode-${o.v}`} value={o.v} className="mt-0.5" />
              <span>
                <span className="block text-sm font-medium">{o.t}</span>
                <span className="block text-xs font-normal text-muted-foreground">{o.d}</span>
              </span>
            </Label>
          ))}
        </RadioGroup>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="cap">Session cap</Label>
          <Select value={String(cap)} onValueChange={(v) => setCap(Number(v))}>
            <SelectTrigger id="cap" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[5, 10, 15, 30, 45, 60].map((m) => (
                <SelectItem key={m} value={String(m)}>
                  {m} minutes max
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center justify-between gap-3 rounded-lg border p-3">
          <Label htmlFor="fallback" className="text-sm font-normal">
            Keep going on voice if video fails
          </Label>
          <Switch id="fallback" checked={fallback} onCheckedChange={setFallback} disabled={mode !== "full"} />
        </div>
      </div>

      {demoMode && target === "demo" && (
        <div className="space-y-2">
          <Label htmlFor="fault">Safeguard test (demo only)</Label>
          <Select value={fault} onValueChange={setFault}>
            <SelectTrigger id="fault" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {FAULTS.map((f) => (
                <SelectItem key={f.id} value={f.id}>
                  {f.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <Alert variant={short ? "destructive" : "default"}>
        <AlertDescription>
          {short ? (
            <>Not enough balance. A {cap}-minute session needs {money(required)} available ({money(ratePerMinuteCents)}/min plus a 10% buffer). You have {money(availableCents ?? 0)}.</>
          ) : (
            <>
              Quote: up to <strong>{money(ratePerMinuteCents * cap)}</strong> ({cap} min × {money(ratePerMinuteCents)}). Billing starts only when the first video and audio frames arrive. Failed sessions and sessions under 30 seconds are refunded automatically.
            </>
          )}
        </AlertDescription>
      </Alert>

      {disabled && <p className="text-sm text-destructive">{disabled}</p>}
      <Button className="w-full" size="lg" onClick={submit} disabled={pending || !!disabled || short || (target === "link" && !platform)}>
        {pending ? <Loader2 className="animate-spin" /> : <Send />}
        Send my twin
      </Button>
    </div>
  );
}
