"use client";

import Link from "next/link";
import { BookOpenCheck, CircleAlert, History, ShieldCheck, Sparkles, Users } from "lucide-react";
import type { MeetingBrief } from "@second-seat/core";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

function Section({ icon: Icon, title, children }: { icon: React.ComponentType<{ className?: string }>; title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-1.5">
      <h3 className="flex items-center gap-1.5 text-sm font-medium">
        <Icon className="size-4 text-primary" /> {title}
      </h3>
      <div className="text-sm text-muted-foreground">{children}</div>
    </section>
  );
}

export function BriefDialog({ title, brief }: { title: string; brief: MeetingBrief }) {
  const tone = brief.readiness.label === "Ready" ? "bg-success text-white" : brief.readiness.label === "Mostly ready" ? "bg-warning text-foreground" : "bg-destructive text-white";
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <Sparkles /> Brief
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Your twin&apos;s brief: {title}</DialogTitle>
          <DialogDescription>Prepared from your notes and past meetings. This is what your twin walks in knowing.</DialogDescription>
        </DialogHeader>

        <div className="space-y-2 rounded-lg border p-3">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">Readiness</span>
            <Badge className={tone}>
              {brief.readiness.label} · {brief.readiness.score}
            </Badge>
          </div>
          <Progress value={brief.readiness.score} />
          {brief.readiness.tips.length > 0 && (
            <ul className="list-disc space-y-0.5 pl-5 text-xs text-muted-foreground">
              {brief.readiness.tips.map((t) => (
                <li key={t}>{t}</li>
              ))}
            </ul>
          )}
        </div>

        <div className="space-y-4">
          {brief.attendees.length > 0 && (
            <Section icon={Users} title="Who's there">
              {brief.attendees.join(", ")}
            </Section>
          )}
          <Section icon={BookOpenCheck} title="What it can answer">
            {brief.knows.length ? (
              <ul className="space-y-1.5">
                {brief.knows.map((k, i) => (
                  <li key={i} className="rounded-md bg-muted/60 px-2.5 py-1.5">
                    <span className="text-foreground">{k.text}</span>
                    <span className="block text-xs">from &ldquo;{k.title}&rdquo;</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p>
                Nothing in your notes matches this meeting yet.{" "}
                <Link href="/twin" className="underline">
                  Add notes
                </Link>
              </p>
            )}
          </Section>
          {brief.lastTime && (
            <Section icon={History} title="Last time">
              <p>
                <Link href={`/sessions/${brief.lastTime.sessionId}`} className="underline">
                  {brief.lastTime.title}
                </Link>{" "}
                · {new Date(brief.lastTime.at).toLocaleDateString([], { month: "short", day: "numeric" })}
              </p>
              {brief.lastTime.decisions.length > 0 && (
                <ul className="mt-1 list-disc pl-5">
                  {brief.lastTime.decisions.map((d) => (
                    <li key={d}>{d}</li>
                  ))}
                </ul>
              )}
              {brief.lastTime.openItems.length > 0 && (
                <ul className="mt-1 space-y-0.5">
                  {brief.lastTime.openItems.map((a, i) => (
                    <li key={i}>
                      <span className="text-foreground">{a.owner}:</span> {a.text}
                      {a.due && ` (due ${a.due})`}
                    </li>
                  ))}
                </ul>
              )}
            </Section>
          )}
          {brief.openFollowUps.length > 0 && (
            <Section icon={CircleAlert} title="You promised to follow up">
              <ul className="list-disc pl-5">
                {brief.openFollowUps.map((f) => (
                  <li key={f}>{f.replace(/^Follow up with /, "")}</li>
                ))}
              </ul>
            </Section>
          )}
          <Section icon={ShieldCheck} title="What it will hand to you">
            <ul className={cn("list-disc space-y-0.5 pl-5")}>
              {brief.willDefer.map((w) => (
                <li key={w}>{w}</li>
              ))}
            </ul>
          </Section>
        </div>
      </DialogContent>
    </Dialog>
  );
}
