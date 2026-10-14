import { readAsset } from "@/lib/server/assets";
import { currentUserId } from "@/lib/server/current-user";
import { readDb } from "@/lib/server/db";

export const dynamic = "force-dynamic";

/** Only the owner can read their media. ID documents are never served back. */
export async function GET(_req: Request, ctx: RouteContext<"/api/assets/[id]">) {
  const { id } = await ctx.params;
  const asset = readDb().assets[id];
  if (!asset || asset.ownerId !== (await currentUserId()) || asset.kind === "id_document") {
    return new Response("Not found", { status: 404 });
  }
  return new Response(new Uint8Array(readAsset(asset)), {
    headers: { "content-type": asset.mime, "cache-control": "private, max-age=3600", "x-content-type-options": "nosniff" },
  });
}
