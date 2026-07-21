import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { PROTECTED_ROUTE_RULES } from "@/lib/auth-route-guards";

const SESSION_COOKIE_NAMES = [
  "df.session-token",
  "__Secure-df.session-token",
];

export default function middleware(request: NextRequest) {
  const { nextUrl, cookies } = request;
  const pathname = nextUrl.pathname;

  if (pathname === "/writer" || pathname.startsWith("/writer/")) {
    const writerPath = pathname.slice("/writer".length) || "/";
    const legacyRouteMap: Record<string, string> = {
      "/episodes": "/stories",
      "/stats": "/analytics",
      "/new-episode": "/",
    };
    const destination = legacyRouteMap[writerPath] ?? writerPath;
    const writerStudioUrl = new URL(`/writer-studio${destination}`, nextUrl);
    writerStudioUrl.search = nextUrl.search;
    return NextResponse.redirect(writerStudioUrl);
  }

  const rule = PROTECTED_ROUTE_RULES.find((entry) => pathname.startsWith(entry.prefix));

  if (!rule) {
    return NextResponse.next();
  }

  const hasSessionCookie = SESSION_COOKIE_NAMES.some((cookieName) =>
    Boolean(cookies.get(cookieName)?.value),
  );

  if (!hasSessionCookie) {
    const signInUrl = new URL("/sign-in", nextUrl);
    signInUrl.searchParams.set("callbackUrl", nextUrl.pathname + nextUrl.search);
    return NextResponse.redirect(signInUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/writer/:path*", "/writer-studio/:path*", "/command-center/:path*", "/ceo/:path*", "/ceo-studio/:path*"],
};
