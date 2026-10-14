"use client";

import { useState } from "react";
import { Loader2, RotateCcw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { JoinMode, JoinRule, Platform } from "@second-seat/core";
import { addRule, deleteRule, resetDemoCalendar, setAutoJoin, setEventOverride } from "@/app/actions";
import { MODE_LABEL, PLATFORM_LABEL } from "@/components/status-pills";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useSafeTransition } from "@/lib/use-safe-transition";

export function AutoJoinToggle({ on, disabled }: { on: boolean; disabled?: boolean }) {
  const [pending, start] = useSafeTransition();
  return (
    <Label className="flex items-center gap-3 rounded-lg border px-4 py-2.5">
      <span className="text-sm font-medium">Calendar auto-join</span>
      <Switch
        checked={on}
        disabled={pending || disabled}
        onCheckedChange={(v) =>
          start(async () => {
            const r = await setAutoJoin(v);
            if (!r.ok) toast.error(r.error);
          })
        }
      />
    </Label>
  );
}

export function EventModeSelect({ eventId, value }: { eventId: string; value: JoinMode | "rule" }) {
  const [pending, start] = useSafeTransition();
  return (
    <Select value={value} disabled={pending} onValueChange={(v) => start(async () => void (await setEventOverride(eventId, v as JoinMode | "rule")))}>
      <SelectTrigger className="w-40" aria-label="Twin behavior for this meeting">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="rule">Follow rules</SelectItem>
        <SelectItem value="join">{MODE_LABEL.join}</SelectItem>
        <SelectItem value="listen">{MODE_LABEL.listen}</SelectItem>
        <SelectItem value="skip">{MODE_LABEL.skip}</SelectItem>
      </SelectContent>
    </Select>
  );
}

export function ResetCalendar() {
  const [pending, start] = useSafeTransition();
  return (
    <Button variant="ghost" size="sm" disabled={pending} onClick={() => start(async () => void (await resetDemoCalendar()))}>
      {pending ? <Loader2 className="animate-spin" /> : <RotateCcw />} Reset demo calendar
    </Button>
  );
}

export function RuleList({ rules }: { rules: JoinRule[] }) {
  const [pending, start] = useSafeTransition();
  if (!rules.length) return <p className="text-sm text-muted-foreground">No rules yet, so every meeting is skipped unless you set it individually.</p>;
  return (
    <ul className="space-y-2">
      {[...rules]
        .sort((a, b) => b.priority - a.priority)
        .map((r) => (
          <li key={r.id} className="flex items-start gap-3 rounded-lg border p-3">
            <div className="min-w-0 flex-1 text-sm">
              <div className="flex items-center gap-2 font-medium">
                {r.name}
                <Badge variant={r.mode === "skip" ? "outline" : "secondary"}>{MODE_LABEL[r.mode]}</Badge>
              </div>
              <div className="text-xs text-muted-foreground">
                {[
                  r.titleKeywords?.length && `title has ${r.titleKeywords.map((k) => `“${k}”`).join(" or ")}`,
                  r.organizerDomains?.length && `organizer @${r.organizerDomains.join(", @")}`,
                  r.minAttendees !== undefined && `≥ ${r.minAttendees} attendees`,
                  r.maxAttendees !== undefined && `≤ ${r.maxAttendees} attendees`,
                  r.platforms?.length && r.platforms.map((p) => PLATFORM_LABEL[p]).join("/"),
                  `priority ${r.priority}`,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </div>
            </div>
            <Button variant="ghost" size="icon" aria-label={`Delete rule ${r.name}`} disabled={pending} onClick={() => start(async () => void (await deleteRule(r.id)))}>
              <Trash2 />
            </Button>
          </li>
        ))}
    </ul>
  );
}

export function RuleEditor() {
  const [pending, start] = useSafeTransition();
  const [name, setName] = useState("");
  const [mode, setMode] = useState<JoinMode>("join");
  const [keywords, setKeywords] = useState("");
  const [domains, setDomains] = useState("");
  const [maxAttendees, setMax] = useState("");
  const [platform, setPlatform] = useState<Platform | "any">("any");
  const [priority, setPriority] = useState("1");
  const list = (s: string) => s.split(",").map((x) => x.trim().replace(/^@/, "")).filter(Boolean);

  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const r = await addRule({
            name,
            mode,
            titleKeywords: list(keywords),
            organizerDomains: list(domains),
            maxAttendees: maxAttendees ? Number(maxAttendees) : undefined,
            platforms: platform === "any" ? undefined : [platform],
            priority: Number(priority) || 1,
          });
          if (!r.ok) toast.error(r.error);
          else {
            setName("");
            setKeywords("");
            setDomains("");
            setMax("");
            toast.success("Rule added");
          }
        });
      }}
    >
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2 space-y-1.5">
          <Label htmlFor="rule-name">Name</Label>
          <Input id="rule-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Client calls: listen only" />
        </div>
        <div className="space-y-1.5">
          <Label>Twin should</Label>
          <Select value={mode} onValueChange={(v) => setMode(v as JoinMode)}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="join">{MODE_LABEL.join}</SelectItem>
              <SelectItem value="listen">{MODE_LABEL.listen}</SelectItem>
              <SelectItem value="skip">{MODE_LABEL.skip}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Platform</Label>
          <Select value={platform} onValueChange={(v) => setPlatform(v as Platform | "any")}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="any">Any</SelectItem>
              <SelectItem value="google_meet">Google Meet</SelectItem>
              <SelectItem value="zoom">Zoom</SelectItem>
              <SelectItem value="teams">Teams</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="kw">Title keywords</Label>
          <Input id="kw" value={keywords} onChange={(e) => setKeywords(e.target.value)} placeholder="review, sync" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="dom">Organizer domains</Label>
          <Input id="dom" value={domains} onChange={(e) => setDomains(e.target.value)} placeholder="client.com" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="max">Max attendees</Label>
          <Input id="max" inputMode="numeric" value={maxAttendees} onChange={(e) => setMax(e.target.value.replace(/\D/g, ""))} placeholder="Any" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="prio">Priority</Label>
          <Input id="prio" inputMode="numeric" value={priority} onChange={(e) => setPriority(e.target.value.replace(/\D/g, ""))} />
        </div>
      </div>
      <Button type="submit" disabled={pending} className="w-full">
        {pending && <Loader2 className="animate-spin" />} Add rule
      </Button>
    </form>
  );
}
