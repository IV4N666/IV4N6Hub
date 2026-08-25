import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const modules = await db.platformModule.findMany({
      orderBy: { createdAt: "asc" },
    });
    return NextResponse.json({ success: true, modules });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { key, isEnabled } = body;

    if (!key || isEnabled === undefined) {
      return NextResponse.json({ success: false, error: "Key and isEnabled are required" }, { status: 400 });
    }

    const updated = await db.platformModule.update({
      where: { key },
      data: { isEnabled },
    });

    return NextResponse.json({ success: true, module: updated });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
