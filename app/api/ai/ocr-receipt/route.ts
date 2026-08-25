import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { parseReceiptImageWithAI } from "@/lib/gemini";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get("content-type") || "";
    let imageBase64: string | undefined;
    let mimeType = "image/jpeg";
    let autoSave = false;

    // Get app config for Gemini API key
    const appConfig = await db.appConfig.findFirst();
    const defaultCurrency = appConfig?.defaultCurrency || "USD";
    const apiKey = appConfig?.geminiApiKey || process.env.GEMINI_API_KEY || undefined;

    if (contentType.includes("application/json")) {
      const body = await request.json();
      imageBase64 = body.imageBase64;
      mimeType = body.mimeType || "image/jpeg";
      if (body.autoSave !== undefined) autoSave = body.autoSave;
    } else if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      const file = formData.get("file") as File | null;
      if (file) {
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);
        imageBase64 = buffer.toString("base64");
        mimeType = file.type || "image/jpeg";
      }
      if (formData.get("autoSave")) autoSave = formData.get("autoSave") === "true";
    }

    if (!imageBase64) {
      return NextResponse.json(
        { success: false, error: "No receipt image data provided" },
        { status: 400 }
      );
    }

    // Call Gemini 1.5 Flash Vision OCR
    const ocrResult = await parseReceiptImageWithAI(
      imageBase64,
      mimeType,
      apiKey,
      defaultCurrency
    );

    let savedTransaction = null;
    if (autoSave && ocrResult.totalAmount > 0) {
      savedTransaction = await db.transaction.create({
        data: {
          amount: ocrResult.totalAmount,
          type: "EXPENSE",
          category: ocrResult.category,
          description: `${ocrResult.merchant} (Receipt Scan)`,
          source: "API",
          rawInput: `[Receipt OCR] Merchant: ${ocrResult.merchant}, Items: ${ocrResult.items.map((i) => i.name).join(", ")}`,
          currency: ocrResult.currency,
          date: ocrResult.date ? new Date(ocrResult.date) : new Date(),
        },
      });
    }

    return NextResponse.json({
      success: true,
      receipt: ocrResult,
      transaction: savedTransaction,
      message: `Scanned ${ocrResult.merchant}: ${ocrResult.currency} ${ocrResult.totalAmount.toFixed(2)}`,
    });
  } catch (error: any) {
    console.error("Receipt OCR error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to scan receipt image" },
      { status: 500 }
    );
  }
}
