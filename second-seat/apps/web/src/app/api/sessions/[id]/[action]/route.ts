import { NextResponse } from "next/server";
import { bot } from "@/lib/server/bot";
import { currentUserId } from "@/lib/server/current-user";

const ACTIONS = new Set(["takeover", "coach", "owner-says", "end", "demo-say", "answer"]);

export async function POST(req: Request, ctx: RouteContext<"/api/sessions/[id]/[action]">) {
  const { id, action } = await ctx.params;
  if (!ACTIONS.has(action)) return NextResponse.json({ error: "Unknown action" }, { status: 404 });
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  try {
    const view = await bot(`/v1/sessions/${id}/${action}`, { json: { ...body, actorId: await currentUserId() } });
    return NextResponse.json(view);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
