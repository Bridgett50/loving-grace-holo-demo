import Link from "next/link";
import { redirect } from "next/navigation";
import { FileText, MessagesSquare, Search, Sparkles } from "lucide-react";
import { recall } from "@second-seat/core";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { loadBotData, loadOwner, pastMeetings } from "@/lib/server/view-model";

export const dynamic = "force-dynamic";

const EXAMPLES = ["When is the hardware budget due?", "Who leads the voice pipeline?", "What did we decide about the design review?", "When does the kiosk launch?"];

export default async function AskPage({ searchParams }: PageProps<"/ask">) {
  const o = await loadOwner();
  if (!o.twin) redirect("/onboarding");
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.trim().slice(0, 300) : "";
  const bot = await loadBotData(o.uid);
  const meetings = pastMeetings(bot.sessions);
  const result = q ? recall(q, { knowledge: o.knowledge, meetings }) : null;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Ask your meetings</h1>
        <p className="text-muted-foreground">
          Search everything your twin heard and everything in your notes. Every answer links to who said it and where. {meetings.length} meeting{meetings.length === 1 ? "" : "s"} and {o.knowledge.length} note{o.knowledge.length === 1 ? "" : "s"} searchable.
        </p>
      </div>

      <form action="/ask" className="flex gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input name="q" defaultValue={q} placeholder="What did Jordan promise to send?" className="h-11 pl-9" aria-label="Ask a question" autoFocus />
        </div>
        <Button type="submit" size="lg" className="h-11">
          <Sparkles /> Ask
        </Button>
      </form>

      {!q && (
        <div className="flex flex-wrap gap-2">
          {EXAMPLES.map((e) => (
            <Button key={e} asChild variant="outline" size="sm">
              <Link href={`/ask?q=${encodeURIComponent(e)}`}>{e}</Link>
            </Button>
          ))}
        </div>
      )}

      {bot.error && <p className="text-sm text-destructive">Couldn&apos;t load meeting history ({bot.error}). Searching notes only.</p>}

      {result && (
        <Card className={result.confident ? "border-primary/40" : undefined}>
          <CardHeader>
            <CardDescription>{result.confident ? "Best match" : result.citations.length ? "Closest match. Double-check the source" : "No match"}</CardDescription>
            <CardTitle className="text-lg leading-snug">{result.answer}</CardTitle>
          </CardHeader>
          {result.citations.length > 0 && (
            <CardContent className="space-y-2">
              <div className="text-sm font-medium">Sources</div>
              <ul className="space-y-2">
                {result.citations.map((c, i) => (
                  <li key={i} className="flex gap-3 rounded-lg border p-3 text-sm">
                    {c.kind === "meeting" ? <MessagesSquare className="mt-0.5 size-4 shrink-0 text-primary" /> : <FileText className="mt-0.5 size-4 shrink-0 text-primary" />}
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        <Badge variant="secondary">{c.kind === "meeting" ? "Meeting" : "Note"}</Badge>
                        {c.sessionId ? (
                          <Link href={`/sessions/${c.sessionId}`} className="underline">
                            {c.title}
                          </Link>
                        ) : (
                          <span>{c.title}</span>
                        )}
                        {c.speaker && <span>· {c.speaker}</span>}
                        {c.at && <span>· {new Date(c.at).toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</span>}
                      </div>
                      <p className="mt-1">{c.text}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </CardContent>
          )}
          {!result.citations.length && (
            <CardContent className="text-sm text-muted-foreground">
              Try different words, or{" "}
              <Link href="/twin" className="underline">
                add notes
              </Link>{" "}
              so your twin knows it next time.
            </CardContent>
          )}
        </Card>
      )}
    </div>
  );
}
