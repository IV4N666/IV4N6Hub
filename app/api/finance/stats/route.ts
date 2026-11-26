import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { computeMonthlyStats, computeYearlyStats } from "@/lib/finance-utils";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const month = searchParams.get("month") || new Date().toISOString().slice(0, 7); // "YYYY-MM"
    const year = parseInt(searchParams.get("year") || String(new Date().getFullYear()), 10);

    // 0. Auto-execute any due RecurringBills where autoExecute = true and nextDueDate <= now
    try {
      const now = new Date();
      const dueBills = await db.recurringBill.findMany({
        where: {
          isActive: true,
          autoExecute: true,
          nextDueDate: { lte: now },
        },
      });

      for (const bill of dueBills) {
        const nextDue = new Date(bill.nextDueDate);
        if (bill.frequency === "DAILY") nextDue.setDate(nextDue.getDate() + 1);
        else if (bill.frequency === "WEEKLY") nextDue.setDate(nextDue.getDate() + 7);
        else if (bill.frequency === "YEARLY") nextDue.setFullYear(nextDue.getFullYear() + 1);
        else nextDue.setMonth(nextDue.getMonth() + 1);

        await db.$transaction(async (tx) => {
          await tx.transaction.create({
            data: {
              amount: bill.amount,
              type: bill.type,
              category: bill.category,
              subCategory: bill.subCategory,
              description: `${bill.name} (Auto Recurring)`,
              source: "RECURRING",
              currency: "MYR",
              accountId: bill.accountId || null,
              date: bill.nextDueDate,
            },
          });

          if (bill.accountId) {
            if (bill.type === "EXPENSE") {
              await tx.account.update({
                where: { id: bill.accountId },
                data: { balance: { decrement: bill.amount } },
              });
            } else if (bill.type === "INCOME") {
              await tx.account.update({
                where: { id: bill.accountId },
                data: { balance: { increment: bill.amount } },
              });
            }
          }

          await tx.recurringBill.update({
            where: { id: bill.id },
            data: {
              lastPaidDate: bill.nextDueDate,
              nextDueDate: nextDue,
            },
          });
        });
      }
    } catch (recErr) {
      console.warn("Recurring bill auto-execution warning:", recErr);
    }

    // Filter transactions to the target year (plus requested month if in a different year)
    const [reqYear] = month.split("-").map(Number);
    const minYear = Math.min(year, reqYear || year);
    const maxYear = Math.max(year, reqYear || year);
    const yearStart = new Date(minYear, 0, 1, 0, 0, 0, 0);
    const yearEnd = new Date(maxYear, 11, 31, 23, 59, 59, 999);

    // Parallel fetch transactions, budgets, and config
    const [rawTransactions, budgets, config] = await Promise.all([
      db.transaction.findMany({
        where: {
          date: {
            gte: yearStart,
            lte: yearEnd,
          },
        },
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
