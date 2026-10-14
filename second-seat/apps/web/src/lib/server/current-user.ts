import "server-only";
import { cookies } from "next/headers";

/**
 * Demo mode runs without an auth provider. Locally that is a single owner; with PUBLIC_DEMO=true each
 * browser gets its own private owner id (see src/proxy.ts). Production should put Auth.js / an SSO
 * provider here and return the signed-in user id; every twin action is already checked against it
 * with `authorizeTwinAction`.
 */
export const DEMO_OWNER_ID = "owner_demo";
export const isDemoMode = process.env.DEMO_MODE !== "false";
export const isPublicDemo = isDemoMode && process.env.PUBLIC_DEMO === "true";

const VISITOR_ID = /^v_[0-9a-f-]{36}$/;

export async function currentUserId(): Promise<string> {
  if (!isPublicDemo) return DEMO_OWNER_ID;
  const id = (await cookies()).get("ss_visitor")?.value;
  if (!id || !VISITOR_ID.test(id)) throw new Error("Your demo session expired. Refresh the page to start a new one.");
  return id;
}
