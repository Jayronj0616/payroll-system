import { NextRequest, NextResponse } from "next/server";
import { verifySessionCookieValue, SESSION_COOKIE_NAME } from "@/lib/session";

// The landing page ("/") is the only page a signed-out visitor can reach.
// Everything else — /dashboard, /employees, /payrolls, /accounts, etc. —
// requires a valid session cookie.
const PUBLIC_PATHS = new Set(["/"]);

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (PUBLIC_PATHS.has(pathname)) {
    return NextResponse.next();
  }

  // Cron routes have no session cookie at all — Vercel's scheduler calls
  // them directly with an Authorization header, not a browser session.
  // They're still protected, just by their own CRON_SECRET check inside
  // the route handler instead of this cookie gate.
  if (pathname.startsWith("/api/cron/")) {
    return NextResponse.next();
  }

  const cookieValue = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const session = await verifySessionCookieValue(cookieValue);

  if (!session) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    url.search = "?login=1";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

// Runs on every request except Next's own static/image assets.
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
