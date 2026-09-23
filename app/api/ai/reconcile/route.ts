import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  parseBankStatementWithAI,
  ExtractedStatementTransaction,
  parseTextWithAI,
} from "@/lib/gemini";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Helper to normalize strings for comparison
function cleanStr(str: string): string {
  return (str || "")
    .toLowerCase()
    .replace(/[^\w\u4e00-\u9fa5]/g, "")
    .trim();
}

// Check if two descriptions share a significant word or token
function areDescriptionsSimilar(descA: string, descB: string): boolean {
  const a = cleanStr(descA);
  const b = cleanStr(descB);
  if (!a || !b) return false;
  if (a.includes(b) || b.includes(a)) return true;

  // Split the already-cleaned `a` string to avoid re-processing descA
  const tokensA = a.split(/\s+/).filter((t) => t.length >= 3);
  for (const token of tokensA) {
    if (b.includes(token)) return true;
  }
  return false;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action = "ANALYZE" } = body;

    // Hoist appConfig fetch once — reused by ANALYZE and RESOLVE_CLARIFICATION
    let userApiKey: string | undefined;
    try {
      const config = await db.appConfig.findUnique({ where: { id: "default" } });
      if (config?.geminiApiKey) userApiKey = config.geminiApiKey;
    } catch (e) {
      console.warn("Could not fetch appConfig for geminiApiKey:", e);
    }

    // 1. ANALYZE: Parse statement via Gemini and cross-reference with DB
    if (action === "ANALYZE") {
      const { fileBase64, mimeType = "application/pdf", accountId, currency = "MYR" } = body;

      if (!fileBase64) {
        return NextResponse.json(
          { success: false, error: "File base64 data is required" },
          { status: 400 }
        );
      }

      // Fetch accounts for prompt context and matching
      const accounts = await db.account.findMany({
        select: { id: true, name: true, type: true },
      });

      // Parse with Gemini Multimodal AI
      const statement = await parseBankStatementWithAI(
        fileBase64,
        mimeType,
        userApiKey,
        currency,
        accounts
      );

      if (!statement.transactions || statement.transactions.length === 0) {
        return NextResponse.json({
          success: true,
          statement,
          summary: {
            totalStatementTransactions: 0,
            matchedCount: 0,
            discrepancyCount: 0,
            missingCount: 0,
            ambiguousCount: 0,
          },
          matched: [],
          discrepancies: [],
          missing: [],
          ambiguous: [],
          message: "未在账单文件中检测到有效交易记录。",
        });
      }

      // Determine date range to query DB
      let minDate = new Date();
      let maxDate = new Date(1970, 0, 1);

      for (const t of statement.transactions) {
        const d = new Date(t.date);
        if (!isNaN(d.getTime())) {
          if (d < minDate) minDate = d;
          if (d > maxDate) maxDate = d;
        }
      }

      // Buffer +- 3 days for bank processing / settlement delays
      const rangeStart = new Date(minDate);
      rangeStart.setDate(rangeStart.getDate() - 3);
      rangeStart.setHours(0, 0, 0, 0);

      const rangeEnd = new Date(maxDate);
      rangeEnd.setDate(rangeEnd.getDate() + 3);
      rangeEnd.setHours(23, 59, 59, 999);

      // Query database transactions in window
      const whereClause: any = {
        date: {
          gte: rangeStart,
          lte: rangeEnd,
        },
      };
      if (accountId) {
        whereClause.OR = [{ accountId: accountId }, { toAccountId: accountId }];
      }

      const dbTransactions = await db.transaction.findMany({
        where: whereClause,
        include: {
          account: true,
        },
        orderBy: { date: "asc" },
      });

      const matchedDbIds = new Set<string>();

      const matched: Array<{
        statementTx: ExtractedStatementTransaction;
        dbTx: {
          id: string;
          date: string;
          amount: number;
          description: string;
          category: string;
          subCategory?: string | null;
          accountName?: string | null;
        };
      }> = [];

      const discrepancies: Array<{
        statementTx: ExtractedStatementTransaction;
        dbTx: {
          id: string;
          date: string;
          amount: number;
          description: string;
          category: string;
          subCategory?: string | null;
          accountName?: string | null;
        };
        difference: number;
      }> = [];

      const missing: ExtractedStatementTransaction[] = [];
      const ambiguous: ExtractedStatementTransaction[] = [];

      // Reconcile statement transactions
      for (const stmtTx of statement.transactions) {
        const stmtDate = new Date(stmtTx.date);

        // Step A: Look for exact or strong match (same type, same amount within +-0.05, date within 3 days)
        let exactMatch = dbTransactions.find((dbTx) => {
          if (matchedDbIds.has(dbTx.id)) return false;
          if (dbTx.type !== stmtTx.type) return false;
          const amtDiff = Math.abs(dbTx.amount - stmtTx.amount);
          if (amtDiff > 0.05) return false;

          const daysDiff = Math.abs(
            (new Date(dbTx.date).getTime() - stmtDate.getTime()) / (1000 * 60 * 60 * 24)
          );
          return daysDiff <= 3;
        });

        if (exactMatch) {
          matchedDbIds.add(exactMatch.id);
          matched.push({
            statementTx: stmtTx,
            dbTx: {
              id: exactMatch.id,
              date: exactMatch.date.toISOString().split("T")[0],
              amount: exactMatch.amount,
              description: exactMatch.description || "Transaction",
              category: exactMatch.category,
              subCategory: exactMatch.subCategory,
              accountName: exactMatch.account?.name,
            },
          });
          continue;
        }

        // Step B: Look for amount discrepancy (similar merchant/description within +-3 days, different amount)
        let discMatch = dbTransactions.find((dbTx) => {
          if (matchedDbIds.has(dbTx.id)) return false;
          if (dbTx.type !== stmtTx.type) return false;
          const daysDiff = Math.abs(
            (new Date(dbTx.date).getTime() - stmtDate.getTime()) / (1000 * 60 * 60 * 24)
          );
          if (daysDiff > 3) return false;

          return (
            areDescriptionsSimilar(dbTx.description || "", stmtTx.description) ||
            areDescriptionsSimilar(dbTx.description || "", stmtTx.rawNarration)
          );
        });

        if (discMatch) {
          matchedDbIds.add(discMatch.id);
          discrepancies.push({
            statementTx: stmtTx,
            dbTx: {
              id: discMatch.id,
              date: discMatch.date.toISOString().split("T")[0],
              amount: discMatch.amount,
              description: discMatch.description || "Transaction",
              category: discMatch.category,
              subCategory: discMatch.subCategory,
              accountName: discMatch.account?.name,
            },
            difference: Number((stmtTx.amount - discMatch.amount).toFixed(2)),
          });
          continue;
        }

        // Step C: If transaction is marked ambiguous by Gemini (e.g. unclear DuitNow/FPX)
        if (stmtTx.isAmbiguous) {
          ambiguous.push(stmtTx);
          continue;
        }

        // Step D: Missing from DB history
        missing.push(stmtTx);
      }

      return NextResponse.json({
        success: true,
        statement: {
          bankName: statement.bankName,
          accountNumber: statement.accountNumber,
          statementPeriod: statement.statementPeriod,
          currency: statement.currency,
          totalDebit: statement.totalDebit,
          totalCredit: statement.totalCredit,
        },
        summary: {
          totalStatementTransactions: statement.transactions.length,
          matchedCount: matched.length,
          discrepancyCount: discrepancies.length,
          missingCount: missing.length,
          ambiguousCount: ambiguous.length,
        },
        matched,
        discrepancies,
        missing,
        ambiguous,
      });
    }

    // 2. BATCH_IMPORT: Create missing transactions
    if (action === "BATCH_IMPORT") {
      const { items, accountId } = body;
      if (!Array.isArray(items) || items.length === 0) {
        return NextResponse.json(
          { success: false, error: "No items provided to import" },
          { status: 400 }
        );
      }

      // Filter valid items upfront
      const validItems = items.filter((item: any) => Math.abs(Number(item.amount) || 0) > 0);

      // Phase 1: create all transactions in parallel
      await Promise.all(
        validItems.map((item: any) => {
          const numAmount = Math.abs(Number(item.amount));
          const txType =
            item.type === "INCOME" ? "INCOME" : item.type === "TRANSFER" ? "TRANSFER" : "EXPENSE";
          return db.transaction.create({
            data: {
              amount: numAmount,
              type: txType,
              category: item.category || "Other",
              subCategory: item.subCategory || null,
              description: item.description?.trim() || "Statement Transaction",
              rawInput: item.rawNarration || item.description || null,
              source: "AI_STATEMENT",
              currency: item.currency || "MYR",
              accountId: item.accountId || accountId || null,
              date: new Date(item.date || new Date()),
            },
          });
        })
      );

      // Phase 2: batch balance adjustments grouped by accountId
      type BalanceDelta = { increment?: number; decrement?: number };
      const balanceMap = new Map<string, { inc: number; dec: number }>();
      for (const item of validItems) {
        const targetId = item.accountId || accountId;
        if (!targetId) continue;
        const numAmount = Math.abs(Number(item.amount));
        const txType =
          item.type === "INCOME" ? "INCOME" : item.type === "TRANSFER" ? "TRANSFER" : "EXPENSE";
        if (!balanceMap.has(targetId)) balanceMap.set(targetId, { inc: 0, dec: 0 });
        const entry = balanceMap.get(targetId)!;
        if (txType === "EXPENSE") entry.dec += numAmount;
        else if (txType === "INCOME") entry.inc += numAmount;
      }

      await Promise.all(
        Array.from(balanceMap.entries()).map(([id, { inc, dec }]) => {
          const netDelta = inc - dec;
          const data: BalanceDelta =
            netDelta >= 0 ? { increment: netDelta } : { decrement: -netDelta };
          return db.account.update({ where: { id }, data: { balance: data } }).catch(() => {});
        })
      );

      return NextResponse.json({
        success: true,
        message: `成功批量导入 ${validItems.length} 笔账单交易！`,
        importedCount: validItems.length,
      });
    }

    // 3. APPLY_DISCREPANCY: Fix amount differences
    if (action === "APPLY_DISCREPANCY") {
      const { transactionId, newAmount, newDescription, updateBalance = true } = body;

      if (!transactionId || newAmount === undefined) {
        return NextResponse.json(
          { success: false, error: "transactionId and newAmount are required" },
          { status: 400 }
        );
      }

      const existing = await db.transaction.findUnique({
        where: { id: transactionId },
      });

      if (!existing) {
        return NextResponse.json(
          { success: false, error: "Transaction not found" },
          { status: 404 }
        );
      }

      const oldAmount = existing.amount;
      const targetAmount = Math.abs(Number(newAmount));
      const amountDiff = targetAmount - oldAmount;

      const updated = await db.transaction.update({
        where: { id: transactionId },
        data: {
          amount: targetAmount,
          ...(newDescription ? { description: newDescription.trim() } : {}),
        },
      });

      // Update account balance difference
      if (updateBalance && existing.accountId && amountDiff !== 0) {
        if (existing.type === "EXPENSE") {
          // e.g. amount increased by 5 => balance decrements by 5
          await db.account.update({
            where: { id: existing.accountId },
            data: { balance: { decrement: amountDiff } },
          }).catch(() => {});
        } else if (existing.type === "INCOME") {
          // e.g. amount increased by 5 => balance increments by 5
          await db.account.update({
            where: { id: existing.accountId },
            data: { balance: { increment: amountDiff } },
          }).catch(() => {});
        }
      }

      return NextResponse.json({
        success: true,
        message: `已同步更新交易金额为 RM ${targetAmount.toFixed(2)}！`,
        transaction: updated,
      });
    }

    // 4. RESOLVE_CLARIFICATION: User answered ambiguous transaction in chat
    if (action === "RESOLVE_CLARIFICATION") {
      const { item, userExplanation, accountId } = body;

      if (!item || !userExplanation) {
        return NextResponse.json(
          { success: false, error: "Item and userExplanation are required" },
          { status: 400 }
        );
      }

      // Analyze user's clarification text with AI (userApiKey already resolved at handler top)
      const accounts = await db.account.findMany({
        select: { id: true, name: true, type: true },
      });

      const parsed = await parseTextWithAI(
        `针对这笔账单交易（金额：${item.amount}，原描述：${item.rawNarration || item.description}），用户补充说明：${userExplanation}`,
        userApiKey,
        item.currency || "MYR",
        accounts
      );

      const numAmount = Math.abs(Number(item.amount) || parsed.amount || 0);
      const txType =
        item.type === "INCOME" ? "INCOME" : item.type === "TRANSFER" ? "TRANSFER" : "EXPENSE";

      const finalCategory = parsed.category || item.category || "Other";
      const finalSubCategory = parsed.subCategory || item.subCategory || null;
      const finalDescription =
        parsed.description || `${item.description} (${userExplanation})`;

      const createdTx = await db.transaction.create({
        data: {
          amount: numAmount,
          type: txType,
          category: finalCategory,
          subCategory: finalSubCategory,
          description: finalDescription,
          rawInput: `${item.rawNarration || item.description} | 补充: ${userExplanation}`,
          source: "AI_STATEMENT",
          currency: item.currency || "MYR",
          accountId: parsed.accountId || accountId || item.accountId || null,
          date: new Date(item.date || new Date()),
        },
      });

      const targetAccountId = parsed.accountId || accountId || item.accountId;
      if (targetAccountId) {
        if (txType === "EXPENSE") {
          await db.account.update({
            where: { id: targetAccountId },
            data: { balance: { decrement: numAmount } },
          }).catch(() => {});
        } else if (txType === "INCOME") {
          await db.account.update({
            where: { id: targetAccountId },
            data: { balance: { increment: numAmount } },
          }).catch(() => {});
        }
      }

      return NextResponse.json({
        success: true,
        message: `已为您补全并记录：${finalDescription} (RM ${numAmount.toFixed(2)})，分类：${finalCategory}！`,
        transaction: createdTx,
      });
    }

    return NextResponse.json({ success: false, error: "Invalid action" }, { status: 400 });
  } catch (error: any) {
    console.error("Statement reconciliation API error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to process reconciliation" },
      { status: 500 }
    );
  }
}
