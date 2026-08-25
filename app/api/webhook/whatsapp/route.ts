import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { parseTextWithAI } from "@/lib/gemini";

// WhatsApp Cloud API Webhook Verification (GET)
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  const appConfig = await db.appConfig.findFirst();
  const verifyToken =
    process.env.WHATSAPP_VERIFY_TOKEN ||
    appConfig?.webhookSecret ||
    "omnihub_secret_token";

  if (mode === "subscribe" && token === verifyToken) {
    console.log("WhatsApp Webhook verified successfully");
    return new Response(challenge, { status: 200 });
  }

  return new Response("Forbidden", { status: 403 });
}

// Incoming WhatsApp Webhook Events (POST)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Check for Meta WhatsApp Cloud API structure
    if (body.entry && body.entry[0]?.changes && body.entry[0].changes[0]?.value) {
      const value = body.entry[0].changes[0].value;
      const message = value.messages?.[0];

      if (message) {
        const fromNumber = String(message.from || "").replace(/[^0-9]/g, "");

        // 1. Check Sender Phone Number Whitelist
        const appConfig = await db.appConfig.findFirst();
        const allowedNumbersRaw =
          process.env.ALLOWED_PHONE_NUMBERS ||
          appConfig?.allowedPhoneNumbers ||
          appConfig?.whatsappPhone ||
          "";

        if (allowedNumbersRaw.trim()) {
          const allowedList = allowedNumbersRaw
            .split(",")
            .map((n) => n.replace(/[^0-9]/g, "").trim())
            .filter(Boolean);

          const isSenderAllowed = allowedList.some((allowed) => fromNumber.includes(allowed) || allowed.includes(fromNumber));

          if (!isSenderAllowed) {
            console.warn(`[Security Alert] Rejected WhatsApp message from unauthorized sender: ${fromNumber}`);
            // Return 200 to acknowledge webhook event but do not process
            return NextResponse.json({ success: true, status: "IGNORED_UNAUTHORIZED_SENDER" });
          }
        }

        let messageText = "";
        let isVoice = false;

        if (message.type === "text") {
          messageText = message.text?.body || "";
        } else if (message.type === "audio" || message.type === "voice") {
          isVoice = true;
          messageText = "[WhatsApp Voice Note]";
        }

        if (messageText && !isVoice) {
          const parsed = await parseTextWithAI(
            messageText,
            appConfig?.geminiApiKey || undefined,
            appConfig?.defaultCurrency || "USD"
          );

          if (parsed.amount > 0) {
            await db.transaction.create({
              data: {
                amount: parsed.amount,
                type: parsed.type,
                category: parsed.category,
                description: parsed.description,
                source: "WHATSAPP_TEXT",
                rawInput: `[From: ${fromNumber}] ${messageText}`,
                currency: parsed.currency,
                date: parsed.date ? new Date(parsed.date) : new Date(),
              },
            });

            console.log(`✅ Logged WhatsApp text expense: ${parsed.currency} ${parsed.amount} for ${parsed.category}`);
          }
        }
      }
    }

    // Return 200 OK to acknowledge WhatsApp Webhook
    return NextResponse.json({ success: true, status: "EVENT_RECEIVED" });
  } catch (error: any) {
    console.error("Error processing WhatsApp webhook:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
