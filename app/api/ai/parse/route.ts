import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { parseTextWithAI, parseAudioWithAI } from "@/lib/gemini";
import { AIParsedExpense } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get("content-type") || "";
    let text: string | undefined;
    let audioBase64: string | undefined;
    let mimeType: string | undefined;
    let userApiKey: string | undefined;
    let defaultCurrency = "MYR";
    let autoSave = true;
    let source = "WHATSAPP_TEXT";
    let conversationHistory: Array<{ role: "user" | "assistant"; text: string }> = [];

    // Fetch stored API key / Currency from DB config if available
    const appConfig = await db.appConfig.findFirst();
    if (appConfig?.defaultCurrency) {
      defaultCurrency = appConfig.defaultCurrency;
    }
    if (appConfig?.geminiApiKey) {
      userApiKey = appConfig.geminiApiKey;
    }

    if (contentType.includes("application/json")) {
      const body = await request.json();
      text = body.text;
      audioBase64 = body.audioBase64;
      mimeType = body.mimeType || "audio/webm";
      if (body.userApiKey) userApiKey = body.userApiKey;
      if (body.defaultCurrency) defaultCurrency = body.defaultCurrency;
      if (body.autoSave !== undefined) autoSave = body.autoSave;
      if (body.source) source = body.source;
      if (Array.isArray(body.conversationHistory)) conversationHistory = body.conversationHistory;
    } else if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      text = (formData.get("text") as string) || undefined;
      const file = formData.get("file") as File | null;
      if (file) {
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);
        audioBase64 = buffer.toString("base64");
        mimeType = file.type || "audio/webm";
        source = "WHATSAPP_VOICE";
      }
      if (formData.get("userApiKey")) userApiKey = formData.get("userApiKey") as string;
      if (formData.get("defaultCurrency")) defaultCurrency = formData.get("defaultCurrency") as string;
      if (formData.get("autoSave")) autoSave = formData.get("autoSave") === "true";
      const histStr = formData.get("conversationHistory") as string | null;
      if (histStr) {
        try {
          conversationHistory = JSON.parse(histStr);
        } catch {}
      }
    }

    // Retrieve active financial accounts to pass to Gemini
    const accounts = await db.account.findMany({
      where: { isArchived: false },
      select: { id: true, name: true, type: true },
      orderBy: { createdAt: "asc" },
    });

    let parsedResult: AIParsedExpense & { transcript?: string };

    if (audioBase64) {
      source = "WHATSAPP_VOICE";
      parsedResult = await parseAudioWithAI(
        audioBase64,
        mimeType || "audio/webm",
        userApiKey,
        defaultCurrency,
        accounts,
        conversationHistory
      );
    } else if (text) {
      parsedResult = await parseTextWithAI(
        text,
        userApiKey,
        defaultCurrency,
        accounts,
        conversationHistory
      );
    } else {
      return NextResponse.json(
        { success: false, error: "Either text or audio file must be provided" },
        { status: 400 }
      );
    }

    // 0. Handle Cancellation / Undo Intent
    if (parsedResult.intent === "CANCEL") {
      const target = parsedResult.cancelTarget || "LAST";

      if (target === "TODO") {
        const latestTodo = await db.todoTask.findFirst({
          orderBy: { createdAt: "desc" },
        });
        if (latestTodo) {
          await db.todoTask.delete({ where: { id: latestTodo.id } });
          return NextResponse.json({
            success: true,
            intent: "CANCEL",
            parsed: parsedResult,
            message: `🚫 已为您取消并删除最近的待办任务：“${latestTodo.title}”！`,
          });
        }
        return NextResponse.json({
          success: true,
          intent: "CANCEL",
          parsed: parsedResult,
          message: "未找到最近可撤销的待办任务。",
        });
      }

      if (target === "NOTE") {
        const latestNote = await db.note.findFirst({
          orderBy: { createdAt: "desc" },
        });
        if (latestNote) {
          await db.note.delete({ where: { id: latestNote.id } });
          return NextResponse.json({
            success: true,
            intent: "CANCEL",
            parsed: parsedResult,
            message: `🚫 已为您删除最近的便签：“${latestNote.title}”！`,
          });
        }
        return NextResponse.json({
          success: true,
          intent: "CANCEL",
          parsed: parsedResult,
          message: "未找到最近可删除的便签记录。",
        });
      }

      // Default: Transaction / LAST
      const latestTx = await db.transaction.findFirst({
        orderBy: { createdAt: "desc" },
        include: { account: true },
      });

      if (latestTx) {
        // Revert account balance
        if (latestTx.accountId) {
          if (latestTx.type === "EXPENSE") {
            await db.account.update({
              where: { id: latestTx.accountId },
              data: { balance: { increment: latestTx.amount } },
            }).catch(() => {});
          } else if (latestTx.type === "INCOME") {
            await db.account.update({
              where: { id: latestTx.accountId },
              data: { balance: { decrement: latestTx.amount } },
            }).catch(() => {});
          }
        }

        await db.transaction.delete({ where: { id: latestTx.id } });

        const refundText = latestTx.account
          ? `，款项已返还至账户 [${latestTx.account.name}]`
          : "";

        return NextResponse.json({
          success: true,
          intent: "CANCEL",
          parsed: parsedResult,
          message: `🚫 已为您撤销并删除最近的一笔支出：${latestTx.description || latestTx.category} (${latestTx.currency} ${latestTx.amount.toFixed(2)})${refundText}！`,
        });
      }

      return NextResponse.json({
        success: true,
        intent: "CANCEL",
        parsed: parsedResult,
        message: "未找到最近可撤销的记录。",
      });
    }

    // 1. Handle Task / Todo Intent
    if (parsedResult.intent === "TODO") {
      let savedTodo = null;
      if (autoSave && parsedResult.todoTitle) {
        savedTodo = await db.todoTask.create({
          data: {
            title: parsedResult.todoTitle,
            description: parsedResult.description || text || parsedResult.transcript || null,
            priority: parsedResult.todoPriority || "MEDIUM",
            status: "PENDING",
            dueDate: parsedResult.todoDueDate ? new Date(parsedResult.todoDueDate) : null,
          },
        });
      }

      return NextResponse.json({
        success: true,
        intent: "TODO",
        todo: savedTodo,
        parsed: parsedResult,
        message:
          parsedResult.replyMessage ||
          `📋 已添加待办任务：“${parsedResult.todoTitle || "新任务"}”`,
      });
    }

    // 2. Handle Note / Memo Intent
    if (parsedResult.intent === "NOTE") {
      let savedNote = null;
      if (autoSave) {
        savedNote = await db.note.create({
          data: {
            title: parsedResult.noteTitle || "灵感便签",
            content:
              parsedResult.noteContent ||
              parsedResult.description ||
              text ||
              parsedResult.transcript ||
              "",
            category: parsedResult.noteCategory || "General",
            color: "#3b82f6",
          },
        });
      }

      return NextResponse.json({
        success: true,
        intent: "NOTE",
        note: savedNote,
        parsed: parsedResult,
        message:
          parsedResult.replyMessage ||
          `📝 已保存便签：“${parsedResult.noteTitle || "灵感便签"}”`,
      });
    }

    // 3. Handle Clarification / Incomplete info Intent
    if (parsedResult.intent === "CLARIFICATION" || (parsedResult.amount === 0 && parsedResult.isMissingDetails)) {
      return NextResponse.json({
        success: true,
        intent: "CLARIFICATION",
        parsed: parsedResult,
        message:
          parsedResult.replyMessage ||
          "请问一共消费了多少钱呢？请告诉我具体金额以及付款账户（如现金或银行卡）。",
      });
    }

    // 4. Handle Financial Transaction Intent (EXPENSE / INCOME / TRANSFER)
    let savedTransaction = null;
    if (autoSave && parsedResult.amount > 0) {
      savedTransaction = await db.transaction.create({
        data: {
          amount: parsedResult.amount,
          type: parsedResult.type,
          category: parsedResult.category,
          description: parsedResult.description,
          source,
          rawInput: parsedResult.transcript
            ? `[Voice Transcript] ${parsedResult.transcript}`
            : text,
          currency: parsedResult.currency || defaultCurrency,
          accountId: parsedResult.accountId || null,
          date: parsedResult.date ? new Date(parsedResult.date) : new Date(),
        },
        include: {
          account: true,
        },
      });

      // Update account balance
      if (parsedResult.accountId) {
        if (parsedResult.type === "EXPENSE") {
          await db.account.update({
            where: { id: parsedResult.accountId },
            data: { balance: { decrement: parsedResult.amount } },
          }).catch(() => {});
        } else if (parsedResult.type === "INCOME") {
          await db.account.update({
            where: { id: parsedResult.accountId },
            data: { balance: { increment: parsedResult.amount } },
          }).catch(() => {});
        }
      }
    }

    const defaultMsg =
      parsedResult.amount > 0
        ? `✅ 已记录 ${parsedResult.currency || defaultCurrency} ${parsedResult.amount.toFixed(
            2
          )} (${parsedResult.category}) - ${parsedResult.description}${
            parsedResult.accountName ? ` [账户: ${parsedResult.accountName}]` : ""
          }`
        : "未检测到明确的支出金额。";

    return NextResponse.json({
      success: true,
      intent: parsedResult.type,
      parsed: parsedResult,
      transaction: savedTransaction,
      message: parsedResult.replyMessage || defaultMsg,
    });
  } catch (error: any) {
    console.error("Error in AI expense parser API:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to process input with AI" },
      { status: 500 }
    );
  }
}
