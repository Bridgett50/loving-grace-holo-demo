import { NextResponse } from "next/server";
import { bot } from "@/lib/server/bot";

export async function POST(req: Request) {
  const body = await req.json();
  try {
    return NextResponse.json(await bot("/v1/credentials/verify", { json: body }));
  } catch (e) {
    return NextResponse.json({ valid: false, reason: (e as Error).message }, { status: 400 });
  }
}
