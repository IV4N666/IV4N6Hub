import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category");
    const type = searchParams.get("type");
    const source = searchParams.get("source");
    const query = searchParams.get("q");
    const month = searchParams.get("month"); // "YYYY-MM"
    const limit = parseInt(searchParams.get("limit") || "100", 10);

    const where: any = {};

    if (category && category !== "ALL") {
      where.category = category;
    }
    if (type && type !== "ALL") {
      where.type = type;
    }
    if (source && source !== "ALL") {
      where.source = source;
    }
    if (query) {
      where.OR = [
        { description: { contains: query } },
        { category: { contains: query } },
        { rawInput: { contains: query } },
      ];
    }
    if (month) {
      const [y, m] = month.split("-").map(Number);
      const start = new Date(y, m - 1, 1);
      const end = new Date(y, m, 0, 23, 59, 59, 999);
      where.date = {
        gte: start,
        lte: end,
      };
    }

    const transactions = await db.transaction.findMany({
      where,
      orderBy: { date: "desc" },
      take: limit,
    });

    return NextResponse.json({
      success: true,
      count: transactions.length,
      transactions,
    });
  } catch (error: any) {
    console.error("Error fetching transactions:", error);
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
      amount,
      type = "EXPENSE",
      category = "Other",
      description,
      source = "WEB_MANUAL",
      rawInput,
      currency = "USD",
      date = new Date().toISOString(),
    } = body;

    if (!amount || isNaN(Number(amount))) {
      return NextResponse.json(
        { success: false, error: "Valid amount is required" },
        { status: 400 }
      );
    }

    const transaction = await db.transaction.create({
      data: {
        amount: Math.abs(Number(amount)),
        type: type === "INCOME" ? "INCOME" : "EXPENSE",
        category,
        description: description || (type === "INCOME" ? "Income" : "Expense"),
        source,
        rawInput,
        currency,
        date: new Date(date),
      },
    });

    return NextResponse.json({
      success: true,
      transaction,
    });
  } catch (error: any) {
    console.error("Error creating transaction:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, amount, type, category, description, currency, date } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: "Transaction ID is required" },
        { status: 400 }
      );
    }

    const updated = await db.transaction.update({
      where: { id },
      data: {
        ...(amount !== undefined && { amount: Math.abs(Number(amount)) }),
        ...(type !== undefined && { type: type === "INCOME" ? "INCOME" : "EXPENSE" }),
        ...(category !== undefined && { category }),
        ...(description !== undefined && { description }),
        ...(currency !== undefined && { currency }),
        ...(date !== undefined && { date: new Date(date) }),
      },
    });

    return NextResponse.json({
      success: true,
      transaction: updated,
    });
  } catch (error: any) {
    console.error("Error updating transaction:", error);
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
        { success: false, error: "Transaction ID is required" },
        { status: 400 }
      );
    }

    await db.transaction.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: "Transaction deleted",
    });
  } catch (error: any) {
    console.error("Error deleting transaction:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
