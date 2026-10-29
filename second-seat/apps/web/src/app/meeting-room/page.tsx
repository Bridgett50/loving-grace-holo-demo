import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { badgeLabel, t2 } from "@second-seat/core";
import { loadOwner } from "@/lib/server/view-model";
import { MeetingRoom } from "./meeting-room";

export const dynamic = "force-dynamic";

export default async function MeetingRoomPage() {
  const o = await loadOwner();
  if (!o.twin) redirect("/onboarding");
  const h = await headers();
  // The fake send transport shows only for SECOND_SEAT_TEST_MODE=1 when both the
  // Host and any forwarded host are loopback, so a public deploy never shows it.
  const forwarded = h.get("x-forwarded-host");
  const fakeSend =
    t2.fakeSendAllowed(process.env.SECOND_SEAT_TEST_MODE, h.get("host")) &&
    (forwarded === null || t2.fakeSendAllowed(process.env.SECOND_SEAT_TEST_MODE, forwarded));
  return (
    <MeetingRoom
      fakeSend={fakeSend}
      ownerName={o.twin.displayName}
      look={o.twin.look}
      imageSrc={o.twin.referenceImageUrl}
      backgroundCss={o.background.css}
      badge={badgeLabel(o.twin.displayName)}
    />
  );
}
