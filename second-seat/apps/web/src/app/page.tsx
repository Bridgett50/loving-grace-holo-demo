import Link from "next/link";
import { ArrowRight, BadgeCheck, CalendarClock, FileSignature, Hand, Mic, ShieldCheck, Sparkles, Video } from "lucide-react";
import { badgeLabel } from "@second-seat/core";
import { InstantDemoButton } from "@/components/instant-demo-button";
import { SendTwinForm } from "@/components/send-twin-form";
import { Check, MODE_LABEL, PLATFORM_LABEL, SessionStateBadge } from "@/components/status-pills";
import { TwinStage } from "@/components/twin-avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { WalletCard } from "@/components/wallet-card";
import { PASTEL_STAGE_CSS } from "@/lib/samples";
import { bot } from "@/lib/server/bot";
import { isDemoMode } from "@/lib/server/current-user";
import { CREDIT_PACKS, getCheckout, paidCredit, paymentsEnabled } from "@/lib/server/stripe";
import { loadBotData, loadOwner } from "@/lib/server/view-model";
import { money } from "@/lib/types";
import { BRAND } from "@/lib/brand";

export const dynamic = "force-dynamic";

function Landing({ demo }: { demo: boolean }) {
  const features = [
    { icon: Video, title: "One-tap twin", body: "A short selfie video and a voice sample. Choose a realistic look animated from your own footage, or a polished stylized 3D character." },
    { icon: CalendarClock, title: "Joins for you", body: "Google Meet, Zoom and Teams, from your calendar. Set each meeting to join, listen only, or skip." },
    { icon: Mic, title: "Your voice, your notes", body: "Speaks in your consented voice clone and answers only from what you've uploaded. Otherwise it says it'll check with you." },
    { icon: Hand, title: "Take over anytime", body: "Coach it with whispered guidance, or take the seat back live in one tap." },
  ];
  const safety = [
    "ID and liveness check before a twin is created",
    "Consent vault with one-tap revocation",
    '"AI Twin of [you]" badge, spoken intro and recording notice',
    "Content Credentials (C2PA) and watermark on everything it outputs",
    "Never agrees to contracts or payments",
    "Balance check, 20-second no-video stop, minute caps and automatic refunds",
  ];
  return (
    <div className="space-y-16">
      <section className="grid items-center gap-10 lg:grid-cols-2">
        <div className="space-y-6">
          <Badge variant="secondary">AI meeting twin · always disclosed</Badge>
          <h1 className="text-4xl font-semibold tracking-tight text-balance sm:text-5xl">Your twin takes the second seat, so you don&apos;t have to be in every meeting.</h1>
          <p className="max-w-xl text-lg text-muted-foreground">
            {BRAND.name} joins your meetings as a clearly labeled AI twin. It looks and sounds like you, answers from your notes, and hands you a transcript, notes and action items afterwards.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button asChild size="lg">
              <Link href="/onboarding">
                Create my twin <ArrowRight />
              </Link>
            </Button>
            {demo && <InstantDemoButton />}
            <Button asChild size="lg" variant="ghost">
              <Link href="#safety">How we keep it safe</Link>
            </Button>
          </div>
          {demo && <p className="text-sm text-muted-foreground">Demo mode: &ldquo;Watch a live demo&rdquo; skips the scan with a sample stylized twin and opens a scripted meeting.</p>}
        </div>
        <TwinStage look="stylized" backgroundCss={PASTEL_STAGE_CSS} badge="AI Twin of Bridgett" speaking className="shadow-2xl ring-1 ring-black/10" />
      </section>
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {features.map(({ icon: Icon, title, body }) => (
          <Card key={title}>
            <CardHeader>
              <Icon className="size-5 text-primary" />
              <CardTitle className="text-base">{title}</CardTitle>
              <CardDescription>{body}</CardDescription>
            </CardHeader>
          </Card>
        ))}
      </section>
      <section id="safety" className="grid gap-8 rounded-2xl border bg-card p-8 lg:grid-cols-[1fr_1.4fr]">
        <div className="space-y-3">
          <ShieldCheck className="size-8 text-primary" />
          <h2 className="text-2xl font-semibold tracking-tight">Safe by default, not by setting</h2>
          <p className="text-muted-foreground">Only you can create or run your twin. Everyone in the meeting always knows it&apos;s an AI, and you never pay for a session that didn&apos;t work.</p>
        </div>
        <ul className="grid gap-3 sm:grid-cols-2">
          {safety.map((s) => (
            <li key={s} className="flex gap-2 text-sm">
              <BadgeCheck className="mt-0.5 size-4 shrink-0 text-success" /> {s}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

type PaymentNotice = { tone: "ok" | "info" | "error"; text: string } | null;

/** Backup for the webhook: credits a returning Checkout Session (idempotent, owner-checked). */
async function confirmPayment(paid: string | undefined, uid: string): Promise<PaymentNotice> {
  if (!paid) return null;
  if (paid === "cancelled") return { tone: "info", text: "Checkout cancelled. You weren't charged." };
  if (!paymentsEnabled() || !/^cs_[A-Za-z0-9_]+$/.test(paid)) return null;
  try {
    const session = await getCheckout(paid);
    const credit = paidCredit(session);
    if (!credit || credit.ownerId !== uid) return { tone: "info", text: "Your payment is still processing. Credit appears as soon as Stripe confirms it." };
    await bot(`/v1/wallets/${uid}/credit`, { json: { amountCents: credit.cents, ref: session.id } });
    return { tone: "ok", text: `Payment received: ${money(credit.cents)} added to your minutes wallet. Thank you!` };
  } catch {
    return { tone: "error", text: "We couldn't confirm your payment just now. If you were charged, the credit is applied automatically within a minute." };
  }
}

export default async function Home({ searchParams }: { searchParams: Promise<{ paid?: string }> }) {
  const o = await loadOwner();
  if (!o.twin) return <Landing demo={isDemoMode} />;
  const notice = await confirmPayment((await searchParams).paid, o.uid);
  const { wallet, sessions, error } = await loadBotData(o.uid);
  const packs = paymentsEnabled() ? CREDIT_PACKS.map(({ id, label, minutes }) => ({ id, label, minutes })) : [];
  const live = sessions?.filter((s) => ["joining", "waiting_for_media", "live", "voice_only", "listen_only"].includes(s.state)) ?? [];
  const canRun = o.verified && o.consentActive;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Welcome back, {o.user?.name.split(" ")[0]}</h1>
          <p className="text-muted-foreground">Your twin is {canRun ? "ready to take the second seat." : "paused until consent is renewed."}</p>
        </div>
        {live.length > 0 && (
          <Button asChild>
            <Link href={`/sessions/${live[0].id}`}>
              <span className="size-2 animate-pulse rounded-full bg-success" /> Your twin is in “{live[0].meeting.title}”
            </Link>
          </Button>
        )}
      </div>

      {notice && (
        <div
          role="status"
          className={
            notice.tone === "ok"
              ? "rounded-lg border border-success/30 bg-success/10 px-4 py-3 text-sm"
              : notice.tone === "error"
                ? "rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm"
                : "rounded-lg border bg-muted px-4 py-3 text-sm"
          }
        >
          {notice.text}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1.25fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Send your twin to a meeting</CardTitle>
            <CardDescription>Pre-flight checks your identity, consent, avatar, voice and balance before anything connects.</CardDescription>
          </CardHeader>
          <CardContent>
            <SendTwinForm
              ratePerMinuteCents={wallet?.ratePerMinuteCents ?? 25}
              availableCents={wallet?.availableCents ?? null}
              demoMode={isDemoMode}
              disabled={error ? "The bot service is offline." : !canRun ? "Your consent is revoked. Re-sign it on the My twin page to run your twin." : undefined}
            />
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="overflow-hidden">
            <TwinStage look={o.twin.look} imageSrc={o.twin.referenceImageUrl} backgroundCss={o.background.css} badge={badgeLabel(o.twin.displayName)} recording={false} className="rounded-none" />
            <CardContent className="grid grid-cols-2 gap-2 pt-4">
              <Check ok={o.verified} label="ID + liveness verified" />
              <Check ok={o.consentActive} label="Consent on file" />
              <Check ok={o.twin.voiceModelReady} label="Voice clone ready" />
              <Check ok={o.twin.avatarModelReady} label={`${o.twin.look === "realistic" ? "Realistic" : "Stylized 3D"} avatar ready`} />
              <Button asChild variant="link" className="col-span-2 h-auto justify-start p-0">
                <Link href="/twin">Edit twin, background and notes →</Link>
              </Button>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Minutes wallet</CardTitle>
            </CardHeader>
            <CardContent>{wallet ? <WalletCard wallet={wallet} demoMode={isDemoMode} packs={packs} /> : <p className="text-sm text-muted-foreground">{error}</p>}</CardContent>
          </Card>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base">Coming up</CardTitle>
              <CardDescription>Auto-join is {o.autoJoin ? "on" : "off"}.</CardDescription>
            </div>
            <Button asChild variant="ghost" size="sm">
              <Link href="/meetings">Rules →</Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {o.events.length === 0 && <p className="text-sm text-muted-foreground">No upcoming meetings.</p>}
            {o.events.slice(0, 4).map(({ event, mode, because }) => (
              <div key={event.id} className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium">{event.title}</div>
                  <div className="text-xs text-muted-foreground">
                    {new Date(event.startsAt).toLocaleString([], { weekday: "short", hour: "numeric", minute: "2-digit" })} · {PLATFORM_LABEL[event.platform]} · {because}
                  </div>
                </div>
                <Badge variant={mode === "skip" ? "outline" : "secondary"}>{MODE_LABEL[mode]}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle className="text-base">Recent sessions</CardTitle>
            <Button asChild variant="ghost" size="sm">
              <Link href="/sessions">All →</Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {!sessions?.length && (
              <p className="flex items-center gap-2 text-sm text-muted-foreground">
                <Sparkles className="size-4" /> Your twin hasn&apos;t joined a meeting yet. Try the demo meeting above.
              </p>
            )}
            {sessions?.slice(0, 4).map((s) => (
              <Link key={s.id} href={`/sessions/${s.id}`} className="flex items-center justify-between gap-3 rounded-md p-1 hover:bg-muted">
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium">{s.meeting.title}</div>
                  <div className="text-xs text-muted-foreground">
                    {new Date(s.createdAt).toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })} · {s.settlement ? `charged ${money(s.settlement.chargedCents)}` : "in progress"}
                  </div>
                </div>
                <SessionStateBadge state={s.state} />
              </Link>
            ))}
          </CardContent>
        </Card>
      </div>
      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <FileSignature className="size-3.5" /> Consent signed {o.consent ? new Date(o.consent.signedAt).toLocaleDateString() : "—"} · scopes: {o.consent?.scopes.join(", ").replace(/_/g, " ") ?? "none"}
      </p>
    </div>
  );
}
