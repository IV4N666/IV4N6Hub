import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyPassword, createSessionToken, AUTH_CONFIG } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { password } = body;

    if (!password || typeof password !== "string") {
      return NextResponse.json(
        { success: false, error: "Password is required" },
        { status: 400 }
      );
    }

    // Rate-limit / anti-brute force delay
    await new Promise((resolve) => setTimeout(resolve, 300));

    // Fetch stored admin password hash from DB
    const appConfig = await db.appConfig.findFirst();
    const storedHash = appConfig?.adminPasswordHash;

    const isValid = await verifyPassword(password, storedHash);

    if (!isValid) {
      return NextResponse.json(
        { success: false, error: "Incorrect passcode. Access denied." },
        { status: 401 }
      );
    }

    // Generate secure session token
    const token = await createSessionToken();

    const response = NextResponse.json({
      success: true,
      message: "Authentication successful",
    });

    // Set secure HttpOnly cookie
    response.cookies.set({
      name: AUTH_CONFIG.COOKIE_NAME,
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: AUTH_CONFIG.MAX_AGE,
      path: "/",
    });

    return response;
  } catch (error: any) {
    console.error("Login error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Internal authentication error" },
      { status: 500 }
    );
  }
}
