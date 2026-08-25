import { GoogleGenerativeAI } from "@google/generative-ai";
import { AIParsedExpense } from "./types";

const STANDARD_CATEGORIES = [
  "Food & Dining",
  "Transport & Fuel",
  "Shopping & Groceries",
  "Bills & Utilities",
  "Entertainment & Leisure",
  "Healthcare & Medical",
  "Housing & Rent",
  "Salary & Income",
  "Investments & Savings",
  "Travel & Holiday",
  "Education",
  "Other",
];

export async function parseTextWithAI(
  text: string,
  userApiKey?: string,
  defaultCurrency = "USD"
): Promise<AIParsedExpense> {
  const apiKey = userApiKey || process.env.GEMINI_API_KEY;

  if (apiKey) {
    try {
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({
        model: "gemini-1.5-flash",
        generationConfig: {
          responseMimeType: "application/json",
          temperature: 0.1,
        },
      });

      const today = new Date().toISOString().split("T")[0];
      const prompt = `You are a financial assistant for an expense tracker. 
Analyze this user text input: "${text}"
Current Date reference: ${today}
Default Currency: ${defaultCurrency}

Available Categories: ${STANDARD_CATEGORIES.join(", ")}

Extract and return ONLY a JSON object conforming to this schema:
{
  "amount": number (positive float, e.g. 15.50),
  "type": "EXPENSE" or "INCOME",
  "category": string (must be one of the available categories that best fits),
  "description": string (short clean summary of what it was, e.g. "Starbucks Coffee", "Salary", "Gasoline"),
  "currency": string (e.g. "USD", "MYR", "SGD", "EUR"),
  "date": string (ISO YYYY-MM-DD format. If user says 'yesterday', calculate relative to current date. Default to ${today}),
  "confidence": number (float between 0 and 1)
}`;

      const result = await model.generateContent(prompt);
      const responseText = result.response.text();
      const parsed = JSON.parse(responseText);

      return {
        amount: Math.abs(Number(parsed.amount) || 0),
        type: parsed.type === "INCOME" ? "INCOME" : "EXPENSE",
        category: STANDARD_CATEGORIES.includes(parsed.category)
          ? parsed.category
          : "Other",
        description: parsed.description || text,
        currency: parsed.currency || defaultCurrency,
        date: parsed.date || today,
        confidence: Number(parsed.confidence) || 0.95,
      };
    } catch (err) {
      console.warn("Gemini API call failed, falling back to heuristic parser:", err);
    }
  }

  // Fallback Rule-Based Parser (Works offline or without API key)
  return fallbackHeuristicParser(text, defaultCurrency);
}

export async function parseAudioWithAI(
  audioBase64: string,
  mimeType: string,
  userApiKey?: string,
  defaultCurrency = "USD"
): Promise<AIParsedExpense & { transcript?: string }> {
  const apiKey = userApiKey || process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return {
      amount: 0,
      type: "EXPENSE",
      category: "Other",
      description: "Audio received (Add GEMINI_API_KEY in WhatsApp Hub to enable direct speech-to-text AI extraction)",
      currency: defaultCurrency,
      date: new Date().toISOString().split("T")[0],
      confidence: 0.1,
      transcript: "[Audio transcription requires Gemini API Key]",
    };
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash",
      generationConfig: {
        responseMimeType: "application/json",
        temperature: 0.1,
      },
    });

    const today = new Date().toISOString().split("T")[0];
    const prompt = `Listen to this user's voice message regarding a financial transaction or expense/income.
Current Date: ${today}
Default Currency: ${defaultCurrency}
Available Categories: ${STANDARD_CATEGORIES.join(", ")}

Extract and return ONLY a JSON object:
{
  "transcript": string (verbatim speech transcription of what the user said),
  "amount": number (positive float, e.g. 24.50),
  "type": "EXPENSE" or "INCOME",
  "category": string (one of the available categories),
  "description": string (short clean merchant/item description),
  "currency": string,
  "date": string (ISO YYYY-MM-DD format),
  "confidence": number
}`;

    const audioPart = {
      inlineData: {
        data: audioBase64,
        mimeType: mimeType || "audio/ogg",
      },
    };

    const result = await model.generateContent([prompt, audioPart]);
    const responseText = result.response.text();
    const parsed = JSON.parse(responseText);

    return {
      amount: Math.abs(Number(parsed.amount) || 0),
      type: parsed.type === "INCOME" ? "INCOME" : "EXPENSE",
      category: STANDARD_CATEGORIES.includes(parsed.category)
        ? parsed.category
        : "Other",
      description: parsed.description || parsed.transcript || "Voice expense",
      currency: parsed.currency || defaultCurrency,
      date: parsed.date || today,
      confidence: Number(parsed.confidence) || 0.9,
      transcript: parsed.transcript || "",
    };
  } catch (err) {
    console.error("Gemini Audio error:", err);
    throw new Error("Failed to process voice note with AI.");
  }
}

function fallbackHeuristicParser(text: string, defaultCurrency: string): AIParsedExpense {
  const lower = text.toLowerCase();
  const today = new Date().toISOString().split("T")[0];

  // Detect type
  const isIncome =
    lower.includes("salary") ||
    lower.includes("income") ||
    lower.includes("received") ||
    lower.includes("earned") ||
    lower.includes("dividend") ||
    lower.includes("bonus") ||
    lower.includes("cashback");

  // Detect currency
  let currency = defaultCurrency;
  if (lower.includes("rm") || lower.includes("myr") || lower.includes("ringgit")) currency = "MYR";
  else if (lower.includes("sgd") || lower.includes("s$")) currency = "SGD";
  else if (lower.includes("eur") || lower.includes("€")) currency = "EUR";
  else if (lower.includes("gbp") || lower.includes("£")) currency = "GBP";
  else if (lower.includes("usd") || lower.includes("$")) currency = "USD";

  // Extract amount with regex
  const amountMatch = text.match(/[$€£¥]?\s*(\d+(?:[.,]\d{1,2})?)\s*(?:rm|myr|usd|sgd|bucks|dollars|ringgit)?/i);
  let amount = 0;
  if (amountMatch && amountMatch[1]) {
    amount = parseFloat(amountMatch[1].replace(",", "."));
  }

  // Detect category
  let category = "Other";
  if (isIncome) {
    category = "Salary & Income";
  } else if (
    lower.includes("lunch") ||
    lower.includes("dinner") ||
    lower.includes("breakfast") ||
    lower.includes("food") ||
    lower.includes("coffee") ||
    lower.includes("starbucks") ||
    lower.includes("mcdonald") ||
    lower.includes("restaurant") ||
    lower.includes("eat") ||
    lower.includes("cafe")
  ) {
    category = "Food & Dining";
  } else if (
    lower.includes("petrol") ||
    lower.includes("gas") ||
    lower.includes("fuel") ||
    lower.includes("grab") ||
    lower.includes("uber") ||
    lower.includes("taxi") ||
    lower.includes("parking") ||
    lower.includes("toll") ||
    lower.includes("train") ||
    lower.includes("mrt") ||
    lower.includes("bus")
  ) {
    category = "Transport & Fuel";
  } else if (
    lower.includes("grocery") ||
    lower.includes("groceries") ||
    lower.includes("supermarket") ||
    lower.includes("shopping") ||
    lower.includes("clothes") ||
    lower.includes("shoes") ||
    lower.includes("amazon") ||
    lower.includes("shopee") ||
    lower.includes("lazada")
  ) {
    category = "Shopping & Groceries";
  } else if (
    lower.includes("bill") ||
    lower.includes("electric") ||
    lower.includes("water") ||
    lower.includes("wifi") ||
    lower.includes("internet") ||
    lower.includes("mobile") ||
    lower.includes("utility") ||
    lower.includes("subscription") ||
    lower.includes("netflix") ||
    lower.includes("spotify")
  ) {
    category = "Bills & Utilities";
  } else if (
    lower.includes("movie") ||
    lower.includes("cinema") ||
    lower.includes("game") ||
    lower.includes("concert") ||
    lower.includes("party") ||
    lower.includes("bar") ||
    lower.includes("beer")
  ) {
    category = "Entertainment & Leisure";
  } else if (
    lower.includes("doctor") ||
    lower.includes("clinic") ||
    lower.includes("hospital") ||
    lower.includes("medicine") ||
    lower.includes("pharmacy") ||
    lower.includes("dentist")
  ) {
    category = "Healthcare & Medical";
  } else if (
    lower.includes("rent") ||
    lower.includes("mortgage") ||
    lower.includes("maintenance") ||
    lower.includes("furniture")
  ) {
    category = "Housing & Rent";
  } else if (
    lower.includes("stock") ||
    lower.includes("crypto") ||
    lower.includes("fund") ||
    lower.includes("invest")
  ) {
    category = "Investments & Savings";
  } else if (
    lower.includes("flight") ||
    lower.includes("hotel") ||
    lower.includes("airbnb") ||
    lower.includes("vacation") ||
    lower.includes("trip")
  ) {
    category = "Travel & Holiday";
  }

  // Clean description
  let desc = text.trim();
  if (desc.length > 50) desc = desc.substring(0, 47) + "...";

  return {
    amount,
    type: isIncome ? "INCOME" : "EXPENSE",
    category,
    description: desc || (isIncome ? "Income" : "Expense"),
    currency,
    date: today,
    confidence: 0.8,
  };
}
