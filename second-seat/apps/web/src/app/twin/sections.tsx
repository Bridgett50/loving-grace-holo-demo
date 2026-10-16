"use client";

import { useState } from "react";
import { Check, FileText, Loader2, OctagonX, Plus, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import type { BackgroundOption, ConsentScope, Persona } from "@second-seat/core";
import { addCustomBackground, addKnowledge, deleteKnowledge, deleteTwinAndMedia, killSwitch, resignConsent, revokeConsent, setBackground, setLook, updatePersona } from "@/app/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { referenceFrameFromFile, upload } from "@/lib/media";
import { cn } from "@/lib/utils";
import { useSafeTransition } from "@/lib/use-safe-transition";

function useAction() {
  const [pending, start] = useSafeTransition();
  const run = (fn: () => Promise<{ ok: boolean; error?: string }>, success?: string) =>
    start(async () => {
      const r = await fn();
      if (!r.ok) toast.error(r.error);
      else if (success) toast.success(success);
    });
  return [pending, run] as const;
}

export function LookSwitcher({ look, hasReference }: { look: "realistic" | "stylized"; hasReference: boolean }) {
  const [pending, run] = useAction();
  const [busy, setBusy] = useState(false);
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="inline-flex rounded-lg border p-1" role="radiogroup" aria-label="Twin look">
        {(["realistic", "stylized"] as const).map((l) => (
          <button
            key={l}
            role="radio"
            aria-checked={look === l}
            disabled={pending || (l === "realistic" && !hasReference)}
            onClick={() => run(() => setLook(l), `Switched to ${l === "realistic" ? "realistic" : "stylized 3D"}`)}
            className={cn("rounded-md px-3 py-1.5 text-sm font-medium transition disabled:opacity-50", look === l ? "bg-primary text-primary-foreground" : "hover:bg-muted")}
          >
            {l === "realistic" ? "Realistic" : "Stylized 3D"}
          </button>
        ))}
      </div>
      {!hasReference && (
        <Button asChild variant="outline" size="sm" disabled={busy}>
          <label className="cursor-pointer">
            {busy ? <Loader2 className="animate-spin" /> : <Upload />} Add a face photo for realistic
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,video/mp4,video/webm"
              className="sr-only"
              onChange={async (e) => {
                const f = e.target.files?.[0];
                if (!f) return;
                setBusy(true);
                try {
                  const ref = await upload("reference", await referenceFrameFromFile(f), "reference.jpg");
                  const r = await setLook("realistic", ref.id);
                  if (!r.ok) toast.error(r.error);
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

export function BackgroundPicker({ backgrounds, selected }: { backgrounds: BackgroundOption[]; selected: string }) {
  const [pending, run] = useAction();
  const [busy, setBusy] = useState(false);
  return (
    <div className="grid grid-cols-3 gap-3">
      {backgrounds.map((b) => (
        <button
          key={b.id}
          onClick={() => run(() => setBackground(b.id))}
          disabled={pending}
          aria-pressed={selected === b.id}
          className={cn("group relative aspect-video overflow-hidden rounded-lg border-2 text-left", selected === b.id ? "border-primary ring-2 ring-primary/20" : "border-transparent")}
          style={{ background: b.css }}
        >
          <span className="absolute inset-x-0 bottom-0 truncate bg-black/50 px-1.5 py-0.5 text-[11px] text-white">{b.name}</span>
          {selected === b.id && <Check className="absolute right-1 top-1 size-4 rounded-full bg-primary p-0.5 text-primary-foreground" />}
        </button>
      ))}
      <label className="flex aspect-video cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed text-xs text-muted-foreground hover:bg-muted">
        {busy ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
        Upload
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="sr-only"
          onChange={async (e) => {
            const f = e.target.files?.[0];
            if (!f) return;
            setBusy(true);
            try {
              const a = await upload("background", f, f.name);
              const r = await addCustomBackground(a.id, f.name.replace(/\.[^.]+$/, ""));
              if (!r.ok) toast.error(r.error);
              else toast.success("Background added");
            } catch (err) {
              toast.error((err as Error).message);
            } finally {
              setBusy(false);
            }
          }}
        />
      </label>
    </div>
  );
}

export function PersonaForm({ persona }: { persona: Persona }) {
  const [pending, run] = useAction();
  const [role, setRole] = useState(persona.role);
  const [tone, setTone] = useState(persona.tone);
  const [restricted, setRestricted] = useState(persona.restrictedTopics.join(", "));
  const [deferral, setDeferral] = useState(persona.deferralPhrase);
  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        run(() => updatePersona({ role, tone, deferralPhrase: deferral, restrictedTopics: restricted.split(",") }), "Saved");
      }}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="role">Role</Label>
          <Input id="role" value={role} onChange={(e) => setRole(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="tone">Tone</Label>
          <Input id="tone" value={tone} onChange={(e) => setTone(e.target.value)} />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="restricted">Topics to decline (comma separated)</Label>
        <Input id="restricted" value={restricted} onChange={(e) => setRestricted(e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="deferral">When it doesn&apos;t know, it says</Label>
        <Textarea id="deferral" value={deferral} onChange={(e) => setDeferral(e.target.value)} rows={2} />
      </div>
      <p className="text-xs text-muted-foreground">Always on, can&apos;t be turned off: contract, payment, price and signature capabilities are forbidden in code; commitment asks are refused and flagged for the owner; always says it&apos;s an AI twin.</p>
      <Button type="submit" disabled={pending}>
        {pending && <Loader2 className="animate-spin" />} Save
      </Button>
    </form>
  );
}

export function KnowledgePanel({ docs }: { docs: Array<{ id: string; title: string; chars: number; createdAt: string }> }) {
  const [pending, run] = useAction();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  return (
    <div className="space-y-4">
      <ul className="divide-y rounded-lg border">
        {docs.length === 0 && <li className="p-3 text-sm text-muted-foreground">No notes yet. Your twin will defer every question to you.</li>}
        {docs.map((d) => (
          <li key={d.id} className="flex items-center gap-3 p-3 text-sm">
            <FileText className="size-4 shrink-0 text-muted-foreground" />
            <div className="min-w-0 flex-1">
              <div className="truncate font-medium">{d.title}</div>
              <div className="text-xs text-muted-foreground">{d.chars.toLocaleString()} characters</div>
            </div>
            <Button variant="ghost" size="icon" aria-label={`Delete ${d.title}`} onClick={() => run(() => deleteKnowledge(d.id))} disabled={pending}>
              <Trash2 />
            </Button>
          </li>
        ))}
      </ul>
      <form
        className="space-y-2"
        onSubmit={(e) => {
          e.preventDefault();
          run(async () => {
            const r = await addKnowledge({ title, content });
            if (r.ok) {
              setTitle("");
              setContent("");
            }
            return r;
          }, "Note added");
        }}
      >
        <Input placeholder="Title, e.g. Q4 roadmap" value={title} onChange={(e) => setTitle(e.target.value)} aria-label="Note title" />
        <Textarea placeholder="Paste notes, FAQs, project status…" value={content} onChange={(e) => setContent(e.target.value)} rows={4} aria-label="Note content" />
        <div className="flex flex-wrap gap-2">
          <Button type="submit" disabled={pending || content.trim().length < 10}>
            Add note
          </Button>
          <Button asChild variant="outline">
            <label className="cursor-pointer">
              <Upload /> Upload .txt / .md
              <input
                type="file"
                accept=".txt,.md,.markdown,.csv,text/plain,text/markdown"
                className="sr-only"
                onChange={async (e) => {
                  const f = e.target.files?.[0];
                  if (!f) return;
                  if (f.size > 2e6) return toast.error("Files up to 2 MB.");
                  const text = await f.text();
                  run(() => addKnowledge({ title: f.name.replace(/\.[^.]+$/, ""), content: text }), `Added ${f.name}`);
                }}
              />
            </label>
          </Button>
        </div>
      </form>
    </div>
  );
}

const ALL_SCOPES: ConsentScope[] = ["likeness_video", "voice_clone", "meeting_join", "recording", "knowledge_use"];

export function ConsentVault({
  userName,
  consentPreview,
  records,
}: {
  userName: string;
  consentPreview: string;
  records: Array<{ id: string; signerName: string; scopes: string[]; signedAt: string; revokedAt?: string; revocationReason?: string; textHash: string }>;
}) {
  const [pending, run] = useAction();
  const [sig, setSig] = useState("");
  const active = records.find((r) => !r.revokedAt);
  return (
    <div className="space-y-4">
      <ul className="space-y-2">
        {records.map((r) => (
          <li key={r.id} className="rounded-lg border p-3 text-sm">
            <div className="flex items-center justify-between gap-2">
              <span className="font-medium">Signed by {r.signerName}</span>
              {r.revokedAt ? <Badge variant="outline">Revoked</Badge> : <Badge className="bg-success text-white">Active</Badge>}
            </div>
            <div className="text-muted-foreground">
              {new Date(r.signedAt).toLocaleString()}
              {r.revokedAt && ` · revoked ${new Date(r.revokedAt).toLocaleString()} (${r.revocationReason})`}
            </div>
            <div className="mt-1 flex flex-wrap gap-1">
              {r.scopes.map((s) => (
                <Badge key={s} variant="secondary" className="font-normal">
                  {s.replace(/_/g, " ")}
                </Badge>
              ))}
            </div>
            <div className="mt-1 truncate font-mono text-[10px] text-muted-foreground" title={r.textHash}>
              text sha256 {r.textHash}
            </div>
          </li>
        ))}
      </ul>
      {active ? (
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="outline" className="w-full border-destructive/40 text-destructive hover:bg-destructive/10">
              Revoke consent
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Revoke consent?</DialogTitle>
              <DialogDescription>Your twin leaves any meeting it&apos;s in right now (refunded), auto-join turns off, and it can&apos;t run again until you sign a new consent.</DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline">Cancel</Button>
              </DialogClose>
              <DialogClose asChild>
                <Button variant="destructive" onClick={() => run(() => revokeConsent("owner_request"), "Consent revoked. Your twin is stopped.")}>
                  Revoke
                </Button>
              </DialogClose>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      ) : (
        <form
          className="space-y-2 rounded-lg border p-3"
          onSubmit={(e) => {
            e.preventDefault();
            run(() => resignConsent({ signerName: sig, scopes: ALL_SCOPES }), "Consent signed");
          }}
        >
          <div className="text-sm font-medium">Sign a new consent to re-enable your twin</div>
          <pre className="max-h-32 overflow-auto whitespace-pre-wrap rounded bg-muted/50 p-2 font-sans text-xs">{consentPreview}</pre>
          <Input value={sig} onChange={(e) => setSig(e.target.value)} placeholder={`Type "${userName}" to sign`} aria-label="Signature" />
          <Button type="submit" disabled={pending || sig.trim().toLowerCase() !== userName.toLowerCase()}>
            Sign
          </Button>
        </form>
      )}
    </div>
  );
}

export function DangerZone() {
  const [pending, run] = useAction();
  return (
    <div className="space-y-2 rounded-lg border border-destructive/30 p-3">
      <div className="font-medium">Danger zone</div>
      <div className="flex flex-wrap gap-2">
        <Button
          variant="destructive"
          size="sm"
          disabled={pending}
          onClick={() =>
            run(async () => {
              const r = await killSwitch();
              if (r.ok) toast.success(`Kill switch: stopped ${r.data?.stopped ?? 0} session(s), auto-join off`);
              return r;
            })
          }
        >
          <OctagonX /> Kill switch
        </Button>
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" className="text-destructive">
              <Trash2 /> Delete twin & all media
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete your twin permanently?</DialogTitle>
              <DialogDescription>We erase your scan, voice sample, reference frames, ID images, backgrounds and notes, and revoke your consent. This can&apos;t be undone.</DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline">Cancel</Button>
              </DialogClose>
              <Button variant="destructive" onClick={() => run(async () => (await deleteTwinAndMedia(), { ok: true }))}>
                Delete everything
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
