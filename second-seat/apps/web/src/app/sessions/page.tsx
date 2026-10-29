import Link from "next/link";
import { Radio } from "lucide-react";
import { PLATFORM_LABEL, SessionStateBadge } from "@/components/status-pills";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { currentUserId } from "@/lib/server/current-user";
import { loadBotData } from "@/lib/server/view-model";
import { money } from "@/lib/types";

export const dynamic = "force-dynamic";

const REASON: Record<string, string> = {
  no_video_timeout: "No video in 20 s",
  avatar_silent: "Avatar went silent",
  join_failed: "Couldn't join",
  preflight_blocked: "Blocked by pre-flight",
  cap_reached: "Hit minute cap",
  kill_switch: "Kill switch",
  consent_revoked: "Consent revoked",
  meeting_ended: "Meeting ended",
  owner_ended: "You ended it",
};

export default async function SessionsPage() {
  const { sessions, error } = await loadBotData(await currentUserId());
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Sessions</h1>
          <p className="text-muted-foreground">Every meeting your twin attended, with notes, receipts and refunds.</p>
        </div>
        <Button asChild variant="outline">
          <Link href="/meeting-room">Open the twin meeting room</Link>
        </Button>
      </div>
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      {sessions && sessions.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-14 text-center">
            <Radio className="size-8 text-muted-foreground" />
            <p className="text-muted-foreground">No sessions yet.</p>
            <Button asChild>
              <Link href="/">Send your twin to a demo meeting</Link>
            </Button>
          </CardContent>
        </Card>
      )}
      <div className="grid gap-3">
        {sessions?.map((s) => (
          <Link key={s.id} href={`/sessions/${s.id}`}>
            <Card className="transition hover:shadow-md">
              <CardHeader className="flex-row flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <CardTitle className="truncate text-base">{s.meeting.title}</CardTitle>
                  <CardDescription>
                    {new Date(s.createdAt).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })} · {PLATFORM_LABEL[s.meeting.platform]} · {s.safeguards.liveSeconds}s live
                    {s.endReason && ` · ${REASON[s.endReason] ?? s.endReason}`}
                  </CardDescription>
                </div>
                <div className="flex items-center gap-3">
                  {s.settlement && (
                    <span className="text-right text-sm tabular-nums">
                      {money(s.settlement.chargedCents)}
                      {s.settlement.refundedCents > 0 && <span className="block text-xs text-success">{money(s.settlement.refundedCents)} refunded</span>}
                    </span>
                  )}
                  <SessionStateBadge state={s.state} />
                </div>
              </CardHeader>
              {s.summary && s.summary.actionItems.length > 0 && (
                <CardContent className="pt-0 text-sm text-muted-foreground">
                  {s.summary.actionItems.length} action item{s.summary.actionItems.length === 1 ? "" : "s"}
                  {s.summary.flaggedForOwner.length > 0 && ` · ${s.summary.flaggedForOwner.length} need${s.summary.flaggedForOwner.length === 1 ? "s" : ""} you`}
                </CardContent>
              )}
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
