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
  type: "EXPENSE" | "INCOME" | "TRANSFER" | "TODO" | "NOTE";
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

export function getTodayDateString(timeZone = "Asia/Kuala_Lumpur"): string {
  try {
    return new Intl.DateTimeFormat("en-CA", { timeZone }).format(new Date());
  } catch {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }
}

export function cleanJsonText(raw: string): string {
  let cleaned = (raw || "").trim();
  if (cleaned.startsWith("```json")) {
    cleaned = cleaned.substring(7);
  } else if (cleaned.startsWith("```")) {
    cleaned = cleaned.substring(3);
  }
  if (cleaned.endsWith("```")) {
    cleaned = cleaned.substring(0, cleaned.length - 3);
  }
  return cleaned.trim();
}

// Check if a model is deprecated, shut down, or unsupported for generateContent
export function isModelDeprecated(name: string): boolean {
  if (!name) return true;
  const clean = name.replace(/^models\//, "").toLowerCase();
  return (
    clean.startsWith("gemini-1.5") ||
    clean.startsWith("gemini-1.0") ||
    clean.startsWith("gemini-2.0") ||
    clean === "gemini-pro" ||
    clean.includes("bison")
  );
}

// Prioritized list of active, supported modern Gemini models (2.5 & 3.x Flash)
export const CANDIDATE_MODELS = [
  "gemini-2.5-flash",
  "gemini-2.5-flash-lite",
  "gemini-3-flash-preview",
  "gemini-3.8-flash",
  "gemini-3.7-flash",
  "gemini-3.6-flash",
  "gemini-3.5-flash",
  "gemini-3.5-flash-lite",
  "gemini-3.1-flash-lite",
  "gemini-2.5-pro",
];

// In-memory cache for the resolved model per API key (1 hour TTL)
const modelCache = new Map<string, { model: string; timestamp: number }>();

/**
 * Dynamically resolves the best supported Gemini model for the given API key.
 * Queries Google's ListModels endpoint first; filters out any retired/deprecated models.
 */
export async function resolveWorkingModel(apiKey: string): Promise<string> {
  const cached = modelCache.get(apiKey);
  if (cached && !isModelDeprecated(cached.model) && Date.now() - cached.timestamp < 60 * 60 * 1000) {
    return cached.model;
  }

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`,
      {
        signal: AbortSignal.timeout(5000),
      }
    );

    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data?.models)) {
        // Filter models that support generateContent AND are strictly NOT deprecated/shut down
        const availableModels: string[] = data.models
          .filter((m: any) =>
            Array.isArray(m.supportedGenerationMethods) &&
            m.supportedGenerationMethods.includes("generateContent")
          )
          .map((m: any) => (m.name || "").replace(/^models\//, ""))
          .filter((name: string) => !isModelDeprecated(name));

        // 1. Match against prioritized candidate models
        for (const candidate of CANDIDATE_MODELS) {
          if (availableModels.includes(candidate)) {
            modelCache.set(apiKey, { model: candidate, timestamp: Date.now() });
            console.log(`[Gemini] Discovered available model from API: ${candidate}`);
            return candidate;
          }
        }

        // 2. Try any available active flash model (excluding deprecated)
        const anyFlash = availableModels.find((m) => m.toLowerCase().includes("flash"));
        if (anyFlash) {
          modelCache.set(apiKey, { model: anyFlash, timestamp: Date.now() });
          console.log(`[Gemini] Selected available flash model: ${anyFlash}`);
          return anyFlash;
        }

        // 3. Fallback to any active non-deprecated model that supports generateContent
        if (availableModels.length > 0) {
          modelCache.set(apiKey, { model: availableModels[0], timestamp: Date.now() });
          console.log(`[Gemini] Falling back to available model: ${availableModels[0]}`);
          return availableModels[0];
        }
      }
    } else {
      console.warn(`[Gemini] Model listing request returned status ${res.status}`);
    }
  } catch (err) {
    console.warn("[Gemini] Unable to fetch model list from Google API, using default fallback:", err);
  }

  // Default to gemini-2.5-flash
  return "gemini-2.5-flash";
}

/**
 * Executes a Gemini model.generateContent call with automatic model failover.
 * If the current model returns 404 (deprecated / not found), it automatically retries
 * with the next supported candidate model from CANDIDATE_MODELS.
 */
export async function generateContentWithFallback(
  genAI: GoogleGenerativeAI,
  apiKey: string,
  contents: any,
  generationConfig?: any
) {
  const resolvedModel = await resolveWorkingModel(apiKey);

  // Active models trial queue, strictly omitting any deprecated models
  const trialQueue = [
    resolvedModel,
    ...CANDIDATE_MODELS.filter((m) => m !== resolvedModel),
  ].filter((m) => !isModelDeprecated(m));

  let lastError: any = null;

  for (const modelName of trialQueue) {
    try {
      const model = genAI.getGenerativeModel({
        model: modelName,
        generationConfig,
      });

      const result = await model.generateContent(contents);

      // Successfully processed! Cache this model as working
      modelCache.set(apiKey, { model: modelName, timestamp: Date.now() });
      (result as any).model = modelName;
      return result;
    } catch (err: any) {
      lastError = err;
      const errMsg = (err?.message || String(err)).toLowerCase();

      // Check if this error is 404 / model not found / unsupported
      const isModelNotFoundError =
        errMsg.includes("404") ||
        errMsg.includes("not found") ||
        errMsg.includes("is not supported for generatecontent") ||
        errMsg.includes("models/");

      if (isModelNotFoundError) {
        console.warn(
          `[Gemini Fallback] Model '${modelName}' not available (404/unsupported), trying next candidate...`
        );
        continue;
      }

      // Rethrow quota, permission, safety or parsing errors immediately
      throw err;
    }
  }

  const detailedError = new Error(
    `Failed to generate content: None of the candidate Gemini models (${trialQueue.join(
      ", "
    )}) were accessible. Original error: ${lastError?.message || lastError}`
  );
  (detailedError as any).originalError = lastError;
  throw detailedError;
}

export async function parseTextWithAI(
  text: string,
  userApiKey?: string,
  defaultCurrency = "MYR"
): Promise<AIParsedExpense> {
  const apiKey = userApiKey || process.env.GEMINI_API_KEY;

  if (apiKey) {
    try {
      const genAI = new GoogleGenerativeAI(apiKey);
      const today = getTodayDateString();
      const prompt = `You are a financial assistant for an expense tracker. 
Analyze this user text input: "${text}"
Current Date reference: ${today}
Default Currency: ${defaultCurrency}

Available Categories: ${STANDARD_CATEGORIES.join(", ")}

Language Support: The user may write in Mandarin Chinese (中文 / 华语), Cantonese, English, Malay, or mixed multilingual slang (e.g. "吃午餐25块", "打油50块", "买衣服80", "喝咖啡15.50", "makan nasi 12 ringgit").
Understand Chinese number words (e.g. 二十五块 -> 25, 五十 -> 50, 十五块半 -> 15.50, 块/令吉/扣 -> default currency).

Extract and return ONLY a JSON object conforming to this schema:
{
  "amount": number (positive float, e.g. 15.50),
  "type": "EXPENSE" or "INCOME",
  "category": string (must be one of the available categories that best fits),
  "description": string (short clean summary of what it was, e.g. "Starbucks Coffee", "Salary", "Gasoline", "Lunch / 午餐"),
  "currency": string (e.g. "USD", "MYR", "SGD", "EUR", "CNY"),
  "date": string (ISO YYYY-MM-DD format. If user says 'yesterday' or '昨天', calculate relative to current date. Default to ${today}),
  "confidence": number (float between 0 and 1)
}`;

      const result = await generateContentWithFallback(genAI, apiKey, prompt, {
        responseMimeType: "application/json",
        temperature: 0.1,
      });
      const responseText = cleanJsonText(result.response.text());
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
      description: "Audio received (Add GEMINI_API_KEY in AI Settings to enable voice transcription)",
      currency: defaultCurrency,
      date: getTodayDateString(),
      confidence: 0.1,
      transcript: "[Speech transcription requires Gemini API Key]",
    };
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const today = getTodayDateString();
    const prompt = `Listen to this user's voice message regarding a financial transaction or expense/income.
Current Date: ${today}
Default Currency: ${defaultCurrency}
Available Categories: ${STANDARD_CATEGORIES.join(", ")}

Language Support: The user may speak in Mandarin Chinese (中文 / 华语), Cantonese, English, Malay, or mixed slang (e.g. "吃午餐花了二十五块", "打油五十块", "买衣服八十块", "今天喝咖啡十五块半", "makan nasi 12 ringgit").
Convert spoken Chinese numbers (e.g. 二十五 -> 25, 五十 -> 50, 一百 -> 100, 十五块半 -> 15.50, 块/令吉 -> currency) into standard numerical amount.

Extract and return ONLY a JSON object:
{
  "transcript": string (verbatim speech transcription of what the user said in the language they spoke),
  "amount": number (positive float, e.g. 24.50),
  "type": "EXPENSE" or "INCOME",
  "category": string (one of the available categories),
  "description": string (short clean merchant/item description),
  "currency": string,
  "date": string (ISO YYYY-MM-DD format),
  "confidence": number
}
`;

    const cleanMime = (mimeType || "audio/webm").split(";")[0].trim();
    const audioPart = {
      inlineData: {
        data: audioBase64,
        mimeType: cleanMime,
      },
    };

    const result = await generateContentWithFallback(genAI, apiKey, [prompt, audioPart], {
      responseMimeType: "application/json",
      temperature: 0.1,
    });
    const responseText = cleanJsonText(result.response.text());
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
  } catch (err: any) {
    console.error("Gemini Audio error:", err);
    throw new Error(`Failed to process voice note with AI: ${err.message || err}`);
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
  const today = getTodayDateString();
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

  const cleanMime = (mimeType || "image/jpeg").split(";")[0].trim();
  const imagePart = {
    inlineData: {
      data: imageBase64,
      mimeType: cleanMime,
    },
  };

  const result = await generateContentWithFallback(genAI, apiKey, [prompt, imagePart], {
    responseMimeType: "application/json",
    temperature: 0.1,
  });
  const responseText = cleanJsonText(result.response.text());
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
  const today = getTodayDateString();

  if (apiKey) {
    try {
      const genAI = new GoogleGenerativeAI(apiKey);
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

      const result = await generateContentWithFallback(genAI, apiKey, prompt, {
        responseMimeType: "application/json",
        temperature: 0.1,
      });
      const responseText = cleanJsonText(result.response.text());
      const parsed = JSON.parse(responseText);
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
  const today = getTodayDateString();

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
