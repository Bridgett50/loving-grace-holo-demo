import Link from "next/link";
import { redirect } from "next/navigation";
import { AutoJoinToggle, EventModeSelect, ResetCalendar, RuleEditor, RuleList } from "./controls";
import { MODE_LABEL, PLATFORM_LABEL } from "@/components/status-pills";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { loadOwner } from "@/lib/server/view-model";

export const dynamic = "force-dynamic";

export default async function MeetingsPage() {
  const o = await loadOwner();
  if (!o.twin) redirect("/onboarding");
  const google = o.connections.google;
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Meetings</h1>
          <p className="text-muted-foreground">Your twin checks your calendar and follows your rules for each meeting.</p>
        </div>
        <AutoJoinToggle on={o.autoJoin} disabled={!o.consentActive} />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <Card>
          <CardHeader className="flex-row flex-wrap items-start justify-between gap-2">
            <div>
              <CardTitle>Upcoming</CardTitle>
              <CardDescription>
                {google ? `Calendar: ${google.mode === "demo" ? "demo calendar" : google.account}` : "Showing your demo calendar."}{" "}
                {!google && (
                  <Link href="/connections" className="underline">
                    Connect Google Calendar
                  </Link>
                )}
              </CardDescription>
            </div>
            <ResetCalendar />
          </CardHeader>
          <CardContent className="divide-y">
            {o.events.length === 0 && <p className="py-6 text-center text-sm text-muted-foreground">No upcoming meetings. Reset the demo calendar to add some.</p>}
            {o.events.map(({ event, mode, because, launchedSessionId, startsSoon: soon }) => {
              const starts = new Date(event.startsAt);
              return (
                <div key={event.id} className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center">
                  <div className="w-24 shrink-0 text-sm">
                    <div className="font-medium">{starts.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</div>
                    <div className="text-xs text-muted-foreground">{starts.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" })}</div>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate font-medium">{event.title}</span>
                      {soon && o.autoJoin && mode !== "skip" && !launchedSessionId && <Badge className="bg-warning text-foreground">Auto-joining soon</Badge>}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {PLATFORM_LABEL[event.platform]} · {event.attendeeEmails.length} attendee{event.attendeeEmails.length === 1 ? "" : "s"} · {MODE_LABEL[mode]} ({because})
                    </div>
                  </div>
                  {launchedSessionId ? (
                    <Button asChild size="sm" variant="secondary">
                      <Link href={`/sessions/${launchedSessionId}`}>Open session</Link>
                    </Button>
                  ) : (
                    <EventModeSelect eventId={event.id} value={event.modeOverride ?? "rule"} />
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Rules</CardTitle>
              <CardDescription>Highest priority match wins. Meetings that match no rule are skipped.</CardDescription>
            </CardHeader>
            <CardContent>
              <RuleList rules={o.rules} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Add a rule</CardTitle>
            </CardHeader>
            <CardContent>
              <RuleEditor />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
