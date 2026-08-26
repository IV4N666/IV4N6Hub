import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const format = searchParams.get("format") || "json";

    const [transactions, accounts, budgets, recurring] = await Promise.all([
      db.transaction.findMany({
        orderBy: { date: "desc" },
        include: { account: true, toAccount: true },
      }),
      db.account.findMany({ orderBy: { createdAt: "asc" } }),
      db.categoryBudget.findMany(),
      db.recurringBill.findMany(),
    ]);

    if (format === "csv") {
      const headers = [
        "ID",
        "Date",
        "Type",
        "Category",
        "SubCategory",
        "Tags",
        "Amount",
        "Currency",
        "Description",
        "Account",
        "ToAccount",
        "Source",
      ];

      const csvRows = transactions.map((t) => {
        return [
          t.id,
          t.date.toISOString(),
          t.type,
          `"${(t.category || "").replace(/"/g, '""')}"`,
          `"${(t.subCategory || "").replace(/"/g, '""')}"`,
          `"${(t.tags || "").replace(/"/g, '""')}"`,
          t.amount,
          t.currency,
          `"${(t.description || "").replace(/"/g, '""')}"`,
          `"${(t.account?.name || "").replace(/"/g, '""')}"`,
          `"${(t.toAccount?.name || "").replace(/"/g, '""')}"`,
          t.source,
        ].join(",");
      });

      const csvContent = [headers.join(","), ...csvRows].join("\n");

      return new NextResponse(csvContent, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="iv4n6hub_backup_${new Date().toISOString().split("T")[0]}.csv"`,
        },
      });
    }

    const backupPayload = {
      app: "IV4N6Hub",
      version: "2.0.0",
      exportedAt: new Date().toISOString(),
      counts: {
        transactions: transactions.length,
        accounts: accounts.length,
        budgets: budgets.length,
        recurring: recurring.length,
      },
      data: {
        accounts,
        budgets,
        recurring,
        transactions,
      },
    };

    return NextResponse.json({
      success: true,
      backup: backupPayload,
    });
  } catch (error: any) {
    console.error("Error creating backup:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { mode, data, transactions } = body;

    if (mode === "RESTORE_JSON") {
      if (!data || !data.data) {
        return NextResponse.json(
          { success: false, error: "Invalid backup JSON format" },
          { status: 400 }
        );
      }

      const {
        accounts = [],
        budgets = [],
        recurring = [],
        transactions: txs = [],
      } = data.data;

      // Restore accounts
      for (const acc of accounts) {
        await db.account.upsert({
          where: { id: acc.id },
          create: {
            id: acc.id,
            name: acc.name,
            type: acc.type,
            currency: acc.currency || "MYR",
            balance: acc.balance || 0,
            initialBalance: acc.initialBalance || 0,
            color: acc.color || "#3b82f6",
            icon: acc.icon || "Wallet",
            isArchived: Boolean(acc.isArchived),
          },
          update: {
            name: acc.name,
            type: acc.type,
            currency: acc.currency,
            balance: acc.balance,
            color: acc.color,
            icon: acc.icon,
            isArchived: Boolean(acc.isArchived),
          },
        });
      }

      // Restore transactions
      for (const tx of txs) {
        await db.transaction.upsert({
          where: { id: tx.id },
          create: {
            id: tx.id,
            amount: tx.amount,
            type: tx.type,
            category: tx.category,
            subCategory: tx.subCategory,
            tags: tx.tags,
            description: tx.description,
            source: tx.source || "WEB_MANUAL",
            currency: tx.currency || "MYR",
            accountId: tx.accountId || null,
            toAccountId: tx.toAccountId || null,
            date: new Date(tx.date),
          },
          update: {
            amount: tx.amount,
            type: tx.type,
            category: tx.category,
            subCategory: tx.subCategory,
            tags: tx.tags,
            description: tx.description,
            accountId: tx.accountId,
            toAccountId: tx.toAccountId,
            date: new Date(tx.date),
          },
        });
      }

      return NextResponse.json({
        success: true,
        message: `Successfully restored ${accounts.length} accounts and ${txs.length} transactions`,
      });
    }

    if (mode === "IMPORT_BATCH_TRANSACTIONS") {
      if (!Array.isArray(transactions) || transactions.length === 0) {
        return NextResponse.json(
          { success: false, error: "No transactions provided for import" },
          { status: 400 }
        );
      }

      let importedCount = 0;
      for (const t of transactions) {
        if (!t.amount || isNaN(Number(t.amount))) continue;
        await db.transaction.create({
          data: {
            amount: Math.abs(Number(t.amount)),
            type: t.type === "INCOME" ? "INCOME" : t.type === "TRANSFER" ? "TRANSFER" : "EXPENSE",
            category: t.category || "Other",
            subCategory: t.subCategory || null,
            tags: t.tags || null,
            description: t.description || "Imported Transaction",
            source: "API",
            currency: t.currency || "MYR",
            accountId: t.accountId || null,
            toAccountId: t.toAccountId || null,
            date: t.date ? new Date(t.date) : new Date(),
          },
        });
        importedCount++;
      }

      return NextResponse.json({
        success: true,
        importedCount,
        message: `Successfully imported ${importedCount} transactions`,
      });
    }

    return NextResponse.json(
      { success: false, error: "Unknown backup mode" },
      { status: 400 }
    );
  } catch (error: any) {
    console.error("Error processing backup:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
