import { redirect } from "next/navigation";
import { Ban } from "lucide-react";
import { SKILLS } from "@second-seat/core";
import { SkillToggle } from "./skill-toggle";
import { Badge } from "@/components/ui/badge";
import { Card, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { loadOwner } from "@/lib/server/view-model";

export const dynamic = "force-dynamic";

const CATEGORY: Record<string, string> = { meetings: "Meetings", communication: "Communication", knowledge: "Knowledge", accessibility: "Accessibility" };
const NEEDS: Record<string, string> = { "follow-up-email": "google", "slack-recap": "slack", "sms-alert": "sms", "social-digest": "x" };

export default async function SkillsPage() {
  const o = await loadOwner();
  if (!o.twin) redirect("/onboarding");
  const installed = new Set(o.twin.installedSkillIds);
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Skills</h1>
        <p className="text-muted-foreground">Add abilities to your twin. Each skill shows exactly what it can access.</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {SKILLS.map((s) => {
          const need = NEEDS[s.id];
          const missing = need && !o.connections[need as keyof typeof o.connections];
          return (
            <Card key={s.id} className={s.forbidden ? "border-dashed bg-muted/40" : undefined}>
              <CardHeader>
                <div className="flex items-center justify-between gap-2">
                  <Badge variant="outline">{CATEGORY[s.category]}</Badge>
                  {s.forbidden && <Ban className="size-4 text-destructive" />}
                </div>
                <CardTitle className="text-base">{s.name}</CardTitle>
                <CardDescription>{s.description}</CardDescription>
                <div className="flex flex-wrap gap-1 pt-1">
                  {s.permissions.map((p) => (
                    <code key={p} className="rounded bg-muted px-1.5 py-0.5 text-[11px]">
                      {p}
                    </code>
                  ))}
                </div>
              </CardHeader>
              <CardFooter className="mt-auto justify-between gap-2">
                {s.forbidden ? (
                  <span className="text-sm text-muted-foreground">Never available</span>
                ) : (
                  <>
                    <span className="text-xs text-muted-foreground">{missing ? `Needs the ${need === "x" ? "X" : need} connection` : installed.has(s.id) ? "Installed" : ""}</span>
                    <SkillToggle id={s.id} installed={installed.has(s.id)} />
                  </>
                )}
              </CardFooter>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
