import type { Platform } from "@second-seat/core";
import { DemoMeetingAdapter } from "./demo";
import { GoogleMeetBrowserAdapter, VexaMeetFallbackAdapter } from "./google-meet";
import type { MeetingAdapter } from "./types";
import { TeamsGraphAdapter } from "./teams";
import { ZoomMeetingSdkAdapter } from "./zoom";

export * from "./types";
export { DemoMeetingAdapter } from "./demo";

/** Ordered adapters to try for a platform. The runner falls through to the next on join failure. */
export function adapterChain(platform: Platform, opts: { demoJoinFails?: boolean } = {}): MeetingAdapter[] {
  switch (platform) {
    case "google_meet":
      return [new GoogleMeetBrowserAdapter(), new VexaMeetFallbackAdapter()];
    case "zoom":
      return [new ZoomMeetingSdkAdapter()];
    case "teams":
      return [new TeamsGraphAdapter()];
    case "demo":
      return [new DemoMeetingAdapter({ joinFails: opts.demoJoinFails })];
  }
}

export function detectPlatform(url: string): Platform | null {
  try {
    const host = new URL(url).hostname;
    if (host === "meet.google.com") return "google_meet";
    if (host.endsWith("zoom.us") || host.endsWith("zoomgov.com")) return "zoom";
    if (host.endsWith("teams.microsoft.com") || host.endsWith("teams.live.com")) return "teams";
  } catch {
    return null;
  }
  return null;
}
