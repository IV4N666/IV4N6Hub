import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { resolveWorkingModel, generateContentWithFallback } from "@/lib/gemini";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    let apiKey = body.apiKey;

    if (!apiKey || apiKey.includes("...")) {
      const appConfig = await db.appConfig.findFirst();
      apiKey = appConfig?.geminiApiKey || process.env.GEMINI_API_KEY;
    }

    if (!apiKey) {
      return NextResponse.json(
        { success: false, error: "No Gemini API Key provided or saved in configuration." },
        { status: 400 }
      );
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const resolvedModel = await resolveWorkingModel(apiKey);
    const result = await generateContentWithFallback(genAI, apiKey, "Hello! Respond with single word 'OK'.");
    const responseText = result.response.text().trim();

    return NextResponse.json({
      success: true,
      model: resolvedModel,
      message: `Successfully connected to Google Gemini (${resolvedModel})!`,
      sample: responseText,
    });
  } catch (error: any) {
    console.error("Gemini connection test failed:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to connect to Google Gemini API" },
      { status: 500 }
    );
  }
}
