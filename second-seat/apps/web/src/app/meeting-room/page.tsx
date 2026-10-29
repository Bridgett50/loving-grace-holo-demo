import { headers } from "next/headers";
import { fakeSendAllowed } from "@second-seat/core";
import MeetingRoom from "./meeting-room";

export const dynamic = "force-dynamic";

export default async function MeetingRoomPage() {
  // The fake send transport is enabled only when the operator opts in with
  // SECOND_SEAT_TEST_MODE=1 AND the request is addressed to a loopback host
  // (Host, and X-Forwarded-Host when present). Otherwise sends stay disabled.
  const h = await headers();
  const fakeSend = fakeSendAllowed({
    testModeEnv: process.env.SECOND_SEAT_TEST_MODE,
    host: h.get("host"),
    forwardedHost: h.get("x-forwarded-host"),
  });
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Twin meeting room</h1>
        <p className="text-muted-foreground">
          Watch your twin answer from your notes, guide it, or take over.
        </p>
      </div>
      <MeetingRoom testMode={fakeSend} />
    </div>
  );
}
