import { GoogleGenerativeAI } from "@google/generative-ai";
import { AIParsedExpense } from "./types";

export interface OCRReceiptResult {
  merchant: string;
  totalAmount: number;
  currency: string;
  date: string;
  category: string;
  items: Array<{ name: string; price: number; quantity?: number }>;
  tax?: number;
  notes?: string;
}

export interface SmartIntentResult {
  type: "EXPENSE" | "INCOME" | "TODO" | "NOTE";
  title: string;
  details: string;
  amount?: number;
  category?: string;
  currency?: string;
  dueDate?: string;
  priority?: "HIGH" | "MEDIUM" | "LOW";
}

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

  // Fallback Rule-Based Parser
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
      description: "Audio received (Add GEMINI_API_KEY to enable speech-to-text AI extraction)",
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

// Vision OCR Receipt & Invoice Scanner
export async function parseReceiptImageWithAI(
  imageBase64: string,
  mimeType = "image/jpeg",
  userApiKey?: string,
  defaultCurrency = "USD"
): Promise<OCRReceiptResult> {
  const apiKey = userApiKey || process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error("Google Gemini API Key is required for receipt optical scanning.");
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: "gemini-1.5-flash",
    generationConfig: {
      responseMimeType: "application/json",
      temperature: 0.1,
    },
  });

  const today = new Date().toISOString().split("T")[0];
  const prompt = `You are an expert OCR financial receipt and invoice scanner.
Analyze this receipt/invoice photo carefully.
Current Reference Date: ${today}
Default Currency: ${defaultCurrency}
Standard Categories: ${STANDARD_CATEGORIES.join(", ")}

Extract and return ONLY a JSON object:
{
  "merchant": string (store, restaurant, or vendor name, e.g. "Costco Wholesale", "Starbucks"),
  "totalAmount": number (final total grand amount paid),
  "currency": string (e.g. "USD", "MYR", "SGD", "EUR", "CNY"),
  "date": string (ISO YYYY-MM-DD if found on receipt, else default to ${today}),
  "category": string (best matching category from standard categories list),
  "tax": number (sales tax or VAT amount if itemized, else 0),
  "items": [
    {
      "name": string (product/service item name),
      "price": number (item cost),
      "quantity": number (quantity purchased)
    }
  ],
  "notes": string (brief description of the transaction)
}`;

  const imagePart = {
    inlineData: {
      data: imageBase64,
      mimeType: mimeType || "image/jpeg",
    },
  };

  const result = await model.generateContent([prompt, imagePart]);
  const responseText = result.response.text();
  const parsed = JSON.parse(responseText);

  return {
    merchant: parsed.merchant || "Receipt Store",
    totalAmount: Math.abs(Number(parsed.totalAmount) || 0),
    currency: parsed.currency || defaultCurrency,
    date: parsed.date || today,
    category: STANDARD_CATEGORIES.includes(parsed.category) ? parsed.category : "Shopping & Groceries",
    items: Array.isArray(parsed.items) ? parsed.items : [],
    tax: Number(parsed.tax) || 0,
    notes: parsed.notes || `Scanned receipt from ${parsed.merchant || "merchant"}`,
  };
}

// Multi-intent AI Parser (Routes to Expense, Todo Task, or Note)
export async function parseSmartVoiceIntent(
  text: string,
  userApiKey?: string,
  defaultCurrency = "USD"
): Promise<SmartIntentResult> {
  const apiKey = userApiKey || process.env.GEMINI_API_KEY;
  const today = new Date().toISOString().split("T")[0];

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

      const prompt = `Analyze user speech/text input and classify its intent into one of:
1. "EXPENSE" - spending money or buying goods
2. "INCOME" - receiving money/salary
3. "TODO" - a task, action item, reminder, or to-do
4. "NOTE" - a quick thought, idea, password memo, note, or reference

Input: "${text}"
Current Date: ${today}
Default Currency: ${defaultCurrency}

Return ONLY JSON:
{
  "type": "EXPENSE" | "INCOME" | "TODO" | "NOTE",
  "title": string (clean concise title/summary),
  "details": string (full description),
  "amount": number (if expense/income, else 0),
  "category": string (e.g. "Food & Dining", "Work", "Idea", "Personal"),
  "currency": string (e.g. "${defaultCurrency}"),
  "dueDate": string (ISO YYYY-MM-DD if todo has a deadline, else null),
  "priority": "HIGH" | "MEDIUM" | "LOW" (for todos)
}`;

      const result = await model.generateContent(prompt);
      const parsed = JSON.parse(result.response.text());
      return parsed;
    } catch (err) {
      console.warn("Smart intent API error, fallback:", err);
    }
  }

  // Basic Heuristic Intent Fallback
  const lower = text.toLowerCase();
  if (lower.includes("remind") || lower.includes("todo") || lower.includes("task") || lower.includes("need to")) {
    return {
      type: "TODO",
      title: text.length > 30 ? text.substring(0, 27) + "..." : text,
      details: text,
      priority: lower.includes("urgent") || lower.includes("important") ? "HIGH" : "MEDIUM",
    };
  }

  const exp = fallbackHeuristicParser(text, defaultCurrency);
  if (exp.amount > 0) {
    return {
      type: exp.type,
      title: exp.description,
      details: text,
      amount: exp.amount,
      category: exp.category,
      currency: exp.currency,
    };
  }

  return {
    type: "NOTE",
    title: text.length > 30 ? text.substring(0, 27) + "..." : text,
    details: text,
    category: "General",
  };
}

function fallbackHeuristicParser(text: string, defaultCurrency: string): AIParsedExpense {
  const lower = text.toLowerCase();
  const today = new Date().toISOString().split("T")[0];

  const isIncome =
    lower.includes("salary") ||
    lower.includes("income") ||
    lower.includes("received") ||
    lower.includes("earned") ||
    lower.includes("dividend") ||
    lower.includes("bonus") ||
    lower.includes("cashback");

  let currency = defaultCurrency;
  if (lower.includes("rm") || lower.includes("myr") || lower.includes("ringgit")) currency = "MYR";
  else if (lower.includes("sgd") || lower.includes("s$")) currency = "SGD";
  else if (lower.includes("eur") || lower.includes("€")) currency = "EUR";
  else if (lower.includes("gbp") || lower.includes("£")) currency = "GBP";
  else if (lower.includes("usd") || lower.includes("$")) currency = "USD";

  const amountMatch = text.match(/[$€£¥]?\s*(\d+(?:[.,]\d{1,2})?)\s*(?:rm|myr|usd|sgd|bucks|dollars|ringgit)?/i);
  let amount = 0;
  if (amountMatch && amountMatch[1]) {
    amount = parseFloat(amountMatch[1].replace(",", "."));
  }

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
  }

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
