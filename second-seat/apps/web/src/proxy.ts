import { NextResponse, type NextRequest } from "next/server";

export const VISITOR_COOKIE = "ss_visitor";

/**
 * Public demo: every visitor gets a private, random owner id in an httpOnly cookie, so twins,
 * wallets and meetings are never shared between strangers. Set on the request too, so the very
 * first render already sees it.
 */
export function proxy(request: NextRequest) {
  if (process.env.PUBLIC_DEMO !== "true" || request.cookies.get(VISITOR_COOKIE)) return NextResponse.next();
  const id = `v_${crypto.randomUUID()}`;
  request.cookies.set(VISITOR_COOKIE, id);
  const res = NextResponse.next({ request: { headers: request.headers } });
  res.cookies.set(VISITOR_COOKIE, id, {
    httpOnly: true,
    sameSite: "lax",
    secure: request.nextUrl.protocol === "https:",
    maxAge: 60 * 60 * 24 * 30,
    path: "/",
  });
  return res;
}

export const config = {
  matcher: ["/((?!_next/|api/health|samples/|favicon.ico).*)"],
};
