import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { generateContentWithFallback } from "@/lib/gemini";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

async function resolveApiKey(): Promise<string | undefined> {
  try {
    const config = await db.appConfig.findUnique({ where: { id: "default" } });
    if (config?.geminiApiKey) return config.geminiApiKey;
  } catch {}
  return process.env.GEMINI_API_KEY || undefined;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      action = "CONVERT_TO_DOCUMENT",
      fileBase64,
      mimeType = "application/pdf",
      fileName = "document",
      textContent = "",
      editInstruction = "",
      targetFormat = "DOC_HTML",
    } = body;

    const apiKey = await resolveApiKey();
    if (!apiKey) {
      return NextResponse.json(
        {
          success: false,
          error: "请先在 Settings 页面配置 Google Gemini API Key 以启用 PDF/图片智能识别与 AI 编辑！",
        },
        { status: 400 }
      );
    }

    const genAI = new GoogleGenerativeAI(apiKey);

    // 1. CONVERT_TO_DOCUMENT: Extract and reconstruct PDF / Image into editable Rich HTML (for Word/PDF), CSV, JSON, or Markdown
    if (action === "CONVERT_TO_DOCUMENT") {
      if (!fileBase64) {
        return NextResponse.json(
          { success: false, error: "未提供文件数据 (fileBase64 required)" },
          { status: 400 }
        );
      }

      let cleanBase64 = fileBase64.trim();
      if (cleanBase64.includes(",")) {
        cleanBase64 = cleanBase64.split(",")[1].trim();
      }
      cleanBase64 = cleanBase64.replace(/\s+/g, "");

      let cleanMime = (mimeType || "application/pdf").split(";")[0].trim().toLowerCase();
      const lowerName = (fileName || "").toLowerCase();
      if (cleanBase64.startsWith("JVBERi0") || lowerName.endsWith(".pdf") || cleanMime.includes("pdf")) {
        cleanMime = "application/pdf";
      } else if (cleanBase64.startsWith("iVBORw0KGgo") || lowerName.endsWith(".png") || cleanMime.includes("png")) {
        cleanMime = "image/png";
      } else if (cleanBase64.startsWith("/9j/") || lowerName.endsWith(".jpg") || lowerName.endsWith(".jpeg")) {
        cleanMime = "image/jpeg";
      } else if (lowerName.endsWith(".webp") || cleanMime.includes("webp")) {
        cleanMime = "image/webp";
      }

      let formatPrompt = "";
      if (targetFormat === "CSV") {
        formatPrompt = `Extract all tabular data or lists from this document/image and output ONLY raw valid CSV rows (comma-separated, quote fields containing commas, no markdown code blocks).`;
      } else if (targetFormat === "JSON") {
        formatPrompt = `Extract all structured information, headings, paragraphs, and tables from this document/image and output ONLY valid formatted JSON (no markdown code blocks).`;
      } else if (targetFormat === "MARKDOWN") {
        formatPrompt = `Faithfully convert this entire document/image into clean, well-structured Markdown (preserving headings, bullet lists, bold text, and Markdown tables). Output ONLY the Markdown content.`;
      } else {
        // Default: Rich HTML for WYSIWYG Editor & Word (.doc) / PDF conversion
        formatPrompt = `You are a high-precision PDF-to-Word document reconstruction engine.
Convert the attached PDF or image document ("${fileName}") into clean, well-formatted semantic HTML suitable for a Word processor editor.
Rules:
1. Preserve all headings (<h1>, <h2>, <h3>), paragraphs (<p>), bold/italic text (<strong>, <em>), lists (<ul>, <ol>, <li>), and tables (<table border="1" style="border-collapse:collapse;width:100%;"><thead><tr><th>...</th></tr></thead><tbody><tr><td>...</td></tr></tbody></table>).
2. Keep the original language and exact text/numbers faithfully.
3. Do NOT wrap in \`\`\`html code blocks and do NOT include <html>, <head>, or <body> tags — return ONLY the inner document HTML elements so it can be directly loaded into a rich-text Word editor.`;
      }

      const filePart = {
        inlineData: {
          data: cleanBase64,
          mimeType: cleanMime,
        },
      };

      const result = await generateContentWithFallback(genAI, apiKey, [formatPrompt, filePart], {
        temperature: 0.1,
        maxOutputTokens: 16384,
        timeoutMs: 55000,
      });

      let output = result.response.text().trim();
      // Strip accidental markdown fences if present
      const fenceMatch = output.match(/^```(?:html|markdown|csv|json)?\s*([\s\S]*?)\s*```$/i);
      if (fenceMatch && fenceMatch[1]) {
        output = fenceMatch[1].trim();
      }

      return NextResponse.json({
        success: true,
        content: output,
        model: (result as any)?.model || "gemini-3.5-flash-lite",
      });
    }

    // 2. AI_EDIT_CONTENT: Transform, translate, polish, summarize, or reformat the editor document
    if (action === "AI_EDIT_CONTENT") {
      if (!textContent.trim()) {
        return NextResponse.json(
          { success: false, error: "编辑器内容为空，请先上传文件或输入内容" },
          { status: 400 }
        );
      }

      const prompt = `You are the IV4N6Hub Document Studio AI Editor.
The user wants to edit or transform the following document content.

User Instruction: "${editInstruction || "排版润色并修正格式错误"}"

Current Document Content:
"""
${textContent.slice(0, 40000)}
"""

Rules:
1. Apply the user's instruction accurately while preserving important data and structure.
2. If the input contains HTML tags (or the user asks for Word/Rich layout), return clean semantic HTML fragments (<h1>, <h2>, <p>, <table>, <ul>, <strong>) without <html>/<body> wrappers or markdown code fences.
3. If the user explicitly asks for CSV, JSON, or Markdown, output that exact format cleanly without code fences.`;

      const result = await generateContentWithFallback(genAI, apiKey, prompt, {
        temperature: 0.2,
        maxOutputTokens: 16384,
        timeoutMs: 45000,
      });

      let output = result.response.text().trim();
      const fenceMatch = output.match(/^```(?:html|markdown|csv|json)?\s*([\s\S]*?)\s*```$/i);
      if (fenceMatch && fenceMatch[1]) {
        output = fenceMatch[1].trim();
      }

      return NextResponse.json({
        success: true,
        content: output,
        model: (result as any)?.model || "gemini-3.5-flash-lite",
      });
    }

    return NextResponse.json({ success: false, error: "Invalid action" }, { status: 400 });
  } catch (error: any) {
    console.error("File Studio AI error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "文件转换或 AI 编辑失败" },
      { status: 500 }
    );
  }
}
