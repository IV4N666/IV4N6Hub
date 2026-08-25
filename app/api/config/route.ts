import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { hashPassword } from "@/lib/auth";

// Mask sensitive API Key (e.g. AIzaSy...9xK1)
function maskApiKey(key?: string | null): string {
  if (!key) return "";
  if (key.length <= 8) return "********";
  return `${key.substring(0, 6)}...${key.substring(key.length - 4)}`;
}

export async function GET() {
  try {
    const config = await db.appConfig.findFirst();

    if (!config) {
      return NextResponse.json({
        success: true,
        config: {
          defaultCurrency: "USD",
          theme: "dark",
          hasGeminiKey: false,
          maskedGeminiKey: "",
          webhookSecret: "omnihub_secret_token",
          allowedPhoneNumbers: "",
          hasAdminPassword: !!process.env.ADMIN_PASSWORD,
        },
      });
    }

    // Return sanitized config (NEVER expose raw Gemini API key to client)
    return NextResponse.json({
      success: true,
      config: {
        id: config.id,
        defaultCurrency: config.defaultCurrency,
        theme: config.theme,
        whatsappPhone: config.whatsappPhone || "",
        webhookSecret: config.webhookSecret || "omnihub_secret_token",
        allowedPhoneNumbers: config.allowedPhoneNumbers || "",
        hasGeminiKey: !!config.geminiApiKey || !!process.env.GEMINI_API_KEY,
        maskedGeminiKey: maskApiKey(config.geminiApiKey || process.env.GEMINI_API_KEY),
        hasAdminPassword: !!config.adminPasswordHash || !!process.env.ADMIN_PASSWORD,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      defaultCurrency,
      geminiApiKey,
      whatsappPhone,
      webhookSecret,
      allowedPhoneNumbers,
      theme,
      newAdminPassword,
    } = body;

    const existing = await db.appConfig.findFirst();

    const updateData: any = {};

    if (defaultCurrency) updateData.defaultCurrency = defaultCurrency;
    if (whatsappPhone !== undefined) updateData.whatsappPhone = whatsappPhone.trim();
    if (webhookSecret !== undefined && webhookSecret.trim()) updateData.webhookSecret = webhookSecret.trim();
    if (allowedPhoneNumbers !== undefined) updateData.allowedPhoneNumbers = allowedPhoneNumbers.trim();
    if (theme) updateData.theme = theme;

    // Only update Gemini Key if user entered a real new key (not the masked placeholder or empty)
    if (geminiApiKey !== undefined && geminiApiKey.trim() !== "") {
      if (!geminiApiKey.includes("...")) {
        updateData.geminiApiKey = geminiApiKey.trim();
      }
    }

    // Update Master Passcode if requested
    if (newAdminPassword && newAdminPassword.trim().length >= 4) {
      updateData.adminPasswordHash = await hashPassword(newAdminPassword.trim());
    }

    const updated = await db.appConfig.upsert({
      where: { id: "default" },
      update: updateData,
      create: {
        id: "default",
        defaultCurrency: defaultCurrency || "USD",
        geminiApiKey: geminiApiKey && !geminiApiKey.includes("...") ? geminiApiKey.trim() : null,
        whatsappPhone: whatsappPhone || null,
        webhookSecret: webhookSecret || "omnihub_secret_token",
        allowedPhoneNumbers: allowedPhoneNumbers || null,
        adminPasswordHash:
          newAdminPassword && newAdminPassword.trim().length >= 4
            ? await hashPassword(newAdminPassword.trim())
            : null,
        theme: theme || "dark",
      },
    });

    return NextResponse.json({
      success: true,
      message: "Configuration updated successfully",
      config: {
        defaultCurrency: updated.defaultCurrency,
        whatsappPhone: updated.whatsappPhone,
        webhookSecret: updated.webhookSecret,
        allowedPhoneNumbers: updated.allowedPhoneNumbers,
        hasGeminiKey: !!updated.geminiApiKey,
        maskedGeminiKey: maskApiKey(updated.geminiApiKey),
      },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
