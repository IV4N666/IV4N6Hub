import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

const DEFAULT_ACCOUNTS = [
  {
    name: "Cash Wallet",
    type: "CASH",
    currency: "MYR",
    balance: 350.0,
    initialBalance: 350.0,
    color: "#10b981",
    icon: "Banknote",
  },
  {
    name: "Maybank / Primary Bank",
    type: "BANK",
    currency: "MYR",
    balance: 4850.0,
    initialBalance: 4850.0,
    color: "#3b82f6",
    icon: "Landmark",
  },
  {
    name: "Touch 'n Go eWallet",
    type: "E_WALLET",
    currency: "MYR",
    balance: 220.0,
    initialBalance: 220.0,
    color: "#06b6d4",
    icon: "Smartphone",
  },
  {
    name: "Credit Card (CIMB / Maybank)",
    type: "CREDIT_CARD",
    currency: "MYR",
    balance: 0.0,
    initialBalance: 0.0,
    color: "#ec4899",
    icon: "CreditCard",
  },
];

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const includeArchived = searchParams.get("includeArchived") === "true";

    let accounts = await db.account.findMany({
      where: includeArchived ? undefined : { isArchived: false },
      orderBy: { createdAt: "asc" },
      include: {
        _count: {
          select: { transactions: true, transfersIn: true },
        },
      },
    });

    // Auto-seed default accounts if table is completely empty
    if (accounts.length === 0 && !includeArchived) {
      for (const def of DEFAULT_ACCOUNTS) {
        await db.account.create({ data: def });
      }
      accounts = await db.account.findMany({
        where: { isArchived: false },
        orderBy: { createdAt: "asc" },
        include: {
          _count: {
            select: { transactions: true, transfersIn: true },
          },
        },
      });
    }

    let totalAssets = 0;
    let totalLiabilities = 0;

    accounts.forEach((acc) => {
      if (acc.type === "CREDIT_CARD") {
        if (acc.balance > 0) {
          totalLiabilities += acc.balance;
        } else if (acc.balance < 0) {
          // Negative credit card balance = debt
          totalLiabilities += Math.abs(acc.balance);
        }
      } else {
        if (acc.balance >= 0) {
          totalAssets += acc.balance;
        } else {
          totalLiabilities += Math.abs(acc.balance);
        }
      }
    });

    const netWorth = totalAssets - totalLiabilities;

    return NextResponse.json({
      success: true,
      count: accounts.length,
      accounts,
      summary: {
        totalAssets: Math.round(totalAssets * 100) / 100,
        totalLiabilities: Math.round(totalLiabilities * 100) / 100,
        netWorth: Math.round(netWorth * 100) / 100,
      },
    });
  } catch (error: any) {
    console.error("Error fetching accounts:", error);
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
      type = "BANK",
      currency = "MYR",
      balance = 0,
      color = "#3b82f6",
      icon = "Wallet",
    } = body;

    if (!name || typeof name !== "string") {
      return NextResponse.json(
        { success: false, error: "Account name is required" },
        { status: 400 }
      );
    }

    const numBalance = Number(balance) || 0;

    const account = await db.account.create({
      data: {
        name: name.trim(),
        type,
        currency,
        balance: numBalance,
        initialBalance: numBalance,
        color,
        icon,
      },
    });

    return NextResponse.json({
      success: true,
      account,
    });
  } catch (error: any) {
    console.error("Error creating account:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, name, type, currency, balance, color, icon, isArchived } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: "Account ID is required" },
        { status: 400 }
      );
    }

    const updated = await db.account.update({
      where: { id },
      data: {
        ...(name !== undefined && { name: name.trim() }),
        ...(type !== undefined && { type }),
        ...(currency !== undefined && { currency }),
        ...(balance !== undefined && { balance: Number(balance) }),
        ...(color !== undefined && { color }),
        ...(icon !== undefined && { icon }),
        ...(isArchived !== undefined && { isArchived: Boolean(isArchived) }),
      },
    });

    return NextResponse.json({
      success: true,
      account: updated,
    });
  } catch (error: any) {
    console.error("Error updating account:", error);
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
    const hardDelete = searchParams.get("hard") === "true";

    if (!id) {
      return NextResponse.json(
        { success: false, error: "Account ID is required" },
        { status: 400 }
      );
    }

    if (hardDelete) {
      await db.account.delete({ where: { id } });
    } else {
      // Soft delete / archive
      await db.account.update({
        where: { id },
        data: { isArchived: true },
      });
    }

    return NextResponse.json({
      success: true,
      message: hardDelete ? "Account deleted permanently" : "Account archived",
    });
  } catch (error: any) {
    console.error("Error deleting account:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
