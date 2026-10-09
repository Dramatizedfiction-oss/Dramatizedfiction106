import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { PATHNAME_HEADER, PROTECTED_ROUTE_RULES } from "@/lib/auth-route-guards";

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
      "/new-episode": "/episodes/new",
    };
    const destination = legacyRouteMap[writerPath] ?? writerPath;
    const writerStudioUrl = new URL(`/writer-studio${destination}`, nextUrl);
    writerStudioUrl.search = nextUrl.search;
    return NextResponse.redirect(writerStudioUrl);
  }

  // Cookie presence only: real role/restriction checks happen on the server
  // in each page and route (lib/utils.ts, lib/auth/guards.ts).
  const rule = PROTECTED_ROUTE_RULES.find(
    (entry) => pathname === entry.prefix || pathname.startsWith(`${entry.prefix}/`),
  );

  if (rule) {
    const hasSessionCookie = SESSION_COOKIE_NAMES.some((cookieName) =>
      Boolean(cookies.get(cookieName)?.value),
    );

    if (!hasSessionCookie) {
      const signInUrl = new URL("/sign-in", nextUrl);
      signInUrl.searchParams.set("callbackUrl", nextUrl.pathname + nextUrl.search);
      return NextResponse.redirect(signInUrl);
    }
  }

  // Overwrite (never trust) any incoming value of this header.
  const headers = new Headers(request.headers);
  headers.set(PATHNAME_HEADER, pathname);
  return NextResponse.next({ request: { headers } });
}

export const config = {
  // Every page and API route; static files and Next.js internals are skipped.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|avatars/|logo-934.png).*)"],
};
