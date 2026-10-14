import { redirect } from "next/navigation";
import { badgeLabel, consentText } from "@second-seat/core";
import { BackgroundPicker, ConsentVault, DangerZone, KnowledgePanel, LookSwitcher, PersonaForm } from "./sections";
import { Check } from "@/components/status-pills";
import { TwinStage } from "@/components/twin-avatar";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { loadOwner } from "@/lib/server/view-model";

export const dynamic = "force-dynamic";

export default async function TwinPage({ searchParams }: PageProps<"/twin">) {
  const o = await loadOwner();
  if (!o.twin) redirect("/onboarding");
  const sp = await searchParams;
  const t = o.twin;
  return (
    <div className="space-y-6">
      {sp.welcome && (
        <Alert>
          <AlertTitle>Your twin is ready</AlertTitle>
          <AlertDescription>We added a sample note so you can try the demo meeting right away. Add your own notes below so your twin can answer like you.</AlertDescription>
        </Alert>
      )}
      <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
        <Card className="overflow-hidden">
          <TwinStage look={t.look} imageSrc={t.referenceImageUrl} backgroundCss={o.background.css} badge={badgeLabel(t.displayName)} recording={false} className="rounded-none" />
          <CardHeader>
            <CardTitle className="text-xl">{t.displayName}</CardTitle>
            <CardDescription>
              Joins as “{t.displayName} (AI Twin)” · created {new Date(t.createdAt).toLocaleDateString()}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <LookSwitcher look={t.look} hasReference={!!t.referenceImageUrl} />
            <div className="grid grid-cols-2 gap-2">
              <Check ok={o.verified} label="ID + liveness verified" />
              <Check ok={o.consentActive} label="Consent active" />
              <Check ok={t.voiceModelReady} label="Voice clone ready" />
              <Check ok={t.avatarModelReady} label="Avatar ready" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Background</CardTitle>
            <CardDescription>What attendees see behind your twin. Upload your own or pick one.</CardDescription>
          </CardHeader>
          <CardContent>
            <BackgroundPicker backgrounds={o.backgrounds} selected={t.backgroundId} />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>How your twin speaks</CardTitle>
            <CardDescription>It answers only from your notes, and declines restricted topics.</CardDescription>
          </CardHeader>
          <CardContent>
            <PersonaForm persona={t.persona} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Knowledge</CardTitle>
            <CardDescription>Private notes your twin can answer from. Never shared or used for training.</CardDescription>
          </CardHeader>
          <CardContent>
            <KnowledgePanel docs={o.knowledge.map((k) => ({ id: k.id, title: k.title, chars: k.content.length, createdAt: k.createdAt }))} />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Consent vault</CardTitle>
            <CardDescription>Your signed releases. Revoking stops your twin everywhere, immediately.</CardDescription>
          </CardHeader>
          <CardContent>
            <ConsentVault
              userName={o.user?.name ?? t.displayName}
              consentPreview={consentText(o.user?.name ?? t.displayName)}
              records={o.consents.map((c) => ({ id: c.id, signerName: c.signerName, scopes: c.scopes, signedAt: c.signedAt, revokedAt: c.revokedAt, revocationReason: c.revocationReason, textHash: c.textHash }))}
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Identity & data</CardTitle>
            <CardDescription>Only you, verified, can create or run this twin.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div className="rounded-lg border p-3">
              <div className="font-medium">Verification: {o.verification?.status ?? "none"}</div>
              <div className="text-muted-foreground">
                Provider {o.verification?.provider ?? "—"} · {o.verification?.verifiedAt ? new Date(o.verification.verifiedAt).toLocaleString() : "not verified"}
              </div>
              <div className="text-muted-foreground">Liveness prompts: {o.verification?.livenessChallenges?.join(", ").replace(/_/g, " ") ?? "—"}</div>
            </div>
            <DangerZone />
            <details>
              <summary className="cursor-pointer text-muted-foreground">Audit log ({o.audit.length})</summary>
              <ol className="mt-2 space-y-1 font-mono text-[11px] text-muted-foreground">
                {o.audit.map((a, i) => (
                  <li key={i}>
                    {new Date(a.at).toLocaleString()} {a.action} {a.detail ?? ""}
                  </li>
                ))}
              </ol>
            </details>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
