import { notFound } from "next/navigation";
import { badgeLabel } from "@second-seat/core";
import { LiveSession } from "./live-session";
import { isDemoMode } from "@/lib/server/current-user";
import { loadOwner } from "@/lib/server/view-model";

export const dynamic = "force-dynamic";

export default async function SessionPage({ params }: PageProps<"/sessions/[id]">) {
  const { id } = await params;
  const o = await loadOwner();
  if (!o.twin) notFound();
  return (
    <LiveSession
      id={id}
      look={o.twin.look}
      imageSrc={o.twin.referenceImageUrl}
      backgroundCss={o.background.css}
      badge={badgeLabel(o.twin.displayName)}
      ownerName={o.twin.displayName}
      ownerFirstName={o.twin.displayName.split(" ")[0]}
      knowledge={o.knowledge}
      demoMode={isDemoMode}
    />
  );
}
