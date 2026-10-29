import MeetingRoom from "./meeting-room";

export const dynamic = "force-dynamic";

export default function MeetingRoomPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Twin meeting room</h1>
        <p className="text-muted-foreground">
          Watch your twin answer from your notes, guide it, or take over.
        </p>
      </div>
      <MeetingRoom />
    </div>
  );
}
