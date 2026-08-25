import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { computeMonthlyStats, computeYearlyStats } from "@/lib/finance-utils";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const month = searchParams.get("month") || new Date().toISOString().slice(0, 7); // "YYYY-MM"
    const year = parseInt(searchParams.get("year") || String(new Date().getFullYear()), 10);

    // Fetch all transactions
    const rawTransactions = await db.transaction.findMany({
      orderBy: { date: "desc" },
    });

    // Format for calculations
    const transactions = rawTransactions.map((t) => ({
      ...t,
      date: t.date.toISOString(),
      createdAt: t.createdAt.toISOString(),
      updatedAt: t.updatedAt.toISOString(),
    }));

    // Compute monthly and yearly stats
    const monthly = computeMonthlyStats(transactions as any, month);
    const yearly = computeYearlyStats(transactions as any, year);

    // Fetch budgets
    const budgets = await db.categoryBudget.findMany();

    // Fetch app config
    const config = await db.appConfig.findFirst();

    return NextResponse.json({
      success: true,
      monthly,
      yearly,
      budgets,
      config: config || { defaultCurrency: "USD" },
    });
  } catch (error: any) {
    console.error("Error fetching financial stats:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch stats" },
      { status: 500 }
    );
  }
}
