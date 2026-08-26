import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { addDays, addWeeks, addMonths, addYears } from "date-fns";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const recurring = await db.recurringBill.findMany({
      orderBy: { nextDueDate: "asc" },
      include: {
        account: true,
      },
    });

    let totalMonthlyExpense = 0;
    let totalMonthlyIncome = 0;

    recurring.forEach((item) => {
      if (!item.isActive) return;
      let monthlyEquivalent = item.amount;
      if (item.frequency === "DAILY") monthlyEquivalent = item.amount * 30;
      else if (item.frequency === "WEEKLY") monthlyEquivalent = item.amount * 4.33;
      else if (item.frequency === "YEARLY") monthlyEquivalent = item.amount / 12;

      if (item.type === "EXPENSE") {
        totalMonthlyExpense += monthlyEquivalent;
      } else {
        totalMonthlyIncome += monthlyEquivalent;
      }
    });

    return NextResponse.json({
      success: true,
      count: recurring.length,
      recurring,
      summary: {
        totalMonthlyExpense: Math.round(totalMonthlyExpense * 100) / 100,
        totalMonthlyIncome: Math.round(totalMonthlyIncome * 100) / 100,
        netMonthlyCommitment:
          Math.round((totalMonthlyIncome - totalMonthlyExpense) * 100) / 100,
      },
    });
  } catch (error: any) {
    console.error("Error fetching recurring bills:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      name,
      amount,
      type = "EXPENSE",
      category = "Bills & Utilities",
      subCategory,
      frequency = "MONTHLY",
      nextDueDate = new Date().toISOString(),
      autoExecute = false,
      accountId,
    } = body;

    if (!name || !amount || isNaN(Number(amount))) {
      return NextResponse.json(
        { success: false, error: "Valid name and amount are required" },
        { status: 400 }
      );
    }

    const bill = await db.recurringBill.create({
      data: {
        name: name.trim(),
        amount: Math.abs(Number(amount)),
        type: type === "INCOME" ? "INCOME" : "EXPENSE",
        category,
        subCategory,
        frequency,
        nextDueDate: new Date(nextDueDate),
        autoExecute: Boolean(autoExecute),
        accountId: accountId || null,
      },
      include: {
        account: true,
      },
    });

    return NextResponse.json({
      success: true,
      bill,
    });
  } catch (error: any) {
    console.error("Error creating recurring bill:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      id,
      name,
      amount,
      type,
      category,
      subCategory,
      frequency,
      nextDueDate,
      isActive,
      autoExecute,
      accountId,
      action, // "EXECUTE_NOW" to trigger payment
    } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: "Bill ID is required" },
        { status: 400 }
      );
    }

    const existing = await db.recurringBill.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { success: false, error: "Recurring bill not found" },
        { status: 404 }
      );
    }

    // If user clicked "Pay Now / Execute"
    if (action === "EXECUTE_NOW") {
      const now = new Date();
      // 1. Create a transaction
      const tx = await db.transaction.create({
        data: {
          amount: existing.amount,
          type: existing.type,
          category: existing.category,
          subCategory: existing.subCategory,
          description: `[Recurring] ${existing.name}`,
          source: "RECURRING",
          accountId: existing.accountId,
          date: now,
          currency: "MYR",
        },
      });

      // 2. Adjust account balance if account is linked
      if (existing.accountId) {
        const delta = existing.type === "INCOME" ? existing.amount : -existing.amount;
        await db.account.update({
          where: { id: existing.accountId },
          data: { balance: { increment: delta } },
        });
      }

      // 3. Compute next due date based on frequency
      let nextDate = new Date(existing.nextDueDate);
      if (existing.frequency === "DAILY") nextDate = addDays(nextDate, 1);
      else if (existing.frequency === "WEEKLY") nextDate = addWeeks(nextDate, 1);
      else if (existing.frequency === "YEARLY") nextDate = addYears(nextDate, 1);
      else nextDate = addMonths(nextDate, 1);

      const updated = await db.recurringBill.update({
        where: { id },
        data: {
          lastPaidDate: now,
          nextDueDate: nextDate,
        },
        include: { account: true },
      });

      return NextResponse.json({
        success: true,
        message: `Successfully executed recurring bill "${existing.name}"`,
        transaction: tx,
        bill: updated,
      });
    }

    const updated = await db.recurringBill.update({
      where: { id },
      data: {
        ...(name !== undefined && { name: name.trim() }),
        ...(amount !== undefined && { amount: Math.abs(Number(amount)) }),
        ...(type !== undefined && { type }),
        ...(category !== undefined && { category }),
        ...(subCategory !== undefined && { subCategory }),
        ...(frequency !== undefined && { frequency }),
        ...(nextDueDate !== undefined && { nextDueDate: new Date(nextDueDate) }),
        ...(isActive !== undefined && { isActive: Boolean(isActive) }),
        ...(autoExecute !== undefined && { autoExecute: Boolean(autoExecute) }),
        ...(accountId !== undefined && { accountId: accountId || null }),
      },
      include: { account: true },
    });

    return NextResponse.json({
      success: true,
      bill: updated,
    });
  } catch (error: any) {
    console.error("Error updating recurring bill:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { success: false, error: "Bill ID is required" },
        { status: 400 }
      );
    }

    await db.recurringBill.delete({ where: { id } });

    return NextResponse.json({
      success: true,
      message: "Recurring bill deleted successfully",
    });
  } catch (error: any) {
    console.error("Error deleting recurring bill:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
