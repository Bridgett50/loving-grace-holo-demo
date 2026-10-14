import "server-only";

/** Public origin for redirects. The dev server binds 0.0.0.0, so `req.url` can't be trusted for this. */
export function publicOrigin(req: Request): string {
  if (process.env.APP_URL) return process.env.APP_URL;
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  const proto = req.headers.get("x-forwarded-proto") ?? new URL(req.url).protocol.replace(":", "");
  return host ? `${proto}://${host}` : new URL(req.url).origin;
}

/** Same as `publicOrigin`, for server actions (which have headers but no Request). */
export async function actionOrigin(): Promise<string> {
  if (process.env.APP_URL) return process.env.APP_URL;
  const { headers } = await import("next/headers");
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:4310";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") || host.startsWith("127.") ? "http" : "https");
  return `${proto}://${host}`;
}
