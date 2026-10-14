import { NextResponse } from "next/server";
import { BotOfflineError, getSession } from "@/lib/server/bot";
import { currentUserId } from "@/lib/server/current-user";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, ctx: RouteContext<"/api/sessions/[id]">) {
  const { id } = await ctx.params;
  const uid = await currentUserId();
  try {
    const s = await getSession(id);
    if (s.ownerId !== uid) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(s);
  } catch (e) {
    const offline = e instanceof BotOfflineError;
    return NextResponse.json({ error: (e as Error).message, offline }, { status: offline ? 503 : 404 });
  }
}
