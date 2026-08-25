import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const budgets = await db.categoryBudget.findMany({
      orderBy: { monthlyLimit: "desc" },
    });
    return NextResponse.json({ success: true, budgets });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { category, monthlyLimit } = body;

    if (!category || monthlyLimit === undefined) {
      return NextResponse.json(
        { success: false, error: "Category and monthlyLimit are required" },
        { status: 400 }
      );
    }

    const updated = await db.categoryBudget.upsert({
      where: { category },
      update: { monthlyLimit: Math.max(0, Number(monthlyLimit)) },
      create: { category, monthlyLimit: Math.max(0, Number(monthlyLimit)) },
    });

    return NextResponse.json({ success: true, budget: updated });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
