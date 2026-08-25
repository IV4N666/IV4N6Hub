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
    let defaultCurrency = "USD";
    let autoSave = true;
    let source = "WHATSAPP_TEXT";

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
    }

    let parsedResult: AIParsedExpense & { transcript?: string };

    if (audioBase64) {
      source = "WHATSAPP_VOICE";
      parsedResult = await parseAudioWithAI(audioBase64, mimeType || "audio/webm", userApiKey, defaultCurrency);
    } else if (text) {
      parsedResult = await parseTextWithAI(text, userApiKey, defaultCurrency);
    } else {
      return NextResponse.json(
        { success: false, error: "Either text or audio file must be provided" },
        { status: 400 }
      );
    }

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
          date: parsedResult.date ? new Date(parsedResult.date) : new Date(),
        },
      });
    }

    return NextResponse.json({
      success: true,
      parsed: parsedResult,
      transaction: savedTransaction,
      message:
        parsedResult.amount > 0
          ? `Successfully recorded ${parsedResult.currency} ${parsedResult.amount.toFixed(
              2
            )} for ${parsedResult.category} (${parsedResult.description})`
          : "Could not detect a valid expense amount.",
    });
  } catch (error: any) {
    console.error("Error in AI expense parser API:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to process input with AI" },
      { status: 500 }
    );
  }
}
