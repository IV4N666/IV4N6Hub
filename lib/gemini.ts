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

export interface SmartAccountInfo {
  id: string;
  name: string;
  type?: string;
}

export async function parseTextWithAI(
  text: string,
  userApiKey?: string,
  defaultCurrency = "MYR",
  accounts: SmartAccountInfo[] = [],
  conversationHistory: Array<{ role: "user" | "assistant"; text: string }> = []
): Promise<AIParsedExpense> {
  const apiKey = userApiKey || process.env.GEMINI_API_KEY;

  if (apiKey) {
    try {
      const genAI = new GoogleGenerativeAI(apiKey);
      const today = getTodayDateString();

      const accountListStr =
        accounts.length > 0
          ? accounts.map((a) => `- ID: "${a.id}", Name: "${a.name}" (Type: ${a.type || "ACCOUNT"})`).join("\n")
          : "None configured";

      const historyStr =
        conversationHistory.length > 0
          ? conversationHistory
              .slice(-6)
              .map((m) => `${m.role === "user" ? "User" : "Assistant"}: ${m.text}`)
              .join("\n")
          : "None";

      const prompt = `You are the intelligent omni-assistant for IV4N6Hub, a personal financial ledger, to-do, and memo manager.
User message: "${text}"
Current Date reference: ${today}
Default Currency: ${defaultCurrency}

Available User Financial Accounts:
${accountListStr}

Recent Conversation History:
${historyStr}

Available Financial Categories:
${STANDARD_CATEGORIES.join(", ")}

Analyze the user's intent and classify into one of the following:
1. "EXPENSE" / "INCOME" / "TRANSFER":
   - Logging money spent or received.
   - Extract: amount (number), category (best match), description (concise item/merchant), currency, date (ISO YYYY-MM-DD), and accountId matching one from the Available Accounts if the user mentioned it (e.g. "Cash", "现金", "Maybank", "Bank", "Touch n Go", "TnG", "Credit Card", "刷卡"). If no account was mentioned, leave accountId as null.
   - Multi-turn understanding: If the Conversation History shows the assistant previously asked for the amount or account (e.g. "How much was lunch?"), combine the previous context with the user's current reply to complete the record!
   - Language support: Mandarin Chinese (吃午餐25块 / 喝咖啡15.50 / 打油50 / 现金付了30), Cantonese, Malay (makan 12 ringgit), English. Convert spoken/written Chinese numerals (十五块半 -> 15.50, 二十五 -> 25).
   - Generate a friendly replyMessage (e.g. "✅ 已记录午餐支出 RM 25.00 (现金钱包)" or "✅ Recorded $15.50 for Coffee.").

2. "CLARIFICATION":
   - The user clearly mentions a spending, purchase, or activity that costs money (e.g. "吃了火锅", "went to Starbucks", "bought new shoes", "paid parking", "吃午餐") BUT DID NOT specify an amount or price.
   - Do NOT guess an amount of 0. Instead, set intent to "CLARIFICATION", isMissingDetails to true, missingFields to ["amount"].
   - In replyMessage, generate a warm, polite question in the user's language asking how much it cost and which account was used (e.g. "午餐吃得很丰盛吧！🍽️ 请问一共消费了多少钱？是用现金还是银行卡支付的呢？").

3. "TODO":
   - A task, action item, or reminder to be done later.
   - Examples: "提醒我明天下午3点买菜", "Remember to renew road tax next week", "Todo: send monthly tax file", "记得周五交水电费".
   - Extract: todoTitle, todoDueDate (ISO YYYY-MM-DD or null), todoPriority ("HIGH" | "MEDIUM" | "LOW").
   - Set replyMessage: concise confirmation (e.g. "📋 已为您添加待办任务：**买菜** (截止日期: 2026-09-10)！").

4. "NOTE":
   - A quick thought, idea, password, memo, or reference note.
   - Examples: "记一下：门禁密码是8899", "Note: wifi password is ...", "备忘录：关于下周旅行的行李清单...".
   - Extract: noteTitle, noteContent, noteCategory ("Personal" | "Work" | "Idea" | "General").
   - Set replyMessage: concise confirmation (e.g. "📝 已保存便签：**门禁密码** 到灵感备忘录！").

5. "CANCEL":
   - The user wants to cancel, delete, or undo a recently recorded transaction, to-do task, or note.
   - Examples: "cancel", "undo", "cancel last spend", "cancel my expense", "delete that note", "cancel todo", "取消", "撤销", "取消刚刚那笔", "删除刚才的便签", "不用记了", "删除刚才的待办".
   - Extract cancelTarget: "TRANSACTION" | "TODO" | "NOTE" | "LAST".
   - Set replyMessage: e.g. "🚫 正在为您取消最近的记录..."

Return ONLY a valid JSON conforming to this schema:
{
  "intent": "EXPENSE" | "INCOME" | "TRANSFER" | "TODO" | "NOTE" | "CLARIFICATION" | "CANCEL",
  "cancelTarget": "TRANSACTION" | "TODO" | "NOTE" | "LAST" or null,
  "amount": number (positive float, 0 if not an expense or if missing),
  "type": "EXPENSE" | "INCOME" | "TRANSFER",
  "category": string,
  "description": string,
  "currency": string,
  "date": string,
  "accountId": string or null,
  "accountName": string or null,
  "todoTitle": string or null,
  "todoDueDate": string or null,
  "todoPriority": "HIGH" | "MEDIUM" | "LOW" or null,
  "noteTitle": string or null,
  "noteContent": string or null,
  "noteCategory": string or null,
  "isMissingDetails": boolean,
  "missingFields": string[],
  "replyMessage": string,
  "confidence": number
}`;

      const result = await generateContentWithFallback(genAI, apiKey, prompt, {
        responseMimeType: "application/json",
        temperature: 0.1,
      });
      const responseText = cleanJsonText(result.response.text());
      const parsed = JSON.parse(responseText);

      // Verify accountId against provided accounts list
      let matchedAccountId = parsed.accountId || null;
      let matchedAccountName = parsed.accountName || null;
      if (matchedAccountId) {
        const found = accounts.find((a) => a.id === matchedAccountId);
        if (found) {
          matchedAccountName = found.name;
        } else {
          matchedAccountId = null;
        }
      }

      return {
        amount: Math.abs(Number(parsed.amount) || 0),
        type: parsed.type === "INCOME" ? "INCOME" : parsed.type === "TRANSFER" ? "TRANSFER" : "EXPENSE",
        category: STANDARD_CATEGORIES.includes(parsed.category) ? parsed.category : "Other",
        description: parsed.description || text,
        currency: parsed.currency || defaultCurrency,
        date: parsed.date || today,
        confidence: Number(parsed.confidence) || 0.95,
        accountId: matchedAccountId,
        accountName: matchedAccountName,
        intent: parsed.intent || (Number(parsed.amount) > 0 ? "EXPENSE" : "CLARIFICATION"),
        cancelTarget: parsed.cancelTarget || (parsed.intent === "CANCEL" ? "LAST" : undefined),
        todoTitle: parsed.todoTitle || undefined,
        todoDueDate: parsed.todoDueDate || undefined,
        todoPriority: parsed.todoPriority || undefined,
        noteTitle: parsed.noteTitle || undefined,
        noteContent: parsed.noteContent || undefined,
        noteCategory: parsed.noteCategory || undefined,
        isMissingDetails: Boolean(parsed.isMissingDetails),
        missingFields: Array.isArray(parsed.missingFields) ? parsed.missingFields : [],
        replyMessage: parsed.replyMessage || (parsed.intent === "TODO" ? `📋 已记录待办：${parsed.todoTitle || text}` : `✅ 已记录 ${parsed.description || text}`),
      };
    } catch (err) {
      console.warn("Gemini API call failed, falling back to heuristic parser:", err);
    }
  }

  // Fallback Rule-Based Parser
  return fallbackHeuristicParser(text, defaultCurrency, accounts);
}

export async function parseAudioWithAI(
  audioBase64: string,
  mimeType: string,
  userApiKey?: string,
  defaultCurrency = "USD",
  accounts: SmartAccountInfo[] = [],
  conversationHistory: Array<{ role: "user" | "assistant"; text: string }> = []
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
      replyMessage: "请在设置中配置 Gemini API Key 以启用智能语音识别与分类。",
      intent: "CLARIFICATION",
    };
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const today = getTodayDateString();

    const accountListStr =
      accounts.length > 0
        ? accounts.map((a) => `- ID: "${a.id}", Name: "${a.name}" (${a.type || "ACCOUNT"})`).join("\n")
        : "None configured";

    const historyStr =
      conversationHistory.length > 0
        ? conversationHistory
            .slice(-6)
            .map((m) => `${m.role === "user" ? "User" : "Assistant"}: ${m.text}`)
            .join("\n")
        : "None";

    const prompt = `Listen to this user's voice message.
Current Date: ${today}
Default Currency: ${defaultCurrency}

Available User Accounts:
${accountListStr}

Recent Conversation History:
${historyStr}

Available Categories:
${STANDARD_CATEGORIES.join(", ")}

Analyze the spoken audio and classify user intent:
1. "EXPENSE" / "INCOME" / "TRANSFER":
   - Spoken transaction. Convert spoken numbers (二十五 -> 25, 五十 -> 50, 一百 -> 100, 十五块半 -> 15.50, 块/令吉 -> currency).
   - Match spoken payment account against Available Accounts if mentioned (e.g. 现金, Maybank, 银行卡, touch n go).
2. "CLARIFICATION":
   - User spoke about buying or eating something, but did not say any price. Ask follow-up question.
3. "TODO":
   - User asks to be reminded of something or records a task (e.g. 提醒我明天买菜).
4. "NOTE":
   - User dictates a note or memo (e.g. 记一下密码是...).
5. "CANCEL":
   - User speaks to cancel, delete, or undo a recent spend, task, or note (e.g. 取消刚刚的记账, 撤销, 删掉刚才的便签, cancel that).

Extract and return ONLY a JSON object:
{
  "transcript": string (verbatim speech transcription in original language),
  "intent": "EXPENSE" | "INCOME" | "TRANSFER" | "TODO" | "NOTE" | "CLARIFICATION" | "CANCEL",
  "cancelTarget": "TRANSACTION" | "TODO" | "NOTE" | "LAST" or null,
  "amount": number (0 if missing or not an expense),
  "type": "EXPENSE" | "INCOME" | "TRANSFER",
  "category": string,
  "description": string,
  "currency": string,
  "date": string,
  "accountId": string or null,
  "accountName": string or null,
  "todoTitle": string or null,
  "todoDueDate": string or null,
  "todoPriority": "HIGH" | "MEDIUM" | "LOW" or null,
  "noteTitle": string or null,
  "noteContent": string or null,
  "noteCategory": string or null,
  "isMissingDetails": boolean,
  "missingFields": string[],
  "replyMessage": string,
  "confidence": number
}`;

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

    let matchedAccountId = parsed.accountId || null;
    let matchedAccountName = parsed.accountName || null;
    if (matchedAccountId) {
      const found = accounts.find((a) => a.id === matchedAccountId);
      if (found) {
        matchedAccountName = found.name;
      } else {
        matchedAccountId = null;
      }
    }

    return {
      amount: Math.abs(Number(parsed.amount) || 0),
      type: parsed.type === "INCOME" ? "INCOME" : parsed.type === "TRANSFER" ? "TRANSFER" : "EXPENSE",
      category: STANDARD_CATEGORIES.includes(parsed.category) ? parsed.category : "Other",
      description: parsed.description || parsed.transcript || "Voice input",
      currency: parsed.currency || defaultCurrency,
      date: parsed.date || today,
      confidence: Number(parsed.confidence) || 0.9,
      transcript: parsed.transcript || "",
      accountId: matchedAccountId,
      accountName: matchedAccountName,
      intent: parsed.intent || (Number(parsed.amount) > 0 ? "EXPENSE" : "CLARIFICATION"),
      cancelTarget: parsed.cancelTarget || (parsed.intent === "CANCEL" ? "LAST" : undefined),
      todoTitle: parsed.todoTitle || undefined,
      todoDueDate: parsed.todoDueDate || undefined,
      todoPriority: parsed.todoPriority || undefined,
      noteTitle: parsed.noteTitle || undefined,
      noteContent: parsed.noteContent || undefined,
      noteCategory: parsed.noteCategory || undefined,
      isMissingDetails: Boolean(parsed.isMissingDetails),
      missingFields: Array.isArray(parsed.missingFields) ? parsed.missingFields : [],
      replyMessage: parsed.replyMessage || (parsed.transcript ? `🎙️ 听取内容: "${parsed.transcript}"` : "已处理语音。"),
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

function fallbackHeuristicParser(
  text: string,
  defaultCurrency: string,
  accounts: SmartAccountInfo[] = []
): AIParsedExpense {
  const lower = text.toLowerCase();
  const today = getTodayDateString();

  // 0. Check Cancel / Undo Intent
  if (
    lower.includes("cancel") ||
    lower.includes("undo") ||
    lower.includes("delete last") ||
    text.includes("取消") ||
    text.includes("撤销") ||
    text.includes("删掉刚才") ||
    text.includes("不要记") ||
    text.includes("不用记")
  ) {
    let target: "TRANSACTION" | "TODO" | "NOTE" | "LAST" = "LAST";
    if (lower.includes("todo") || lower.includes("task") || text.includes("待办") || text.includes("任务")) {
      target = "TODO";
    } else if (lower.includes("note") || text.includes("便签") || text.includes("备忘")) {
      target = "NOTE";
    } else if (lower.includes("spend") || lower.includes("expense") || text.includes("消费") || text.includes("支出") || text.includes("账单")) {
      target = "TRANSACTION";
    }
    return {
      intent: "CANCEL",
      cancelTarget: target,
      amount: 0,
      type: "EXPENSE",
      category: "Other",
      description: text,
      currency: defaultCurrency,
      date: today,
      confidence: 0.9,
      replyMessage: "正在撤销最近记录...",
    };
  }

  // 1. Check Todo Intent
  if (
    lower.includes("remind") ||
    lower.includes("todo") ||
    lower.includes("task") ||
    lower.includes("remember to") ||
    text.includes("提醒") ||
    text.includes("记得") ||
    text.includes("待办")
  ) {
    const cleanTitle = text
      .replace(/^(提醒我|记得|待办[:：]?|remind me to|remember to|todo[:：]?)\s*/i, "")
      .trim();
    return {
      intent: "TODO",
      amount: 0,
      type: "EXPENSE",
      category: "Other",
      description: text,
      currency: defaultCurrency,
      date: today,
      confidence: 0.85,
      todoTitle: cleanTitle || text,
      todoPriority: lower.includes("urgent") || text.includes("紧急") || text.includes("重要") ? "HIGH" : "MEDIUM",
      replyMessage: `📋 已记录待办任务：“${cleanTitle || text}”`,
    };
  }

  // 2. Check Note Intent
  if (
    lower.startsWith("note") ||
    text.startsWith("便签") ||
    text.startsWith("记一下") ||
    text.startsWith("备忘") ||
    lower.includes("password") ||
    text.includes("密码")
  ) {
    const cleanNote = text
      .replace(/^(note[:：]?|便签[:：]?|记一下[:：]?|备忘[:：]?)\s*/i, "")
      .trim();
    return {
      intent: "NOTE",
      amount: 0,
      type: "EXPENSE",
      category: "Other",
      description: text,
      currency: defaultCurrency,
      date: today,
      confidence: 0.85,
      noteTitle: cleanNote.substring(0, 25),
      noteContent: cleanNote || text,
      noteCategory: "General",
      replyMessage: `📝 已保存便签：“${cleanNote.substring(0, 25)}”`,
    };
  }

  // 3. Amount extraction
  const amountMatch = text.match(/[$€£¥]?\s*(\d+(?:[.,]\d{1,2})?)\s*(?:rm|myr|usd|sgd|bucks|dollars|ringgit|块|元)?/i);
  let amount = 0;
  if (amountMatch && amountMatch[1]) {
    amount = parseFloat(amountMatch[1].replace(",", "."));
  }

  // Check matched account
  let matchedAccountId: string | null = null;
  let matchedAccountName: string | null = null;
  for (const acc of accounts) {
    const accLower = acc.name.toLowerCase();
    if (
      lower.includes(accLower) ||
      (accLower.includes("cash") && (lower.includes("cash") || text.includes("现金"))) ||
      (accLower.includes("maybank") && lower.includes("maybank")) ||
      (accLower.includes("touch") && (lower.includes("tng") || lower.includes("touch") || text.includes("一触即通"))) ||
      (accLower.includes("card") && (lower.includes("card") || text.includes("卡") || text.includes("信用卡")))
    ) {
      matchedAccountId = acc.id;
      matchedAccountName = acc.name;
      break;
    }
  }

  // Missing amount check for spending intention
  const isSpendingMention =
    lower.includes("eat") ||
    lower.includes("lunch") ||
    lower.includes("dinner") ||
    lower.includes("buy") ||
    lower.includes("bought") ||
    lower.includes("spent") ||
    lower.includes("paid") ||
    text.includes("吃") ||
    text.includes("买") ||
    text.includes("花了");

  if (amount === 0 && isSpendingMention) {
    return {
      intent: "CLARIFICATION",
      amount: 0,
      type: "EXPENSE",
      category: "Food & Dining",
      description: text,
      currency: defaultCurrency,
      date: today,
      confidence: 0.7,
      isMissingDetails: true,
      missingFields: ["amount"],
      replyMessage: `请问一共消费了多少钱呢？请告诉我具体金额以及付款账户（如现金或银行卡）。`,
    };
  }

  const isIncome =
    lower.includes("salary") ||
    lower.includes("income") ||
    lower.includes("received") ||
    lower.includes("earned") ||
    lower.includes("dividend") ||
    lower.includes("bonus") ||
    lower.includes("cashback") ||
    text.includes("工资") ||
    text.includes("薪水") ||
    text.includes("收入");

  let currency = defaultCurrency;
  if (lower.includes("rm") || lower.includes("myr") || lower.includes("ringgit") || text.includes("令吉")) currency = "MYR";
  else if (lower.includes("sgd") || lower.includes("s$")) currency = "SGD";
  else if (lower.includes("eur") || lower.includes("€")) currency = "EUR";
  else if (lower.includes("gbp") || lower.includes("£")) currency = "GBP";
  else if (lower.includes("usd") || lower.includes("$")) currency = "USD";

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
    lower.includes("cafe") ||
    text.includes("吃") ||
    text.includes("餐") ||
    text.includes("咖啡")
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
    lower.includes("bus") ||
    text.includes("打油") ||
    text.includes("加油") ||
    text.includes("车费")
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
    lower.includes("lazada") ||
    text.includes("买衣服") ||
    text.includes("超市") ||
    text.includes("购物")
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
    lower.includes("spotify") ||
    text.includes("水电") ||
    text.includes("话费") ||
    text.includes("账单")
  ) {
    category = "Bills & Utilities";
  }

  let desc = text.trim();
  if (desc.length > 50) desc = desc.substring(0, 47) + "...";

  return {
    intent: isIncome ? "INCOME" : "EXPENSE",
    amount,
    type: isIncome ? "INCOME" : "EXPENSE",
    category,
    description: desc || (isIncome ? "Income" : "Expense"),
    currency,
    date: today,
    confidence: 0.8,
    accountId: matchedAccountId,
    accountName: matchedAccountName,
    replyMessage: amount > 0
      ? `✅ 已记录 ${currency} ${amount.toFixed(2)} (${category})${matchedAccountName ? `，付款账户: ${matchedAccountName}` : ""}`
      : "未检测到明确金额或内容。",
  };
}
