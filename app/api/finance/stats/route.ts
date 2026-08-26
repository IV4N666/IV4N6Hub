import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { computeMonthlyStats, computeYearlyStats } from "@/lib/finance-utils";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const month = searchParams.get("month") || new Date().toISOString().slice(0, 7); // "YYYY-MM"
    const year = parseInt(searchParams.get("year") || String(new Date().getFullYear()), 10);

    // Parallel fetch transactions, budgets, and config
    const [rawTransactions, budgets, config] = await Promise.all([
      db.transaction.findMany({
        select: {
          id: true,
          amount: true,
          type: true,
          category: true,
          currency: true,
          date: true,
        },
        orderBy: { date: "desc" },
      }),
      db.categoryBudget.findMany(),
      db.appConfig.findFirst(),
    ]);

    // Format for calculations
    const transactions = rawTransactions.map((t) => ({
      ...t,
      date: t.date.toISOString(),
      source: "WEB_MANUAL",
    }));

    // Compute monthly and yearly stats
    const monthly = computeMonthlyStats(transactions as any, month);
    const yearly = computeYearlyStats(transactions as any, year);

    return NextResponse.json({
      success: true,
      monthly,
      yearly,
      budgets,
      config: config || { defaultCurrency: "MYR" },
    });
  } catch (error: any) {
    console.error("Error fetching financial stats:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch stats" },
      { status: 500 }
    );
  }
}
