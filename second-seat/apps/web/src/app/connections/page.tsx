import { AtSign, Camera, Mail, MessageCircle, MessageSquare, Send } from "lucide-react";
import { CONNECTIONS } from "@second-seat/core";
import { ConnectButton } from "./connect-button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { isDemoMode } from "@/lib/server/current-user";
import { loadOwner } from "@/lib/server/view-model";

export const dynamic = "force-dynamic";

const ICONS = { google: Mail, slack: MessageSquare, sms: MessageCircle, telegram: Send, x: AtSign, instagram: Camera } as const;

export default async function ConnectionsPage({ searchParams }: PageProps<"/connections">) {
  const o = await loadOwner();
  const sp = await searchParams;
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Connections</h1>
        <p className="text-muted-foreground">One tap to connect. Your twin only reads what a skill needs and never posts or sends without you.</p>
      </div>
      {sp.error === "not_configured" && (
        <Alert variant="destructive">
          <AlertDescription>That provider isn&apos;t configured on this server yet. See .env.example.</AlertDescription>
        </Alert>
      )}
      {(sp.error === "oauth_state" || sp.error === "oauth_exchange") && (
        <Alert variant="destructive">
          <AlertDescription>
            {sp.error === "oauth_state" ? "That sign-in link expired or didn't match. Please try connecting again." : "The provider didn't accept the sign-in. Check the client ID, secret and redirect URI, then try again."}
          </AlertDescription>
        </Alert>
      )}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {CONNECTIONS.map((c) => {
          const Icon = ICONS[c.id];
          const state = o.connections[c.id];
          const configured = c.requiredEnv.every((k) => !!process.env[k]);
          return (
            <Card key={c.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <span className="flex size-10 items-center justify-center rounded-lg bg-secondary">
                    <Icon className="size-5 text-primary" />
                  </span>
                  {state ? <Badge className="bg-success text-white">{state.mode === "demo" ? "Connected (demo)" : "Connected"}</Badge> : !configured && <Badge variant="outline">{isDemoMode ? "Demo available" : "Not configured"}</Badge>}
                </div>
                <CardTitle className="text-base">{c.name}</CardTitle>
                <CardDescription>{c.description}</CardDescription>
              </CardHeader>
              <CardFooter className="mt-auto flex-col items-stretch gap-2">
                <ConnectButton id={c.id} connected={!!state} disabled={!o.twin || (!configured && !isDemoMode)} />
                {!configured && <span className="text-[11px] text-muted-foreground">Real connection needs {c.requiredEnv.join(", ")}</span>}
              </CardFooter>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
