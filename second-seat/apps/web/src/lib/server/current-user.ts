import "server-only";

/**
 * Demo mode runs as a single local owner so the app works with no auth provider. Production should
 * put Auth.js / an SSO provider here and return the signed-in user id; every twin action is already
 * checked against this id with `authorizeTwinAction`.
 */
export const DEMO_OWNER_ID = "owner_demo";

export async function currentUserId(): Promise<string> {
  return DEMO_OWNER_ID;
}

export const isDemoMode = process.env.DEMO_MODE !== "false";
