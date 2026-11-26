import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category");
    const subCategory = searchParams.get("subCategory");
    const type = searchParams.get("type");
    const source = searchParams.get("source");
    const accountId = searchParams.get("accountId");
    const tag = searchParams.get("tag");
    const query = searchParams.get("q");
    const month = searchParams.get("month"); // "YYYY-MM"
    const limit = parseInt(searchParams.get("limit") || "100", 10);

    const where: any = {};

    if (category && category !== "ALL") {
      where.category = category;
    }
    if (subCategory && subCategory !== "ALL") {
      where.subCategory = subCategory;
    }
    if (type && type !== "ALL") {
      where.type = type;
    }
    if (source && source !== "ALL") {
      where.source = source;
    }
    const andConditions: any[] = [];

    if (accountId && accountId !== "ALL") {
      andConditions.push({
        OR: [{ accountId: accountId }, { toAccountId: accountId }],
      });
    }
    if (tag) {
      where.tags = { contains: tag };
    }
    if (query) {
      andConditions.push({
        OR: [
          { description: { contains: query, mode: "insensitive" } },
          { category: { contains: query, mode: "insensitive" } },
          { subCategory: { contains: query, mode: "insensitive" } },
          { tags: { contains: query, mode: "insensitive" } },
          { rawInput: { contains: query, mode: "insensitive" } },
        ],
      });
    }
    if (andConditions.length > 0) {
      where.AND = andConditions;
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
      include: {
        account: true,
        toAccount: true,
      },
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
      subCategory,
      tags,
      description,
      source = "WEB_MANUAL",
      rawInput,
      currency = "MYR",
      accountId,
      toAccountId,
      date = new Date().toISOString(),
    } = body;

    if (!amount || isNaN(Number(amount))) {
      return NextResponse.json(
        { success: false, error: "Valid amount is required" },
        { status: 400 }
      );
    }

    const numAmount = Math.abs(Number(amount));
    const validCategory =
      type === "TRANSFER"
        ? "Transfer"
        : type === "INCOME"
        ? category || "Salary & Income"
        : category || "Food & Dining";

    const defaultDesc =
      type === "TRANSFER"
        ? "Account Transfer"
        : type === "INCOME"
        ? "Income"
        : "Expense";

    // Atomically create Transaction and update Account balances
    const transaction = await db.$transaction(async (txClient) => {
      const createdTx = await txClient.transaction.create({
        data: {
          amount: numAmount,
          type: type === "INCOME" ? "INCOME" : type === "TRANSFER" ? "TRANSFER" : "EXPENSE",
          category: validCategory,
          subCategory: subCategory || null,
          tags: tags || null,
          description: description?.trim() || defaultDesc,
          source,
          rawInput,
          currency,
          accountId: accountId || null,
          toAccountId: type === "TRANSFER" ? toAccountId || null : null,
          date: new Date(date),
        },
        include: {
          account: true,
          toAccount: true,
        },
      });

      if (type === "TRANSFER") {
        if (accountId) {
          await txClient.account.update({
            where: { id: accountId },
            data: { balance: { decrement: numAmount } },
          });
        }
        if (toAccountId) {
          await txClient.account.update({
            where: { id: toAccountId },
            data: { balance: { increment: numAmount } },
          });
        }
      } else if (type === "EXPENSE" && accountId) {
        await txClient.account.update({
          where: { id: accountId },
          data: { balance: { decrement: numAmount } },
        });
      } else if (type === "INCOME" && accountId) {
        await txClient.account.update({
          where: { id: accountId },
          data: { balance: { increment: numAmount } },
        });
      }

      return createdTx;
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
    const {
      id,
      amount,
      type,
      category,
      subCategory,
      tags,
      description,
      currency,
      accountId,
      toAccountId,
      date,
    } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: "Transaction ID is required" },
        { status: 400 }
      );
    }

    const oldTx = await db.transaction.findUnique({ where: { id } });
    if (!oldTx) {
      return NextResponse.json(
        { success: false, error: "Transaction not found" },
        { status: 404 }
      );
    }

    // 1. Revert previous balance impact
    if (oldTx.type === "TRANSFER") {
      if (oldTx.accountId) {
        await db.account.update({
          where: { id: oldTx.accountId },
          data: { balance: { increment: oldTx.amount } },
        }).catch(() => {});
      }
      if (oldTx.toAccountId) {
        await db.account.update({
          where: { id: oldTx.toAccountId },
          data: { balance: { decrement: oldTx.amount } },
        }).catch(() => {});
      }
    } else if (oldTx.type === "EXPENSE" && oldTx.accountId) {
      await db.account.update({
        where: { id: oldTx.accountId },
        data: { balance: { increment: oldTx.amount } },
      }).catch(() => {});
    } else if (oldTx.type === "INCOME" && oldTx.accountId) {
      await db.account.update({
        where: { id: oldTx.accountId },
        data: { balance: { decrement: oldTx.amount } },
      }).catch(() => {});
    }

    // 2. Determine new values
    const newAmount = amount !== undefined ? Math.abs(Number(amount)) : oldTx.amount;
    const newType =
      type !== undefined
        ? type === "INCOME"
          ? "INCOME"
          : type === "TRANSFER"
          ? "TRANSFER"
          : "EXPENSE"
        : oldTx.type;
    const newAccountId = accountId !== undefined ? (accountId || null) : oldTx.accountId;
    const newToAccountId = toAccountId !== undefined ? (toAccountId || null) : oldTx.toAccountId;

    // 3. Apply new balance impact
    if (newType === "TRANSFER") {
      if (newAccountId) {
        await db.account.update({
          where: { id: newAccountId },
          data: { balance: { decrement: newAmount } },
        }).catch(() => {});
      }
      if (newToAccountId) {
        await db.account.update({
          where: { id: newToAccountId },
          data: { balance: { increment: newAmount } },
        }).catch(() => {});
      }
    } else if (newType === "EXPENSE" && newAccountId) {
      await db.account.update({
        where: { id: newAccountId },
        data: { balance: { decrement: newAmount } },
      }).catch(() => {});
    } else if (newType === "INCOME" && newAccountId) {
      await db.account.update({
        where: { id: newAccountId },
        data: { balance: { increment: newAmount } },
      }).catch(() => {});
    }

    const updated = await db.transaction.update({
      where: { id },
      data: {
        ...(amount !== undefined && { amount: newAmount }),
        ...(type !== undefined && { type: newType }),
        ...(category !== undefined && { category }),
        ...(subCategory !== undefined && { subCategory }),
        ...(tags !== undefined && { tags }),
        ...(description !== undefined && { description }),
        ...(currency !== undefined && { currency }),
        accountId: newAccountId,
        toAccountId: newToAccountId,
        ...(date !== undefined && { date: new Date(date) }),
      },
      include: {
        account: true,
        toAccount: true,
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

    await db.$transaction(async (txClient) => {
      const tx = await txClient.transaction.findUnique({ where: { id } });
      if (!tx) return;

      // Revert account balance changes
      if (tx.type === "TRANSFER") {
        if (tx.accountId) {
          await txClient.account.update({
            where: { id: tx.accountId },
            data: { balance: { increment: tx.amount } },
          });
        }
        if (tx.toAccountId) {
          await txClient.account.update({
            where: { id: tx.toAccountId },
            data: { balance: { decrement: tx.amount } },
          });
        }
      } else if (tx.type === "EXPENSE" && tx.accountId) {
        await txClient.account.update({
          where: { id: tx.accountId },
          data: { balance: { increment: tx.amount } },
        });
      } else if (tx.type === "INCOME" && tx.accountId) {
        await txClient.account.update({
          where: { id: tx.accountId },
          data: { balance: { decrement: tx.amount } },
        });
      }

      await txClient.transaction.delete({
        where: { id },
      });
    });

    return NextResponse.json({
      success: true,
      message: "Transaction deleted and balances updated",
    });
  } catch (error: any) {
    console.error("Error deleting transaction:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
