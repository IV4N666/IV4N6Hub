"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  FileText,
  FileSpreadsheet,
  Image as ImageIcon,
  Upload,
  Download,
  Sparkles,
  Printer,
  Wand2,
  Bold,
  Italic,
  Underline,
  List,
  AlignLeft,
  AlignCenter,
  RotateCw,
  Trash2,
  CheckCircle2,
  Loader2,
  ArrowRightLeft,
  Copy,
  FileCode,
  Eye,
  Code,
} from "lucide-react";

/**
 * Pure JavaScript minimal ZIP reader to extract word/document.xml from a .docx file
 * without needing external npm packages.
 */
async function extractDocxToHtml(file: File): Promise<string> {
  const buf = await file.arrayBuffer();
  const bytes = new Uint8Array(buf);
  const view = new DataView(buf);

  // Check if it's actually an HTML/RTF/XML-based .doc file
  const headerStr = new TextDecoder("utf-8").decode(bytes.slice(0, 200));
  if (
    headerStr.includes("<html") ||
    headerStr.includes("<!DOCTYPE") ||
    headerStr.includes("<w:WordDocument") ||
    !headerStr.startsWith("PK")
  ) {
    const fullText = new TextDecoder("utf-8").decode(bytes);
    const bodyMatch = fullText.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
    if (bodyMatch && bodyMatch[1]) return bodyMatch[1];
    return `<p>${fullText.replace(/\r?\n/g, "</p><p>")}</p>`;
  }

  // Parse ZIP local file headers to locate "word/document.xml"
  let offset = 0;
  while (offset + 30 < bytes.length) {
    const sig = view.getUint32(offset, true);
    if (sig !== 0x04034b50) break; // Local file header signature
    const compression = view.getUint16(offset + 8, true);
    const compressedSize = view.getUint32(offset + 18, true);
    const fileNameLen = view.getUint16(offset + 26, true);
    const extraLen = view.getUint16(offset + 28, true);

    const nameBytes = bytes.slice(offset + 30, offset + 30 + fileNameLen);
    const entryName = new TextDecoder("utf-8").decode(nameBytes);
    const dataStart = offset + 30 + fileNameLen + extraLen;
    const dataEnd = dataStart + compressedSize;

    if (entryName === "word/document.xml" && dataEnd <= bytes.length) {
      const compressedData = bytes.slice(dataStart, dataEnd);
      let xmlString = "";
      if (compression === 0) {
        xmlString = new TextDecoder("utf-8").decode(compressedData);
      } else if (compression === 8 && typeof DecompressionStream !== "undefined") {
        const ds = new DecompressionStream("deflate-raw");
        const writer = ds.writable.getWriter();
        writer.write(compressedData);
        writer.close();
        const decompressedBuf = await new Response(ds.readable).arrayBuffer();
        xmlString = new TextDecoder("utf-8").decode(decompressedBuf);
      }

      if (xmlString) {
        return convertWordXmlToHtml(xmlString);
      }
    }
    offset = dataEnd;
  }

  throw new Error("无法直接解析该 .docx 压缩结构，将自动使用 Gemini AI 进行内容提取！");
}

function convertWordXmlToHtml(xml: string): string {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xml, "application/xml");
  const paragraphs = Array.from(doc.getElementsByTagName("w:p"));
  const htmlParts: string[] = [];

  for (const p of paragraphs) {
    const pStyle = p.getElementsByTagName("w:pStyle")[0]?.getAttribute("w:val") || "";
    const texts = Array.from(p.getElementsByTagName("w:t"))
      .map((t) => t.textContent || "")
      .join("");
    if (!texts.trim()) continue;

    if (/Heading1|1/i.test(pStyle)) {
      htmlParts.push(`<h1>${texts}</h1>`);
    } else if (/Heading2|2/i.test(pStyle)) {
      htmlParts.push(`<h2>${texts}</h2>`);
    } else if (/Heading3|3/i.test(pStyle)) {
      htmlParts.push(`<h3>${texts}</h3>`);
    } else {
      htmlParts.push(`<p>${texts}</p>`);
    }
  }

  return htmlParts.length > 0 ? htmlParts.join("\n") : "<p>已加载 Word 文档（未检测到文本段落）</p>";
}

export default function FileStudioPage() {
  const [activeStudioTab, setActiveStudioTab] = useState<"DOC_STUDIO" | "IMAGE_STUDIO" | "DATA_STUDIO">(
    "DOC_STUDIO"
  );

  // Document Studio (Word <-> PDF / Markdown / HTML / CSV + Live WYSIWYG & AI Edit)
  const [docTitle, setDocTitle] = useState("Untitled_Document");
  const [editorMode, setEditorMode] = useState<"VISUAL" | "SOURCE">("VISUAL");
  const [htmlContent, setHtmlContent] = useState<string>(
    `<h1>📄 IV4N6Hub 智能文档工作台 (Word ↔ PDF & AI 编辑)</h1>
<p>您可以在这里直接<strong>上传 PDF、Word (.docx / .doc)、图片、Markdown 或 CSV 文件</strong>，进行<strong>所见即所得修改、AI 智能改写/翻译/提取表格</strong>，并一键导出为 <strong>Word (.doc)</strong> 或 <strong>PDF</strong>！</p>
<h2>✨ 支持的核心能力：</h2>
<ul>
  <li><strong>PDF / 扫描件 ➔ Word 可编辑文档</strong>：由 Gemini Vision 高精度还原段落、标题与表格结构。</li>
  <li><strong>Word (.docx / .doc) ➔ PDF</strong>：上传 Word 文档在线编辑后，一键生成高清矢量 PDF。</li>
  <li><strong>AI 智能编辑助手</strong>：在下方输入指令（如“翻译成英文”、“提取所有金额做成表格”、“润色成正式合同格式”），AI 秒级自动改写！</li>
</ul>
<table border="1" style="border-collapse:collapse;width:100%;margin-top:12px;">
  <thead>
    <tr style="background:#1e293b;color:#fff;">
      <th style="padding:8px;">项目 / 描述</th>
      <th style="padding:8px;">分类</th>
      <th style="padding:8px;">金额 (MYR)</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td style="padding:8px;">示例：云端服务器与 AI 账单</td>
      <td style="padding:8px;">Bills & Utilities</td>
      <td style="padding:8px;">RM 40.77</td>
    </tr>
  </tbody>
</table>`
  );
  const [aiPrompt, setAiPrompt] = useState("");
  const [isAiProcessing, setIsAiProcessing] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const visualEditorRef = useRef<HTMLDivElement | null>(null);
  const docFileInputRef = useRef<HTMLInputElement | null>(null);

  // Image Studio State (PNG <-> JPG <-> WEBP <-> PDF + Resize / Rotate / Compress)
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [targetImageFormat, setTargetImageFormat] = useState<"image/png" | "image/jpeg" | "image/webp" | "application/pdf">("image/webp");
  const [imageQuality, setImageQuality] = useState<number>(88);
  const [imageScale, setImageScale] = useState<number>(100);
  const [imageRotation, setImageRotation] = useState<number>(0);
  const [origDimensions, setOrigDimensions] = useState<{ w: number; h: number }>({ w: 0, h: 0 });
  const imgInputRef = useRef<HTMLInputElement | null>(null);

  // Data Table Studio State (CSV <-> JSON <-> Markdown Table <-> HTML)
  const [tableRows, setTableRows] = useState<string[][]>([
    ["Date", "Description", "Category", "Amount", "Currency"],
    ["2026-11-26", "Shell Petrol RON95", "Transport & Fuel", "50.00", "MYR"],
    ["2026-11-26", "Mamak Supper", "Food & Dining", "25.50", "MYR"],
  ]);
  const dataFileInputRef = useRef<HTMLInputElement | null>(null);

  // Sync visual editor when switching tabs or after AI updates
  useEffect(() => {
    if (editorMode === "VISUAL" && visualEditorRef.current) {
      if (visualEditorRef.current.innerHTML !== htmlContent) {
        visualEditorRef.current.innerHTML = htmlContent;
      }
    }
  }, [htmlContent, editorMode, activeStudioTab]);

  // Handle Document Upload (PDF, Word .docx/.doc, Image, MD, TXT, HTML)
  const handleDocumentUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";

    const baseName = file.name.replace(/\.[^.]+$/, "");
    setDocTitle(baseName);
    const lower = file.name.toLowerCase();

    // 1. Plain Text / Markdown / HTML
    if (lower.endsWith(".txt") || lower.endsWith(".md") || lower.endsWith(".html") || lower.endsWith(".htm")) {
      const text = await file.text();
      if (lower.endsWith(".html") || lower.endsWith(".htm")) {
        const bodyMatch = text.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
        setHtmlContent(bodyMatch ? bodyMatch[1] : text);
      } else {
        // Basic Markdown to HTML conversion
        const converted = text
          .replace(/^### (.*$)/gim, "<h3>$1</h3>")
          .replace(/^## (.*$)/gim, "<h2>$1</h2>")
          .replace(/^# (.*$)/gim, "<h1>$1</h1>")
          .replace(/\*\*(.*?)\*\*/gim, "<strong>$1</strong>")
          .replace(/\n\n/gim, "</p><p>")
          .replace(/\n/gim, "<br/>");
        setHtmlContent(`<p>${converted}</p>`);
      }
      setStatusMessage(`✅ 已加载文档 "${file.name}"，您可以直接编辑或导出为 Word / PDF！`);
      return;
    }

    // 2. Word (.docx / .doc) -> Instant client-side extraction
    if (lower.endsWith(".docx") || lower.endsWith(".doc")) {
      try {
        setStatusMessage(`⏳ 正在解析 Word 文档 "${file.name}"...`);
        const extractedHtml = await extractDocxToHtml(file);
        setHtmlContent(extractedHtml);
        setStatusMessage(`✅ 已打开 Word 文档 "${file.name}"！修改后可点击右上角「导出为 PDF」或「保存为 Word」。`);
        return;
      } catch (err: any) {
        console.warn("Client docx fallback to AI:", err);
      }
    }

    // 3. PDF or Image -> Gemini Vision High-Precision PDF-to-Word Reconstruction
    setIsAiProcessing(true);
    setStatusMessage(`🔍 Gemini AI 正在将 "${file.name}" 转换为可编辑的 Word 富文本文档...`);

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onloadend = async () => {
      try {
        const res = await fetch("/api/ai/file-studio", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "CONVERT_TO_DOCUMENT",
            fileBase64: reader.result as string,
            mimeType: file.type || "application/pdf",
            fileName: file.name,
            targetFormat: "DOC_HTML",
          }),
        });
        const data = await res.json();
        if (data.success && data.content) {
          setHtmlContent(data.content);
          setStatusMessage(
            `✅ 已将 "${file.name}" 转换为可编辑文档 (${data.model})！现在您可以自由修改文字/表格，或点击「导出为 Word (.doc)」/「导出为 PDF」。`
          );
        } else {
          setStatusMessage(`⚠️ 转换失败: ${data.error || "未知错误"}`);
        }
      } catch (err: any) {
        setStatusMessage(`⚠️ 请求失败: ${err.message}`);
      } finally {
        setIsAiProcessing(false);
      }
    };
  };

  // Rich Text Formatting Commands
  const execFormat = (command: string, value?: string) => {
    if (editorMode !== "VISUAL") return;
    document.execCommand(command, false, value);
    if (visualEditorRef.current) {
      setHtmlContent(visualEditorRef.current.innerHTML);
    }
  };

  // AI Smart Edit / Translate / Reformat
  const handleAiEditDocument = async (customInstruction?: string) => {
    const instruction = (customInstruction || aiPrompt).trim();
    if (!instruction || isAiProcessing) return;

    const currentContent =
      editorMode === "VISUAL" && visualEditorRef.current
        ? visualEditorRef.current.innerHTML
        : htmlContent;

    setIsAiProcessing(true);
    setStatusMessage(`✨ Gemini AI 正在执行编辑指令：“${instruction}”...`);

    try {
      const res = await fetch("/api/ai/file-studio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "AI_EDIT_CONTENT",
          textContent: currentContent,
          editInstruction: instruction,
        }),
      });
      const data = await res.json();
      if (data.success && data.content) {
        setHtmlContent(data.content);
        setAiPrompt("");
        setStatusMessage(`✅ AI 已完成文档编辑与排版 (${data.model})！`);
      } else {
        setStatusMessage(`⚠️ AI 编辑失败: ${data.error}`);
      }
    } catch (err: any) {
      setStatusMessage(`⚠️ 网络错误: ${err.message}`);
    } finally {
      setIsAiProcessing(false);
    }
  };

  // Export to Microsoft Word (.doc)
  const handleExportWord = () => {
    const content =
      editorMode === "VISUAL" && visualEditorRef.current
        ? visualEditorRef.current.innerHTML
        : htmlContent;

    const wordDocHtml = `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
<head>
  <meta charset='utf-8'>
  <title>${docTitle}</title>
  <style>
    body { font-family: 'Calibri', 'Microsoft YaHei', sans-serif; font-size: 11pt; color: #111827; line-height: 1.6; }
    h1 { font-size: 18pt; color: #1e3a8a; margin-bottom: 8pt; }
    h2 { font-size: 14pt; color: #1e40af; margin-top: 12pt; margin-bottom: 6pt; }
    h3 { font-size: 12pt; color: #334155; }
    table { border-collapse: collapse; width: 100%; margin: 10pt 0; }
    th, td { border: 1px solid #94a3b8; padding: 6pt 8pt; text-align: left; }
    th { background-color: #f1f5f9; font-weight: bold; }
  </style>
</head>
<body>
  ${content}
</body>
</html>`;

    const blob = new Blob(["\uFEFF", wordDocHtml], {
      type: "application/msword;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${docTitle || "Document"}.doc`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setStatusMessage(`📥 已导出 Word 文档: ${docTitle || "Document"}.doc`);
  };

  // Export to PDF (Opens clean A4 print-to-PDF frame)
  const handleExportPdf = () => {
    const content =
      editorMode === "VISUAL" && visualEditorRef.current
        ? visualEditorRef.current.innerHTML
        : htmlContent;

    const printWin = window.open("", "_blank", "width=900,height=750");
    if (!printWin) {
      alert("请允许浏览器弹出窗口以生成 PDF！");
      return;
    }

    printWin.document.write(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${docTitle || "Document"}</title>
  <style>
    @page { size: A4; margin: 18mm; }
    body { font-family: 'Inter', 'Microsoft YaHei', sans-serif; font-size: 11pt; color: #0f172a; line-height: 1.6; }
    h1 { font-size: 18pt; color: #0f172a; border-bottom: 1px solid #cbd5e1; padding-bottom: 6px; }
    h2 { font-size: 14pt; color: #1e293b; margin-top: 16px; }
    table { border-collapse: collapse; width: 100%; margin: 12px 0; }
    th, td { border: 1px solid #94a3b8; padding: 8px; text-align: left; font-size: 10pt; }
    th { background: #f1f5f9 !important; color: #0f172a !important; -webkit-print-color-adjust: exact; }
  </style>
</head>
<body>
  ${content}
  <script>
    window.onload = function() {
      setTimeout(function() { window.print(); }, 250);
    };
  </script>
</body>
</html>`);
    printWin.document.close();
    setStatusMessage(`🖨️ 已唤起 PDF 导出窗口（在打印目标中选择 "另存为 PDF / Save as PDF" 即可）！`);
  };

  // Export as Markdown / HTML
  const handleExportTextFormat = (ext: "md" | "html" | "txt") => {
    const rawHtml =
      editorMode === "VISUAL" && visualEditorRef.current
        ? visualEditorRef.current.innerHTML
        : htmlContent;

    let out = rawHtml;
    if (ext === "md") {
      out = rawHtml
        .replace(/<h1[^>]*>(.*?)<\/h1>/gi, "# $1\n\n")
        .replace(/<h2[^>]*>(.*?)<\/h2>/gi, "## $1\n\n")
        .replace(/<h3[^>]*>(.*?)<\/h3>/gi, "### $1\n\n")
        .replace(/<strong[^>]*>(.*?)<\/strong>/gi, "**$1**")
        .replace(/<b[^>]*>(.*?)<\/b>/gi, "**$1**")
        .replace(/<li[^>]*>(.*?)<\/li>/gi, "- $1\n")
        .replace(/<p[^>]*>(.*?)<\/p>/gi, "$1\n\n")
        .replace(/<br\s*\/?>/gi, "\n")
        .replace(/<[^>]+>/g, "");
    } else if (ext === "txt") {
      const tmp = document.createElement("div");
      tmp.innerHTML = rawHtml;
      out = tmp.innerText || tmp.textContent || "";
    }

    const blob = new Blob([out], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${docTitle || "Document"}.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // IMAGE STUDIO HANDLERS
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    const url = URL.createObjectURL(file);
    setImagePreviewUrl(url);
    setImageRotation(0);
    setImageScale(100);

    const img = new Image();
    img.onload = () => setOrigDimensions({ w: img.width, h: img.height });
    img.src = url;
  };

  const handleConvertAndDownloadImage = () => {
    if (!imagePreviewUrl) return;
    const img = new Image();
    img.onload = () => {
      const scale = imageScale / 100;
      const targetW = Math.round(img.width * scale);
      const targetH = Math.round(img.height * scale);

      const canvas = document.createElement("canvas");
      const isRotated90 = imageRotation % 180 !== 0;
      canvas.width = isRotated90 ? targetH : targetW;
      canvas.height = isRotated90 ? targetW : targetH;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      if (targetImageFormat === "image/jpeg" || targetImageFormat === "application/pdf") {
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }

      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.rotate((imageRotation * Math.PI) / 180);
      ctx.drawImage(img, -targetW / 2, -targetH / 2, targetW, targetH);

      if (targetImageFormat === "application/pdf") {
        const dataUrl = canvas.toDataURL("image/jpeg", imageQuality / 100);
        const win = window.open("", "_blank");
        if (win) {
          win.document.write(
            `<html><head><title>${imageFile?.name || "Image"}_to_PDF</title><style>@page{margin:10mm;}body{margin:0;display:flex;justify-content:center;align-items:center;}</style></head><body><img src="${dataUrl}" style="max-width:100%;max-height:95vh;object-fit:contain;" onload="setTimeout(()=>window.print(),200)" /></body></html>`
          );
          win.document.close();
        }
        return;
      }

      const ext =
        targetImageFormat === "image/png"
          ? "png"
          : targetImageFormat === "image/webp"
          ? "webp"
          : "jpg";
      const dataUrl = canvas.toDataURL(targetImageFormat, imageQuality / 100);
      const link = document.createElement("a");
      link.href = dataUrl;
      const base = (imageFile?.name || "image").replace(/\.[^.]+$/, "");
      link.download = `${base}_converted.${ext}`;
      link.click();
    };
    img.src = imagePreviewUrl;
  };

  // DATA TABLE STUDIO HANDLERS
  const handleDataFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    if (file.name.toLowerCase().endsWith(".json")) {
      try {
        const arr = JSON.parse(text);
        if (Array.isArray(arr) && arr.length > 0) {
          const keys = Object.keys(arr[0]);
          const rows = [keys, ...arr.map((item) => keys.map((k) => String(item[k] ?? "")))];
          setTableRows(rows);
        }
      } catch {
        alert("无效的 JSON 数组格式");
      }
    } else {
      const lines = text
        .trim()
        .split(/\r?\n/)
        .map((line) => line.split(",").map((cell) => cell.replace(/^"|"$/g, "").trim()));
      if (lines.length > 0) setTableRows(lines);
    }
  };

  const handleExportTable = (format: "csv" | "json" | "md") => {
    if (tableRows.length === 0) return;
    let out = "";
    if (format === "csv") {
      out = "\uFEFF" + tableRows.map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(",")).join("\n");
    } else if (format === "json") {
      const headers = tableRows[0];
      const objs = tableRows.slice(1).map((r) => {
        const o: Record<string, string> = {};
        headers.forEach((h, i) => (o[h || `col_${i}`] = r[i] || ""));
        return o;
      });
      out = JSON.stringify(objs, null, 2);
    } else {
      const headers = tableRows[0];
      const sep = headers.map(() => "---");
      out = [
        `| ${headers.join(" | ")} |`,
        `| ${sep.join(" | ")} |`,
        ...tableRows.slice(1).map((r) => `| ${r.join(" | ")} |`),
      ].join("\n");
    }

    const blob = new Blob([out], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `table_converted.${format}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-500 to-purple-600 text-white shadow-lg shadow-indigo-500/20 shrink-0">
            <ArrowRightLeft className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight text-white">
              File Converter & AI Editor Studio (全能格式转换与编辑台)
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Word (.docx/.doc) ↔ PDF 互转、所见即所得富文本编辑、图片格式转换压缩、CSV/JSON/Markdown 表格编辑
            </p>
          </div>
        </div>

        {/* Mode Switcher */}
        <div className="flex rounded-xl bg-slate-900 border border-slate-800 p-1 text-xs shrink-0">
          <button
            onClick={() => setActiveStudioTab("DOC_STUDIO")}
            className={`flex items-center gap-1.5 rounded-lg px-3.5 py-2 font-bold transition-all cursor-pointer ${
              activeStudioTab === "DOC_STUDIO"
                ? "bg-blue-600 text-white shadow-md"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <FileText className="h-3.5 w-3.5" />
            <span>Word ↔ PDF & AI 编辑器</span>
          </button>
          <button
            onClick={() => setActiveStudioTab("IMAGE_STUDIO")}
            className={`flex items-center gap-1.5 rounded-lg px-3.5 py-2 font-bold transition-all cursor-pointer ${
              activeStudioTab === "IMAGE_STUDIO"
                ? "bg-purple-600 text-white shadow-md"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <ImageIcon className="h-3.5 w-3.5" />
            <span>图片转 PDF / 格式压缩</span>
          </button>
          <button
            onClick={() => setActiveStudioTab("DATA_STUDIO")}
            className={`flex items-center gap-1.5 rounded-lg px-3.5 py-2 font-bold transition-all cursor-pointer ${
              activeStudioTab === "DATA_STUDIO"
                ? "bg-emerald-600 text-white shadow-md"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <FileSpreadsheet className="h-3.5 w-3.5" />
            <span>CSV ↔ JSON 表格编辑</span>
          </button>
        </div>
      </div>

      {/* Status Notification */}
      {statusMessage && (
        <div className="flex items-center justify-between gap-3 rounded-2xl border border-blue-500/30 bg-blue-950/30 px-4 py-3 text-xs text-blue-200 animate-fadeIn">
          <div className="flex items-center gap-2">
            {isAiProcessing ? (
              <Loader2 className="h-4 w-4 animate-spin text-blue-400 shrink-0" />
            ) : (
              <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
            )}
            <span>{statusMessage}</span>
          </div>
          <button onClick={() => setStatusMessage(null)} className="text-slate-400 hover:text-white">
            ✕
          </button>
        </div>
      )}

      {/* TAB 1: WORD <-> PDF & AI RICH DOCUMENT EDITOR */}
      {activeStudioTab === "DOC_STUDIO" && (
        <div className="space-y-4">
          {/* Top Action Bar: Upload & Convert Export */}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
            <div className="flex flex-wrap items-center gap-2.5">
              <input
                ref={docFileInputRef}
                type="file"
                accept=".pdf,.doc,.docx,.txt,.md,.html,.png,.jpg,.jpeg,.webp"
                className="hidden"
                onChange={handleDocumentUpload}
              />
              <button
                onClick={() => docFileInputRef.current?.click()}
                disabled={isAiProcessing}
                className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 px-4 py-2.5 text-xs font-extrabold text-white shadow-lg shadow-blue-600/25 transition-all active:scale-95 cursor-pointer"
              >
                <Upload className="h-4 w-4" />
                <span>上传文件 (PDF / Word .docx / 图片 / MD)</span>
              </button>

              <input
                type="text"
                value={docTitle}
                onChange={(e) => setDocTitle(e.target.value)}
                placeholder="文档文件名..."
                className="rounded-xl bg-slate-950 border border-slate-700 px-3 py-2 text-xs font-semibold text-white outline-none focus:border-blue-500 w-44"
              />
            </div>

            {/* Export Target Format Buttons */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-bold text-slate-400 mr-1">一键转换导出:</span>
              <button
                onClick={handleExportWord}
                className="flex items-center gap-1.5 rounded-xl bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/40 px-3.5 py-2 text-xs font-bold text-blue-200 transition-all cursor-pointer"
              >
                <Download className="h-3.5 w-3.5 text-blue-400" />
                <span>导出 Word (.doc)</span>
              </button>

              <button
                onClick={handleExportPdf}
                className="flex items-center gap-1.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 px-3.5 py-2 text-xs font-bold text-rose-200 transition-all cursor-pointer"
              >
                <Printer className="h-3.5 w-3.5 text-rose-400" />
                <span>导出 PDF (.pdf)</span>
              </button>

              <button
                onClick={() => handleExportTextFormat("md")}
                className="flex items-center gap-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 px-3 py-2 text-xs font-semibold text-slate-200 transition-all cursor-pointer"
              >
                <span>.MD</span>
              </button>

              <button
                onClick={() => handleExportTextFormat("txt")}
                className="flex items-center gap-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 px-3 py-2 text-xs font-semibold text-slate-200 transition-all cursor-pointer"
              >
                <span>.TXT</span>
              </button>
            </div>
          </div>

          {/* AI Smart Document Editor Bar */}
          <div className="rounded-2xl border border-purple-500/30 bg-gradient-to-r from-purple-950/30 via-slate-900 to-indigo-950/30 p-3.5 space-y-2.5">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-purple-300 shrink-0">
                <Wand2 className="h-4 w-4 text-purple-400" />
                <span>AI 智能改写 / 排版:</span>
              </div>
              <input
                type="text"
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAiEditDocument()}
                placeholder="输入编辑指令：例如“把全文翻译为英文”、“把里面的数据整理成规范表格”、“润色为正式商务公文”..."
                className="flex-1 rounded-xl bg-slate-950/90 border border-slate-700 px-3.5 py-2 text-xs text-white placeholder-slate-500 outline-none focus:border-purple-500"
              />
              <button
                onClick={() => handleAiEditDocument()}
                disabled={isAiProcessing || !aiPrompt.trim()}
                className="flex items-center justify-center gap-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-40 px-4 py-2 text-xs font-bold text-white transition-all cursor-pointer shrink-0"
              >
                {isAiProcessing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                <span>AI 执行修改</span>
              </button>
            </div>

            {/* 1-Click AI Presets */}
            <div className="flex flex-wrap items-center gap-1.5">
              {[
                "✨ 智能美化排版并修正错别字",
                "🌐 翻译为地道专业英文 (Translate to English)",
                "🇨🇳 翻译为流畅中文 (Translate to Chinese)",
                "📊 提取文中的所有数字与明细生成 HTML 表格",
                "📝 提炼核心摘要与行动清单 (Executive Summary)",
              ].map((preset, idx) => (
                <button
                  key={idx}
                  type="button"
                  disabled={isAiProcessing}
                  onClick={() => handleAiEditDocument(preset)}
                  className="rounded-lg bg-slate-800/80 hover:bg-purple-950/60 border border-slate-700/80 hover:border-purple-500/40 px-2.5 py-1 text-[11px] text-slate-300 hover:text-purple-200 transition-colors cursor-pointer"
                >
                  {preset}
                </button>
              ))}
            </div>
          </div>

          {/* Formatting Toolbar & WYSIWYG Editor Canvas */}
          <div className="rounded-2xl border border-slate-800 bg-slate-950 overflow-hidden shadow-2xl">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 bg-slate-900/90 px-3 py-2">
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => execFormat("bold")}
                  title="加粗 (Bold)"
                  className="rounded-lg p-1.5 text-slate-300 hover:bg-slate-800 hover:text-white cursor-pointer"
                >
                  <Bold className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => execFormat("italic")}
                  title="斜体 (Italic)"
                  className="rounded-lg p-1.5 text-slate-300 hover:bg-slate-800 hover:text-white cursor-pointer"
                >
                  <Italic className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => execFormat("underline")}
                  title="下划线 (Underline)"
                  className="rounded-lg p-1.5 text-slate-300 hover:bg-slate-800 hover:text-white cursor-pointer"
                >
                  <Underline className="h-4 w-4" />
                </button>
                <span className="mx-1 h-4 w-[1px] bg-slate-800" />
                <button
                  type="button"
                  onClick={() => execFormat("formatBlock", "H1")}
                  className="rounded-lg px-2 py-1 text-xs font-bold text-slate-300 hover:bg-slate-800 hover:text-white cursor-pointer"
                >
                  H1
                </button>
                <button
                  type="button"
                  onClick={() => execFormat("formatBlock", "H2")}
                  className="rounded-lg px-2 py-1 text-xs font-bold text-slate-300 hover:bg-slate-800 hover:text-white cursor-pointer"
                >
                  H2
                </button>
                <button
                  type="button"
                  onClick={() => execFormat("insertUnorderedList")}
                  title="项目符号"
                  className="rounded-lg p-1.5 text-slate-300 hover:bg-slate-800 hover:text-white cursor-pointer"
                >
                  <List className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => execFormat("justifyLeft")}
                  title="左对齐"
                  className="rounded-lg p-1.5 text-slate-300 hover:bg-slate-800 hover:text-white cursor-pointer"
                >
                  <AlignLeft className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => execFormat("justifyCenter")}
                  title="居中"
                  className="rounded-lg p-1.5 text-slate-300 hover:bg-slate-800 hover:text-white cursor-pointer"
                >
                  <AlignCenter className="h-4 w-4" />
                </button>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    const text =
                      editorMode === "VISUAL" && visualEditorRef.current
                        ? visualEditorRef.current.innerText
                        : htmlContent;
                    navigator.clipboard.writeText(text);
                    setStatusMessage("📋 已复制全文内容到剪贴板！");
                  }}
                  className="flex items-center gap-1 rounded-lg bg-slate-800 hover:bg-slate-700 px-2.5 py-1 text-[11px] font-semibold text-slate-300 cursor-pointer"
                >
                  <Copy className="h-3 w-3" />
                  <span>复制全文</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (editorMode === "VISUAL" && visualEditorRef.current) {
                      setHtmlContent(visualEditorRef.current.innerHTML);
                    }
                    setEditorMode(editorMode === "VISUAL" ? "SOURCE" : "VISUAL");
                  }}
                  className="flex items-center gap-1 rounded-lg bg-slate-800 hover:bg-slate-700 px-2.5 py-1 text-[11px] font-semibold text-cyan-300 cursor-pointer"
                >
                  {editorMode === "VISUAL" ? <Code className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                  <span>{editorMode === "VISUAL" ? "源码视图" : "所见即所得"}</span>
                </button>
              </div>
            </div>

            {editorMode === "VISUAL" ? (
              <div
                ref={visualEditorRef}
                contentEditable
                suppressContentEditableWarning
                onBlur={(e) => setHtmlContent(e.currentTarget.innerHTML)}
                className="min-h-[460px] p-6 sm:p-8 text-sm text-slate-100 outline-none prose prose-invert max-w-none leading-relaxed space-y-3 focus:ring-1 focus:ring-blue-500/40"
              />
            ) : (
              <textarea
                value={htmlContent}
                onChange={(e) => setHtmlContent(e.target.value)}
                className="w-full min-h-[460px] bg-slate-950 p-6 font-mono text-xs text-emerald-300 outline-none resize-y"
              />
            )}
          </div>
        </div>
      )}

      {/* TAB 2: IMAGE CONVERTER & EDITOR (PNG <-> JPG <-> WEBP <-> PDF) */}
      {activeStudioTab === "IMAGE_STUDIO" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-5 rounded-2xl border border-slate-800 bg-slate-900/70 p-5 space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <ImageIcon className="h-4 w-4 text-purple-400" />
              <span>图片格式互转 & 尺寸画质编辑</span>
            </h3>

            <input
              ref={imgInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleImageSelect}
            />
            <button
              onClick={() => imgInputRef.current?.click()}
              className="w-full flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-purple-500/40 bg-purple-950/20 hover:bg-purple-950/40 py-6 text-xs font-bold text-purple-200 transition-all cursor-pointer"
            >
              <Upload className="h-5 w-5 text-purple-400" />
              <span>选择图片 (PNG / JPG / WEBP / BMP)</span>
            </button>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-slate-400 block mb-1">目标输出格式 (Convert To)</label>
                <select
                  value={targetImageFormat}
                  onChange={(e) => setTargetImageFormat(e.target.value as any)}
                  className="w-full rounded-xl bg-slate-950 border border-slate-700 p-2.5 text-white outline-none"
                >
                  <option value="image/webp">WEBP (高压缩比网页推荐)</option>
                  <option value="image/png">PNG (无损透明背景)</option>
                  <option value="image/jpeg">JPG / JPEG (通用照片格式)</option>
                  <option value="application/pdf">PDF (图片转 A4 PDF 文档)</option>
                </select>
              </div>

              <div>
                <div className="flex justify-between text-slate-400 mb-1">
                  <span>画质与体积压缩 (Quality)</span>
                  <span className="text-purple-300 font-mono">{imageQuality}%</span>
                </div>
                <input
                  type="range"
                  min={20}
                  max={100}
                  value={imageQuality}
                  onChange={(e) => setImageQuality(Number(e.target.value))}
                  className="w-full accent-purple-500"
                />
              </div>

              <div>
                <div className="flex justify-between text-slate-400 mb-1">
                  <span>尺寸缩放 (Resize Scale)</span>
                  <span className="text-cyan-300 font-mono">
                    {imageScale}%{" "}
                    {origDimensions.w > 0 &&
                      `(${Math.round((origDimensions.w * imageScale) / 100)}×${Math.round(
                        (origDimensions.h * imageScale) / 100
                      )})`}
                  </span>
                </div>
                <input
                  type="range"
                  min={25}
                  max={200}
                  step={5}
                  value={imageScale}
                  onChange={(e) => setImageScale(Number(e.target.value))}
                  className="w-full accent-cyan-500"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setImageRotation((r) => (r + 90) % 360)}
                  disabled={!imagePreviewUrl}
                  className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 py-2.5 font-semibold text-white disabled:opacity-40 cursor-pointer"
                >
                  <RotateCw className="h-4 w-4" />
                  <span>旋转 90° ({imageRotation}°)</span>
                </button>

                <button
                  type="button"
                  onClick={handleConvertAndDownloadImage}
                  disabled={!imagePreviewUrl}
                  className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 py-2.5 font-bold text-white disabled:opacity-40 cursor-pointer shadow-lg shadow-purple-600/30"
                >
                  <Download className="h-4 w-4" />
                  <span>转换并下载</span>
                </button>
              </div>
            </div>
          </div>

          <div className="lg:col-span-7 rounded-2xl border border-slate-800 bg-slate-950 p-6 flex items-center justify-center min-h-[380px]">
            {imagePreviewUrl ? (
              <div className="text-center space-y-3">
                <img
                  src={imagePreviewUrl}
                  alt="Preview"
                  style={{ transform: `rotate(${imageRotation}deg)` }}
                  className="max-h-80 max-w-full rounded-xl border border-slate-800 object-contain mx-auto transition-transform"
                />
                <p className="text-xs text-slate-400">
                  原图: {imageFile?.name} ({origDimensions.w} × {origDimensions.h} px)
                </p>
              </div>
            ) : (
              <p className="text-xs text-slate-500">请先在左侧选择一张图片以预览和转换格式</p>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: CSV <-> JSON <-> MARKDOWN INTERACTIVE TABLE EDITOR */}
      {activeStudioTab === "DATA_STUDIO" && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
            <div className="flex items-center gap-2">
              <input
                ref={dataFileInputRef}
                type="file"
                accept=".csv,.json,.txt"
                className="hidden"
                onChange={handleDataFileUpload}
              />
              <button
                onClick={() => dataFileInputRef.current?.click()}
                className="flex items-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 px-4 py-2 text-xs font-bold text-white cursor-pointer"
              >
                <Upload className="h-3.5 w-3.5" />
                <span>导入 CSV / JSON</span>
              </button>
              <button
                onClick={() =>
                  setTableRows((prev) => [...prev, new Array(prev[0]?.length || 4).fill("")])
                }
                className="rounded-xl bg-slate-800 hover:bg-slate-700 px-3 py-2 text-xs font-semibold text-slate-200 cursor-pointer"
              >
                + 新增一行
              </button>
              <button
                onClick={() => setTableRows((prev) => prev.map((r, i) => [...r, i === 0 ? "New_Col" : ""]))}
                className="rounded-xl bg-slate-800 hover:bg-slate-700 px-3 py-2 text-xs font-semibold text-slate-200 cursor-pointer"
              >
                + 新增一列
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => handleExportTable("csv")}
                className="rounded-xl bg-emerald-500/20 border border-emerald-500/40 px-3 py-2 text-xs font-bold text-emerald-300 hover:bg-emerald-500/30 cursor-pointer"
              >
                导出 .CSV (Excel)
              </button>
              <button
                onClick={() => handleExportTable("json")}
                className="rounded-xl bg-cyan-500/20 border border-cyan-500/40 px-3 py-2 text-xs font-bold text-cyan-300 hover:bg-cyan-500/30 cursor-pointer"
              >
                导出 .JSON
              </button>
              <button
                onClick={() => handleExportTable("md")}
                className="rounded-xl bg-purple-500/20 border border-purple-500/40 px-3 py-2 text-xs font-bold text-purple-300 hover:bg-purple-500/30 cursor-pointer"
              >
                导出 Markdown 表
              </button>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-950 overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <tbody>
                {tableRows.map((row, rIdx) => (
                  <tr
                    key={rIdx}
                    className={
                      rIdx === 0
                        ? "bg-slate-900 font-bold text-emerald-300 border-b border-slate-700"
                        : "border-b border-slate-800/60"
                    }
                  >
                    {row.map((cell, cIdx) => (
                      <td key={cIdx} className="border-r border-slate-800 p-1.5">
                        <input
                          type="text"
                          value={cell}
                          onChange={(e) => {
                            const val = e.target.value;
                            setTableRows((prev) =>
                              prev.map((r, ri) =>
                                ri === rIdx ? r.map((c, ci) => (ci === cIdx ? val : c)) : r
                              )
                            );
                          }}
                          className="w-full bg-transparent px-2 py-1 text-white outline-none focus:bg-slate-800/80 rounded"
                        />
                      </td>
                    ))}
                    <td className="w-10 text-center">
                      {rIdx > 0 && (
                        <button
                          onClick={() => setTableRows((prev) => prev.filter((_, i) => i !== rIdx))}
                          className="text-slate-500 hover:text-rose-400 p-1 cursor-pointer"
                          title="删除行"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
