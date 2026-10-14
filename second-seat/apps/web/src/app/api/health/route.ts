import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const botUrl = process.env.BOT_SERVICE_URL || "http://127.0.0.1:4317";
  let bot = false;
  try {
    const res = await fetch(`${botUrl}/health`, { cache: "no-store", signal: AbortSignal.timeout(2000) });
    bot = res.ok;
  } catch {
    bot = false;
  }
  return NextResponse.json({ ok: true, bot }, { status: bot ? 200 : 503 });
}
