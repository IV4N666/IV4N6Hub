import { NextRequest, NextResponse } from "next/server";
import { verifySessionToken, AUTH_CONFIG } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const sessionCookie = request.cookies.get(AUTH_CONFIG.COOKIE_NAME)?.value;
  const isAuthenticated = sessionCookie ? await verifySessionToken(sessionCookie) : false;

  return NextResponse.json({
    authenticated: isAuthenticated,
  });
}
