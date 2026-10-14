import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { CONNECTIONS } from "@second-seat/core";
import { publicOrigin } from "@/lib/server/origin";
import { audit, updateDb } from "@/lib/server/db";
import { currentUserId } from "@/lib/server/current-user";

const TOKEN_URL: Record<string, string> = {
  google: "https://oauth2.googleapis.com/token",
  slack: "https://slack.com/api/oauth.v2.access",
  x: "https://api.twitter.com/2/oauth2/token",
  instagram: "https://api.instagram.com/oauth/access_token",
};

export async function GET(req: Request, ctx: RouteContext<"/api/connections/[id]/callback">) {
  const { id } = await ctx.params;
  const def = CONNECTIONS.find((c) => c.id === id);
  const back = (error?: string) => NextResponse.redirect(new URL(error ? `/connections?error=${error}` : "/connections", publicOrigin(req)));
  if (!def || !TOKEN_URL[id]) return back("not_configured");

  const url = new URL(req.url);
  const jar = await cookies();
  const raw = jar.get(`ss_oauth_${id}`)?.value;
  jar.delete({ name: `ss_oauth_${id}`, path: "/api/connections" });
  let saved: { state?: string; verifier?: string } = {};
  try {
    saved = raw ? JSON.parse(raw) : {};
  } catch {
    saved = {};
  }
  const code = url.searchParams.get("code");
  if (!code || !saved.state || url.searchParams.get("state") !== saved.state) return back("oauth_state");

  const [idKey, secretKey] = def.requiredEnv;
  const clientId = process.env[idKey] ?? "";
  const clientSecret = process.env[secretKey] ?? "";
  const redirect = new URL(`/api/connections/${id}/callback`, publicOrigin(req)).toString();
  const form = new URLSearchParams({ grant_type: "authorization_code", code, redirect_uri: redirect, client_id: clientId });
  const headers: Record<string, string> = { "content-type": "application/x-www-form-urlencoded" };
  if (id === "x") {
    form.set("code_verifier", saved.verifier ?? "");
    headers.authorization = `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`;
  } else {
    form.set("client_secret", clientSecret);
  }

  const res = await fetch(TOKEN_URL[id], { method: "POST", headers, body: form }).catch(() => null);
  const body = res ? ((await res.json().catch(() => ({}))) as Record<string, unknown>) : {};
  if (!res?.ok || body.error || body.ok === false) return back("oauth_exchange");

  const uid = await currentUserId();
  updateDb((d) => {
    d.oauthTokens[uid] = d.oauthTokens[uid] ?? {};
    d.oauthTokens[uid][def.id] = { ...body, obtainedAt: new Date().toISOString() };
    d.connections[uid] = d.connections[uid] ?? {};
    d.connections[uid][def.id] = { connectedAt: new Date().toISOString(), mode: "oauth", account: d.users[uid]?.email };
    audit(d, uid, "connection_added", `${id}:oauth`);
  });
  return back();
}
