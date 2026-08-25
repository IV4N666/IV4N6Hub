import { NextRequest, NextResponse } from "next/server";
import { verifySessionToken, AUTH_CONFIG } from "./lib/auth";

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, sitemap.xml, robots.txt (metadata files)
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};

const PUBLIC_PATHS = [
  "/login",
  "/api/auth/login",
  "/api/auth/logout",
  "/api/auth/check",
  "/api/webhook/whatsapp",
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Allow public routes
  if (PUBLIC_PATHS.some((path) => pathname.startsWith(path))) {
    return NextResponse.next();
  }

  // 2. Extract session token from cookie
  const sessionCookie = request.cookies.get(AUTH_CONFIG.COOKIE_NAME)?.value;
  const isAuthenticated = sessionCookie ? await verifySessionToken(sessionCookie) : false;

  // 3. Handle unauthenticated requests
  if (!isAuthenticated) {
    // For API routes, return 401 JSON
    if (pathname.startsWith("/api/")) {
      return NextResponse.json(
        { success: false, error: "Unauthorized: Master passcode required" },
        { status: 401 }
      );
    }

    // For page routes, redirect to /login
    const loginUrl = new URL("/login", request.url);
    if (pathname !== "/") {
      loginUrl.searchParams.set("from", pathname);
    }
    return NextResponse.redirect(loginUrl);
  }

  // 4. Authenticated, proceed
  return NextResponse.next();
}
