import { NextResponse } from "next/server";
import { CONNECTIONS } from "@second-seat/core";
import { publicOrigin } from "@/lib/server/origin";

interface AuthParams {
  clientId: string;
  redirect: string;
  state: string;
  verifier: string;
}

const AUTHORIZE: Record<string, (p: AuthParams) => string> = {
  google: (p) =>
    `https://accounts.google.com/o/oauth2/v2/auth?client_id=${p.clientId}&redirect_uri=${encodeURIComponent(p.redirect)}&response_type=code&access_type=offline&prompt=consent&state=${p.state}&scope=${encodeURIComponent("https://www.googleapis.com/auth/calendar.readonly https://www.googleapis.com/auth/gmail.compose")}`,
  slack: (p) => `https://slack.com/oauth/v2/authorize?client_id=${p.clientId}&scope=chat:write,channels:read&state=${p.state}&redirect_uri=${encodeURIComponent(p.redirect)}`,
  x: (p) =>
    `https://twitter.com/i/oauth2/authorize?response_type=code&client_id=${p.clientId}&redirect_uri=${encodeURIComponent(p.redirect)}&scope=tweet.read%20users.read&state=${p.state}&code_challenge=${p.verifier}&code_challenge_method=plain`,
  instagram: (p) => `https://api.instagram.com/oauth/authorize?client_id=${p.clientId}&redirect_uri=${encodeURIComponent(p.redirect)}&scope=user_profile,user_media&response_type=code&state=${p.state}`,
};

/**
 * Starts the provider's OAuth flow when its credentials are configured (SMS and Telegram use API
 * keys instead). State and PKCE verifier are random per request and kept in an httpOnly cookie for
 * the callback to check.
 */
export async function GET(req: Request, ctx: RouteContext<"/api/connections/[id]/start">) {
  const { id } = await ctx.params;
  const def = CONNECTIONS.find((c) => c.id === id);
  if (!def) return NextResponse.json({ error: "Unknown connection" }, { status: 404 });
  const clientId = process.env[def.requiredEnv[0]];
  const build = AUTHORIZE[id];
  if (!clientId || !build) return NextResponse.redirect(new URL("/connections?error=not_configured", publicOrigin(req)));
  const redirect = new URL(`/api/connections/${id}/callback`, publicOrigin(req)).toString();
  const state = crypto.randomUUID();
  const verifier = `${crypto.randomUUID()}${crypto.randomUUID()}`.replace(/-/g, "");
  const res = NextResponse.redirect(build({ clientId, redirect, state, verifier }));
  res.cookies.set(`ss_oauth_${id}`, JSON.stringify({ state, verifier }), { httpOnly: true, sameSite: "lax", secure: publicOrigin(req).startsWith("https:"), maxAge: 600, path: "/api/connections" });
  return res;
}
