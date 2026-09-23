"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Mic,
  Square,
  Send,
  Sparkles,
  Bot,
  User,
  CheckCheck,
  Smartphone,
  Volume2,
  HelpCircle,
  Zap,
  CheckCircle2,
  AlertCircle,
  ArrowUpRight,
  Plus,
  Loader2,
  ExternalLink,
  Trash2,
  X,
  Paperclip,
  FileText,
  ChevronDown,
  ChevronUp,
  Check,
  RefreshCw,
  FileUp,
} from "lucide-react";
import { formatCurrency, getCategoryMeta, CATEGORY_DEFINITIONS } from "@/lib/category-meta";

export interface ReconciliationReportData {
  statement: {
    bankName?: string;
    accountNumber?: string;
    statementPeriod?: { start?: string; end?: string };
    currency: string;
    totalDebit: number;
    totalCredit: number;
  };
  summary: {
    totalStatementTransactions: number;
    matchedCount: number;
    discrepancyCount: number;
    missingCount: number;
    ambiguousCount: number;
  };
  matched: Array<{
    statementTx: any;
    dbTx: {
      id: string;
      date: string;
      amount: number;
      description: string;
      category: string;
      subCategory?: string | null;
      accountName?: string | null;
    };
  }>;
  discrepancies: Array<{
    statementTx: any;
    dbTx: {
      id: string;
      date: string;
      amount: number;
      description: string;
      category: string;
      subCategory?: string | null;
      accountName?: string | null;
    };
    difference: number;
    resolved?: boolean;
  }>;
  missing: Array<any & { imported?: boolean }>;
  ambiguous: Array<any & { resolved?: boolean }>;
}

interface ChatMessage {
  id: string;
  sender: "user" | "bot";
  type: "text" | "voice" | "file";
  fileInfo?: {
    name: string;
    size: string;
    mimeType: string;
  };
  text: string;
  transcript?: string;
  intent?: string;
  transactionId?: string;
  todoId?: string;
  noteId?: string;
  parsedData?: {
    amount: number;
    category: string;
    description: string;
    currency: string;
    type: string;
    tags?: string;
    accountName?: string | null;
    todoTitle?: string;
    todoDueDate?: string | null;
    todoPriority?: string;
    noteTitle?: string;
    noteContent?: string;
  };
  reconciliationData?: ReconciliationReportData;
  uploadStatus?:
    | "SAVED"
    | "NO_AMOUNT"
    | "ERROR"
    | "TODO_SAVED"
    | "NOTE_SAVED"
    | "CLARIFICATION"
    | "CANCELLED"
    | "UPDATED"
    | "RECONCILIATION_REPORT";
  timestamp: string;
}

interface WhatsAppSimulatorProps {
  currency: string;
  onExpenseLogged?: () => void;
}

export const WhatsAppSimulator: React.FC<WhatsAppSimulatorProps> = ({
  currency,
  onExpenseLogged,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome-1",
      sender: "bot",
      type: "text",
      text: "👋 Hi! I'm your IV4N6Hub Financial & Life Assistant on WhatsApp.\n\nHere is what you can tell me:\n• 💰 Expense: 'Spent 25 on fuel with cash' or '吃了午餐25块'\n• 📎 Bank Statement: Click 📎 to upload bank PDF or screenshot for auto-reconciliation & missing check!\n• 📋 Task: 'Remind me to buy groceries tomorrow' or '提醒我明天买菜'\n• 📝 Note: 'Note: door passcode is 8842' or '记一下：门禁密码是8842'\n• 💬 Missing details? Tell me what you did, and I'll follow up with questions!",
      uploadStatus: "SAVED",
      timestamp: "12:00 PM",
    },
  ]);

  const [inputMessage, setInputMessage] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStep, setProcessingStep] = useState("Analyzing with Gemini AI...");

  // Statement Reconciliation States
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [expandedMatched, setExpandedMatched] = useState<Record<string, boolean>>({});
  const [pendingClarification, setPendingClarification] = useState<{
    msgId: string;
    itemIndex: number;
    item: any;
  } | null>(null);
  const [isBatchImporting, setIsBatchImporting] = useState<string | null>(null);
  const [isSyncingDiscrepancy, setIsSyncingDiscrepancy] = useState<string | null>(null);

  // Quick Manual Edit Modal if amount not detected
  const [manualModalOpen, setManualModalOpen] = useState(false);
  const [manualDesc, setManualDesc] = useState("");
  const [manualAmount, setManualAmount] = useState("");
  const [manualCategory, setManualCategory] = useState("Food & Dining");
  const [manualSaving, setManualSaving] = useState(false);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const isCancelledRef = useRef<boolean>(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const chatBottomRef = useRef<HTMLDivElement | null>(null);
  // Always-current ref so callbacks read latest messages without stale closure
  const messagesRef = useRef<ChatMessage[]>(messages);
  useEffect(() => { messagesRef.current = messages; }, [messages]);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isProcessing]);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  // Voice recording handlers
  const startRecording = async () => {
    try {
      isCancelledRef.current = false;
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        // Release hardware microphone stream immediately
        stream.getTracks().forEach((track) => track.stop());
        streamRef.current = null;

        // If user cancelled, completely discard chunks and do not send
        if (isCancelledRef.current) {
          isCancelledRef.current = false;
          audioChunksRef.current = [];
          return;
        }

        const audioBlob = new Blob(audioChunksRef.current, {
          type: mediaRecorder.mimeType || "audio/webm",
        });
        audioChunksRef.current = [];

        if (audioBlob.size < 500) {
          // Empty or accidental tap — don't send empty audio to AI
          console.warn("Audio recording was too brief (<500 bytes), skipped upload");
          return;
        }

        if (audioBlob.size > 0) {
          await handleAudioUpload(audioBlob);
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingDuration(0);

      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = setInterval(() => {
        setRecordingDuration((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      console.error("Microphone access error:", err);
      alert(
        "Microphone access was denied or not supported by your browser. You can still test with text input!"
      );
    }
  };

  // Discard and abort voice recording without sending
  const cancelRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      isCancelledRef.current = true;
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
      setRecordingDuration(0);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
    }
  };

  // Stop recording and send audio to AI for processing
  const stopAndSendRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      isCancelledRef.current = false;
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  const stopRecording = stopAndSendRecording;

  const handleAudioUpload = async (audioBlob: Blob) => {
    setIsProcessing(true);
    setProcessingStep("Transcribing voice note with Gemini AI...");
    const now = new Date().toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });

    const displayDuration = recordingDuration > 0 ? recordingDuration : 1;
    const userMsgId = String(Date.now());
    setMessages((prev) => [
      ...prev,
      {
        id: userMsgId,
        sender: "user",
        type: "voice",
        text: `🎤 Voice note (${displayDuration}s)`,
        timestamp: now,
      },
    ]);

    const historyPayload = messagesRef.current.slice(-6).map((m) => ({
      role: m.sender === "user" ? ("user" as const) : ("assistant" as const),
      text: m.transcript ? `${m.text} (${m.transcript})` : m.text,
    }));

    try {
      const reader = new FileReader();
      reader.readAsDataURL(audioBlob);
      reader.onloadend = async () => {
        const base64Data = (reader.result as string).split(",")[1];

        setProcessingStep("Analyzing voice intent & details with Gemini AI...");
        const res = await fetch("/api/ai/parse", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            audioBase64: base64Data,
            mimeType: audioBlob.type,
            defaultCurrency: currency,
            autoSave: true,
            source: "WHATSAPP_VOICE",
            conversationHistory: historyPayload,
          }),
        });

        const data = await res.json();
        handleApiResponse(data, now);
      };
    } catch (err: any) {
      console.error("Audio processing failed:", err);
      setIsProcessing(false);
      setMessages((prev) => [
        ...prev,
        {
          id: String(Date.now() + 1),
          sender: "bot",
          type: "text",
          text: `抱歉，刚才的语音分析遇到了网络延迟或超时。🎤 请问您具体消费了多少钱，或者要记录什么事项？您可以直接打字告诉我哦！`,
          uploadStatus: "CLARIFICATION",
          timestamp: now,
        },
      ]);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Clear input so same file can be re-selected
    e.target.value = "";

    const fileSizeStr =
      file.size > 1024 * 1024
        ? `${(file.size / (1024 * 1024)).toFixed(1)} MB`
        : `${Math.round(file.size / 1024)} KB`;

    const now = new Date().toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });

    const userMsgId = String(Date.now());
    setMessages((prev) => [
      ...prev,
      {
        id: userMsgId,
        sender: "user",
        type: "file",
        fileInfo: {
          name: file.name,
          size: fileSizeStr,
          mimeType: file.type || "application/pdf",
        },
        text: `📎 上传账单：${file.name} (${fileSizeStr})`,
        timestamp: now,
      },
    ]);

    setIsProcessing(true);
    setProcessingStep("Gemini AI 正在深入分析账单流水并核对数据库记录...");

    try {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onloadend = async () => {
        const rawResult = reader.result as string;
        const base64Data = rawResult.includes(",") ? rawResult.split(",")[1].trim() : rawResult.trim();
        
        let clientMime = file.type || "application/pdf";
        if (file.name.toLowerCase().endsWith(".pdf")) {
          clientMime = "application/pdf";
        } else if (file.name.toLowerCase().endsWith(".png")) {
          clientMime = "image/png";
        } else if (file.name.toLowerCase().endsWith(".jpg") || file.name.toLowerCase().endsWith(".jpeg")) {
          clientMime = "image/jpeg";
        }

        const res = await fetch("/api/ai/reconcile", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "ANALYZE",
            fileBase64: base64Data,
            mimeType: clientMime,
            fileName: file.name,
            currency,
          }),
        });

        const data = await res.json();
        setIsProcessing(false);

        if (data.success && data.statement) {
          const s = data.summary;
          const botReportText = `📊 账单核对完成！为您比对了 ${s.totalStatementTransactions} 笔交易记录：\n🟢 已匹配一致：${s.matchedCount} 笔\n🟡 发现金额差异：${s.discrepancyCount} 笔\n🔵 发现漏记账：${s.missingCount} 笔\n❓ 需向您确认：${s.ambiguousCount} 笔`;

          setMessages((prev) => [
            ...prev,
            {
              id: String(Date.now() + 1),
              sender: "bot",
              type: "text",
              text: botReportText,
              uploadStatus: "RECONCILIATION_REPORT",
              reconciliationData: data,
              timestamp: now,
            },
          ]);
        } else {
          setMessages((prev) => [
            ...prev,
            {
              id: String(Date.now() + 1),
              sender: "bot",
              type: "text",
              text: `⚠️ 账单分析未能识别出交易明细：${data.error || data.message || "请检查文件是否为清晰的银行流水账单或对账单截图。"}`,
              uploadStatus: "ERROR",
              timestamp: now,
            },
          ]);
        }
      };
    } catch (err: any) {
      console.error("Statement upload failed:", err);
      setIsProcessing(false);
      setMessages((prev) => [
        ...prev,
        {
          id: String(Date.now() + 1),
          sender: "bot",
          type: "text",
          text: `抱歉，账单解析出错：${err.message || "网络请求失败"}`,
          uploadStatus: "ERROR",
          timestamp: now,
        },
      ]);
    }
  };

  const handleBatchImportMissing = useCallback(async (msgId: string, items: any[]) => {
    if (!items || items.length === 0 || isBatchImporting) return;
    setIsBatchImporting(msgId);
    try {
      const res = await fetch("/api/ai/reconcile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "BATCH_IMPORT",
          items,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setMessages((prev) =>
          prev.map((m) => {
            if (m.id === msgId && m.reconciliationData) {
              const updatedMissing = m.reconciliationData.missing.map((item) => ({
                ...item,
                imported: true,
              }));
              return {
                ...m,
                reconciliationData: {
                  ...m.reconciliationData,
                  missing: updatedMissing,
                  summary: {
                    ...m.reconciliationData.summary,
                    missingCount: 0,
                  },
                },
              };
            }
            return m;
          })
        );
        const now = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
        setMessages((prev) => [
          ...prev,
          {
            id: String(Date.now() + 1),
            sender: "bot",
            type: "text",
            text: `✅ 已成功将 ${items.length} 笔漏记账单交易批量补入账本！您可以在交易明细中查看。`,
            uploadStatus: "SAVED",
            timestamp: now,
          },
        ]);
        if (onExpenseLogged) onExpenseLogged();
      } else {
        alert(data.error || "Failed to batch import transactions");
      }
    } catch (e: any) {
      console.error("Batch import error:", e);
      alert("Error importing transactions: " + e.message);
    } finally {
      setIsBatchImporting(null);
    }
  }, [isBatchImporting, onExpenseLogged]);

  const handleImportSingleMissing = useCallback(async (msgId: string, item: any, itemIndex: number) => {
    try {
      const res = await fetch("/api/ai/reconcile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "BATCH_IMPORT",
          items: [item],
        }),
      });
      const data = await res.json();
      if (data.success) {
        setMessages((prev) =>
          prev.map((m) => {
            if (m.id === msgId && m.reconciliationData) {
              const updatedMissing = [...m.reconciliationData.missing];
              if (updatedMissing[itemIndex]) {
                updatedMissing[itemIndex] = { ...updatedMissing[itemIndex], imported: true };
              }
              return {
                ...m,
                reconciliationData: {
                  ...m.reconciliationData,
                  missing: updatedMissing,
                },
              };
            }
            return m;
          })
        );
        if (onExpenseLogged) onExpenseLogged();
      }
    } catch (e) {
      console.error("Single import error:", e);
    }
  }, [onExpenseLogged]);

  const handleApplyDiscrepancy = useCallback(async (
    msgId: string,
    discIndex: number,
    discrepancy: any
  ) => {
    const syncKey = `${msgId}-${discIndex}`;
    if (isSyncingDiscrepancy) return;
    setIsSyncingDiscrepancy(syncKey);

    try {
      const res = await fetch("/api/ai/reconcile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "APPLY_DISCREPANCY",
          transactionId: discrepancy.dbTx.id,
          newAmount: discrepancy.statementTx.amount,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setMessages((prev) =>
          prev.map((m) => {
            if (m.id === msgId && m.reconciliationData) {
              const updatedDiscrepancies = [...m.reconciliationData.discrepancies];
              if (updatedDiscrepancies[discIndex]) {
                updatedDiscrepancies[discIndex] = {
                  ...updatedDiscrepancies[discIndex],
                  resolved: true,
                };
              }
              return {
                ...m,
                reconciliationData: {
                  ...m.reconciliationData,
                  discrepancies: updatedDiscrepancies,
                },
              };
            }
            return m;
          })
        );
        if (onExpenseLogged) onExpenseLogged();
      } else {
        alert(data.error || "Failed to update transaction amount");
      }
    } catch (e: any) {
      console.error("Discrepancy sync error:", e);
      alert("Error syncing amount: " + e.message);
    } finally {
      setIsSyncingDiscrepancy(null);
    }
  }, [isSyncingDiscrepancy, onExpenseLogged]);

  const handleSendText = async (textToSend?: string) => {
    const text = (textToSend || inputMessage).trim();
    if (!text || isProcessing) return;

    setInputMessage("");

    // Check if user is replying to an ambiguous transaction clarification
    if (pendingClarification) {
      const activePending = pendingClarification;
      setPendingClarification(null);
      setIsProcessing(true);
      setProcessingStep("Updating transaction with your clarification...");
      const now = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

      setMessages((prev) => [
        ...prev,
        {
          id: String(Date.now()),
          sender: "user",
          type: "text",
          text: text,
          timestamp: now,
        },
      ]);

      try {
        const res = await fetch("/api/ai/reconcile", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "RESOLVE_CLARIFICATION",
            item: activePending.item,
            userExplanation: text,
          }),
        });
        const data = await res.json();
        setIsProcessing(false);
        if (data.success) {
          // Update the message's ambiguous item as resolved
          setMessages((prev) =>
            prev.map((m) => {
              if (m.id === activePending.msgId && m.reconciliationData) {
                const newAmbiguous = [...m.reconciliationData.ambiguous];
                if (newAmbiguous[activePending.itemIndex]) {
                  newAmbiguous[activePending.itemIndex] = {
                    ...newAmbiguous[activePending.itemIndex],
                    resolved: true,
                  };
                }
                return {
                  ...m,
                  reconciliationData: {
                    ...m.reconciliationData,
                    ambiguous: newAmbiguous,
                  },
                };
              }
              return m;
            })
          );
          setMessages((prev) => [
            ...prev,
            {
              id: String(Date.now() + 1),
              sender: "bot",
              type: "text",
              text: data.message || `✅ 已为您将交易记录为：${data.transaction?.description} (RM ${data.transaction?.amount?.toFixed(2)})！`,
              uploadStatus: "SAVED",
              timestamp: now,
            },
          ]);
          if (onExpenseLogged) onExpenseLogged();
        } else {
          setMessages((prev) => [
            ...prev,
            {
              id: String(Date.now() + 1),
              sender: "bot",
              type: "text",
              text: `保存失败：${data.error || "未知错误"}`,
              uploadStatus: "ERROR",
              timestamp: now,
            },
          ]);
        }
      } catch (err: any) {
        setIsProcessing(false);
        setMessages((prev) => [
          ...prev,
          {
            id: String(Date.now() + 1),
            sender: "bot",
            type: "text",
            text: `抱歉，保存说明时出现网络异常：${err.message}`,
            uploadStatus: "ERROR",
            timestamp: now,
          },
        ]);
      }
      return;
    }

    setIsProcessing(true);
    setProcessingStep("Analyzing message with Gemini AI...");
    const now = new Date().toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });

    setMessages((prev) => [
      ...prev,
      {
        id: String(Date.now()),
        sender: "user",
        type: "text",
        text: text,
        timestamp: now,
      },
    ]);

    const historyPayload = messagesRef.current.slice(-6).map((m) => ({
      role: m.sender === "user" ? ("user" as const) : ("assistant" as const),
      text: m.text,
    }));

    try {
      const res = await fetch("/api/ai/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text,
          defaultCurrency: currency,
          autoSave: true,
          source: "WHATSAPP_TEXT",
          conversationHistory: historyPayload,
        }),
      });

      const data = await res.json();
      handleApiResponse(data, now);
    } catch (err: any) {
      console.error("Text parsing failed:", err);
      setIsProcessing(false);
      setMessages((prev) => [
        ...prev,
        {
          id: String(Date.now() + 1),
          sender: "bot",
          type: "text",
          text: `抱歉，刚才连接 AI 稍有延迟。请问您这笔消费是多少钱？是用现金还是银行卡支付的呢？请直接告诉我！`,
          uploadStatus: "CLARIFICATION",
          timestamp: now,
        },
      ]);
    }
  };

  const handleCancelItem = useCallback(async (
    msgId: string,
    type: "TRANSACTION" | "TODO" | "NOTE",
    targetId?: string
  ) => {
    if (!targetId || cancellingId) return;
    setCancellingId(msgId);
    try {
      let url = "";
      if (type === "TRANSACTION") url = `/api/finance/transactions?id=${targetId}`;
      else if (type === "TODO") url = `/api/todos?id=${targetId}`;
      else if (type === "NOTE") url = `/api/notes?id=${targetId}`;

      const res = await fetch(url, { method: "DELETE" });
      if (res.ok) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === msgId
              ? {
                  ...m,
                  uploadStatus: "CANCELLED",
                  text:
                    type === "TRANSACTION"
                      ? `🚫 已撤销该笔支出并退回账户余额`
                      : type === "TODO"
                      ? `🚫 已撤销/删除该待办任务`
                      : `🚫 已撤销/删除该灵感便签`,
                }
              : m
          )
        );
        if (onExpenseLogged) onExpenseLogged();
      } else {
        alert("Failed to cancel item. Please check ledger or records.");
      }
    } catch (e) {
      console.error("Cancellation error:", e);
      alert("Error cancelling item");
    } finally {
      setCancellingId(null);
    }
  }, [cancellingId, onExpenseLogged]);

  const handleApiResponse = (data: any, timestamp: string) => {
    setIsProcessing(false);
    if (data.success && data.parsed) {
      const parsed = data.parsed;

      // 0. Cancel / Undo Intent
      if (data.intent === "CANCEL" || parsed.intent === "CANCEL") {
        setMessages((prev) => [
          ...prev,
          {
            id: String(Date.now() + 1),
            sender: "bot",
            type: "text",
            text: data.message || "🚫 已为您撤销相关记录。",
            intent: "CANCEL",
            transcript: parsed.transcript,
            uploadStatus: "CANCELLED",
            timestamp,
          },
        ]);
        if (onExpenseLogged) onExpenseLogged();
      }
      // 0.5. Update Transaction Intent / Enrichment of Recent Record
      else if (data.intent === "UPDATE_TRANSACTION" || data.isUpdate) {
        setMessages((prev) => [
          ...prev,
          {
            id: String(Date.now() + 1),
            sender: "bot",
            type: "text",
            text:
              data.message ||
              `Updated ledger: ${parsed.description} (${formatCurrency(
                parsed.amount,
                parsed.currency || currency
              )})`,
            transcript: parsed.transcript,
            intent: "UPDATE_TRANSACTION",
            transactionId: data.transaction?.id,
            parsedData: {
              amount: parsed.amount,
              category: parsed.category,
              description: parsed.description,
              currency: parsed.currency || currency,
              type: parsed.type || "EXPENSE",
              tags: parsed.tags,
              accountName: parsed.accountName,
            },
            uploadStatus: "UPDATED",
            timestamp,
          },
        ]);
        if (onExpenseLogged) onExpenseLogged();
      }
      // 1. Task / Todo Intent
      else if (data.intent === "TODO" || parsed.intent === "TODO") {
        setMessages((prev) => [
          ...prev,
          {
            id: String(Date.now() + 1),
            sender: "bot",
            type: "text",
            text: data.message || `📋 已添加待办任务：“${parsed.todoTitle || "新任务"}”`,
            intent: "TODO",
            todoId: data.todo?.id,
            transcript: parsed.transcript,
            parsedData: {
              amount: 0,
              category: "Tasks",
              description: parsed.todoTitle || "待办事项",
              currency,
              type: "TODO",
              todoTitle: parsed.todoTitle,
              todoDueDate: parsed.todoDueDate,
              todoPriority: parsed.todoPriority,
            },
            uploadStatus: "TODO_SAVED",
            timestamp,
          },
        ]);
        if (onExpenseLogged) onExpenseLogged();
      }
      // 2. Note / Memo Intent
      else if (data.intent === "NOTE" || parsed.intent === "NOTE") {
        setMessages((prev) => [
          ...prev,
          {
            id: String(Date.now() + 1),
            sender: "bot",
            type: "text",
            text: data.message || `📝 已保存便签：“${parsed.noteTitle || "灵感便签"}”`,
            intent: "NOTE",
            noteId: data.note?.id,
            transcript: parsed.transcript,
            parsedData: {
              amount: 0,
              category: "Notes",
              description: parsed.noteTitle || "便签内容",
              currency,
              type: "NOTE",
              noteTitle: parsed.noteTitle,
              noteContent: parsed.noteContent,
            },
            uploadStatus: "NOTE_SAVED",
            timestamp,
          },
        ]);
        if (onExpenseLogged) onExpenseLogged();
      }
      // 3. Clarification / Missing details
      else if (
        data.intent === "CLARIFICATION" ||
        parsed.intent === "CLARIFICATION" ||
        parsed.isMissingDetails
      ) {
        setMessages((prev) => [
          ...prev,
          {
            id: String(Date.now() + 1),
            sender: "bot",
            type: "text",
            text: data.message || "请问具体消费了多少金额呢？是用什么账户支付的？",
            intent: "CLARIFICATION",
            transcript: parsed.transcript,
            uploadStatus: "CLARIFICATION",
            timestamp,
          },
        ]);
      }
      // 4. Financial Transaction
      else if (parsed.amount > 0) {
        setMessages((prev) => [
          ...prev,
          {
            id: String(Date.now() + 1),
            sender: "bot",
            type: "text",
            text:
              data.message ||
              `Recorded ${formatCurrency(
                parsed.amount,
                parsed.currency || currency
              )} for ${parsed.category}`,
            transcript: parsed.transcript,
            intent: parsed.type,
            transactionId: data.transaction?.id,
            parsedData: {
              amount: parsed.amount,
              category: parsed.category,
              description: parsed.description,
              currency: parsed.currency || currency,
              type: parsed.type,
              accountName: parsed.accountName,
            },
            uploadStatus: "SAVED",
            timestamp,
          },
        ]);

        if (onExpenseLogged) {
          onExpenseLogged();
        }
      } else {
        setMessages((prev) => [
          ...prev,
          {
            id: String(Date.now() + 1),
            sender: "bot",
            type: "text",
            text: data.message || `Could not detect a numerical price in your input.`,
            transcript: parsed.transcript,
            parsedData: parsed,
            uploadStatus: "NO_AMOUNT",
            timestamp,
          },
        ]);
      }
    } else {
      setMessages((prev) => [
        ...prev,
        {
          id: String(Date.now() + 1),
          sender: "bot",
          type: "text",
          text: data.message || `抱歉，刚才识别遇到一点困难。🎤 请问您具体消费了多少钱、在哪消费的？请补充告诉我，我立即为您记下！`,
          uploadStatus: "CLARIFICATION",
          timestamp,
        },
      ]);
    }
  };

  const handleOpenManualSave = (initialDesc = "", initialCat = "Food & Dining") => {
    setManualDesc(initialDesc);
    setManualCategory(initialCat);
    setManualAmount("");
    setManualModalOpen(true);
  };

  const handleSaveManualTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualAmount || isNaN(Number(manualAmount))) return;

    try {
      setManualSaving(true);
      const res = await fetch("/api/finance/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: Number(manualAmount),
          type: "EXPENSE",
          category: manualCategory,
          description: manualDesc.trim() || manualCategory,
          source: "WHATSAPP_TEXT",
          currency,
        }),
      });

      if (res.ok) {
        setManualModalOpen(false);
        const now = new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        });
        setMessages((prev) => [
          ...prev,
          {
            id: String(Date.now()),
            sender: "bot",
            type: "text",
            text: `Manual Entry Saved! Recorded ${formatCurrency(
              Number(manualAmount),
              currency
            )} for ${manualCategory}.`,
            parsedData: {
              amount: Number(manualAmount),
              category: manualCategory,
              description: manualDesc.trim() || manualCategory,
              currency,
              type: "EXPENSE",
            },
            uploadStatus: "SAVED",
            timestamp: now,
          },
        ]);
        if (onExpenseLogged) onExpenseLogged();
      }
    } catch (err) {
      console.error("Manual save failed:", err);
    } finally {
      setManualSaving(false);
    }
  };

  const quickSamples = [
    "🍔 Lunch with colleagues 18.50 with cash",
    "🍜 吃午餐花了 15 块半 (餐饮美食)",
    "⛽ 用现金打油 50 块 (车汽油费)",
    "🍢 深夜吃宵夜 35 块 (宵夜/美食)",
    "🎟️ 买了演唱会门票 180 块 (门票/娱乐)",
    "🎲 买万字 Toto 20 块 (赌博/彩票)",
    "📋 提醒我明天下午3点买菜 (待办事项)",
    "📝 记一下：门禁密码是8842 (灵感便签)",
    "🚫 撤销刚刚那笔支出 (撤销记录)",
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* WhatsApp Simulated Phone Box */}
      <div className="lg:col-span-7 flex flex-col h-[650px] rounded-3xl border border-slate-700 bg-slate-950 overflow-hidden shadow-2xl min-w-0">
        {/* WhatsApp Top Header */}
        <div className="flex items-center justify-between bg-[#075e54] px-4 py-3 text-white shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="relative shrink-0">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-700 text-white font-bold border border-emerald-400/40">
                <Bot className="h-5 w-5" />
              </div>
              <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-green-400 border-2 border-[#075e54]" />
            </div>
            <div className="min-w-0">
              <div className="text-sm font-bold flex items-center gap-1.5 truncate">
                <span>IV4N6Hub Assistant</span>
                <Sparkles className="h-3.5 w-3.5 text-yellow-300 shrink-0" />
              </div>
              <div className="text-[11px] text-emerald-100 flex items-center gap-1 truncate">
                <span>● Online • Gemini AI Connected</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="flex items-center gap-1 rounded-full bg-emerald-800/90 px-2.5 py-1 text-[11px] font-semibold text-emerald-200 border border-emerald-600/40">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
              Live Bridge
            </span>
          </div>
        </div>

        {/* WhatsApp Chat Conversation Area */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden p-3.5 sm:p-4 space-y-3 bg-[#0b141a] bg-opacity-95 min-w-0">
          {messages.map((msg) => {
            const isUser = msg.sender === "user";
            const meta = msg.parsedData ? getCategoryMeta(msg.parsedData.category) : null;

            return (
              <div
                key={msg.id}
                className={`flex flex-col min-w-0 max-w-full ${
                  isUser ? "items-end" : "items-start"
                }`}
              >
                <div
                  className={`max-w-[92%] sm:max-w-[85%] min-w-0 rounded-2xl p-3.5 text-xs shadow-md break-words [overflow-wrap:anywhere] [word-break:break-word] ${
                    isUser
                      ? "bg-[#005c4b] text-emerald-50 rounded-tr-none"
                      : "bg-[#202c33] text-slate-100 rounded-tl-none border border-slate-700/40"
                  }`}
                >
                  {msg.type === "voice" && (
                    <div className="flex items-center gap-2 mb-1.5 pb-1 border-b border-white/10 font-semibold text-emerald-300">
                      <Volume2 className="h-3.5 w-3.5 shrink-0" />
                      <span>Audio Voice Note</span>
                    </div>
                  )}

                  {/* If user message */}
                  {isUser && (
                    <>
                      {msg.type === "file" && (
                        <div className="flex items-center gap-2 mb-2 p-2 rounded-xl bg-emerald-950/60 border border-emerald-400/40">
                          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-300 shrink-0">
                            <FileText className="h-4 w-4" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="font-bold text-white truncate text-xs">
                              {msg.fileInfo?.name || "账单流水文件"}
                            </p>
                            <p className="text-[10px] text-emerald-300/80">
                              {msg.fileInfo?.size || "PDF / 图像"}
                            </p>
                          </div>
                        </div>
                      )}
                      <p className="whitespace-pre-wrap leading-relaxed break-words [overflow-wrap:anywhere] [word-break:break-word]">{msg.text}</p>
                    </>
                  )}

                  {/* If bot response with SUCCESSFUL UPLOAD */}
                  {!isUser && msg.uploadStatus === "SAVED" && msg.parsedData && msg.parsedData.amount > 0 && (
                    <div className="space-y-2.5 min-w-0">
                      {/* Success Pill Banner */}
                      <div className="flex items-center gap-1.5 rounded-lg bg-emerald-500/20 px-2.5 py-1 text-[11px] font-bold text-emerald-300 border border-emerald-500/30 flex-wrap">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                        <span>DETECTED & UPLOADED TO LEDGER</span>
                      </div>

                      {/* Detail Grid */}
                      <div className="rounded-xl bg-black/40 p-3 border border-slate-700/60 space-y-1.5 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[11px] text-slate-400 shrink-0">Amount Paid</span>
                          <span className="text-base font-black text-emerald-400 text-right truncate">
                            {formatCurrency(msg.parsedData.amount, msg.parsedData.currency || currency)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-2 text-[11px]">
                          <span className="text-slate-400 shrink-0">Category</span>
                          <span className="font-semibold text-slate-200 flex items-center gap-1 min-w-0 truncate text-right">
                            <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: meta?.color || "#10b981" }} />
                            <span className="truncate">{msg.parsedData.category}</span>
                          </span>
                        </div>
                        <div className="flex items-start justify-between gap-2 text-[11px]">
                          <span className="text-slate-400 shrink-0 mt-0.5">Description</span>
                          <span className="font-semibold text-white break-words [overflow-wrap:anywhere] text-right max-w-[65%] leading-tight">
                            {msg.parsedData.description}
                          </span>
                        </div>
                        {msg.parsedData.tags && (
                          <div className="flex items-center justify-between gap-2 text-[11px] pt-1 border-t border-slate-800">
                            <span className="text-slate-400 shrink-0">Tags</span>
                            <span className="font-semibold text-cyan-300 truncate text-right">
                              {msg.parsedData.tags}
                            </span>
                          </div>
                        )}
                        <div className="flex items-center justify-between gap-2 text-[11px] pt-1 border-t border-slate-800">
                          <span className="text-slate-400 shrink-0">Payment Account</span>
                          <span className="font-semibold text-slate-200 flex items-center gap-1 min-w-0 truncate text-right">
                            <span>💳</span>
                            <span className={msg.parsedData.accountName ? "text-cyan-300 truncate" : "text-amber-400/90 italic"}>
                              {msg.parsedData.accountName || "Unassigned"}
                            </span>
                          </span>
                        </div>
                      </div>

                      {msg.transcript && (
                        <div className="rounded-lg bg-slate-900/80 p-2 text-[10px] text-slate-400 italic border border-slate-800 break-words [overflow-wrap:anywhere] [word-break:break-word]">
                          <span className="text-emerald-400 not-italic font-semibold">Transcript: </span>
                          &ldquo;{msg.transcript}&rdquo;
                        </div>
                      )}

                      <div className="pt-1 flex items-center justify-between gap-2 flex-wrap border-t border-slate-800/60 mt-1">
                        <Link
                          href="/transactions"
                          className="text-[10px] font-bold text-cyan-400 hover:underline flex items-center gap-1 shrink-0"
                        >
                          <span>View in Ledger</span>
                          <ArrowUpRight className="h-3 w-3" />
                        </Link>
                        {msg.transactionId && (
                          <button
                            onClick={() => handleCancelItem(msg.id, "TRANSACTION", msg.transactionId)}
                            disabled={cancellingId === msg.id}
                            className="flex items-center gap-1 rounded-md bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 px-2 py-0.5 text-[10px] font-semibold text-rose-300 transition-colors cursor-pointer"
                            title="Cancel this transaction and refund account"
                          >
                            <Trash2 className="h-2.5 w-2.5 text-rose-400" />
                            <span>{cancellingId === msg.id ? "Refunding..." : "Cancel & Refund"}</span>
                          </button>
                        )}
                        <span className="text-[10px] text-slate-500 ml-auto">{msg.timestamp}</span>
                      </div>
                    </div>
                  )}

                  {/* If bot response with UPDATED RECORD */}
                  {!isUser && msg.uploadStatus === "UPDATED" && msg.parsedData && msg.parsedData.amount > 0 && (
                    <div className="space-y-2.5 min-w-0">
                      {/* Updated Pill Banner */}
                      <div className="flex items-center gap-1.5 rounded-lg bg-cyan-500/20 px-2.5 py-1 text-[11px] font-bold text-cyan-300 border border-cyan-500/30 flex-wrap">
                        <Sparkles className="h-3.5 w-3.5 text-cyan-400 shrink-0" />
                        <span>DETAILS UPDATED IN LEDGER (已补充更新记录)</span>
                      </div>

                      {/* Detail Grid */}
                      <div className="rounded-xl bg-black/40 p-3 border border-slate-700/60 space-y-1.5 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[11px] text-slate-400 shrink-0">Amount</span>
                          <span className="text-base font-black text-cyan-400 text-right truncate">
                            {formatCurrency(msg.parsedData.amount, msg.parsedData.currency || currency)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-2 text-[11px]">
                          <span className="text-slate-400 shrink-0">Category</span>
                          <span className="font-semibold text-slate-200 flex items-center gap-1 min-w-0 truncate text-right">
                            <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: meta?.color || "#10b981" }} />
                            <span className="truncate">{msg.parsedData.category}</span>
                          </span>
                        </div>
                        <div className="flex items-start justify-between gap-2 text-[11px]">
                          <span className="text-slate-400 shrink-0 mt-0.5">Description</span>
                          <span className="font-semibold text-white break-words [overflow-wrap:anywhere] text-right max-w-[65%] leading-tight">
                            {msg.parsedData.description}
                          </span>
                        </div>
                        {msg.parsedData.tags && (
                          <div className="flex items-center justify-between gap-2 text-[11px] pt-1 border-t border-slate-800">
                            <span className="text-slate-400 shrink-0">Tags</span>
                            <span className="font-bold text-cyan-300 truncate text-right">
                              {msg.parsedData.tags}
                            </span>
                          </div>
                        )}
                        <div className="flex items-center justify-between gap-2 text-[11px] pt-1 border-t border-slate-800">
                          <span className="text-slate-400 shrink-0">Payment Account</span>
                          <span className="font-semibold text-slate-200 flex items-center gap-1 min-w-0 truncate text-right">
                            <span>💳</span>
                            <span className={msg.parsedData.accountName ? "text-cyan-300 truncate" : "text-amber-400/90 italic"}>
                              {msg.parsedData.accountName || "Unassigned"}
                            </span>
                          </span>
                        </div>
                      </div>

                      {msg.transcript && (
                        <div className="rounded-lg bg-slate-900/80 p-2 text-[10px] text-slate-400 italic border border-slate-800 break-words [overflow-wrap:anywhere] [word-break:break-word]">
                          <span className="text-cyan-400 not-italic font-semibold">Transcript: </span>
                          &ldquo;{msg.transcript}&rdquo;
                        </div>
                      )}

                      <div className="pt-1 flex items-center justify-between gap-2 flex-wrap border-t border-slate-800/60 mt-1">
                        <Link
                          href="/transactions"
                          className="text-[10px] font-bold text-cyan-400 hover:underline flex items-center gap-1 shrink-0"
                        >
                          <span>View in Ledger</span>
                          <ArrowUpRight className="h-3 w-3" />
                        </Link>
                        {msg.transactionId && (
                          <button
                            onClick={() => handleCancelItem(msg.id, "TRANSACTION", msg.transactionId)}
                            disabled={cancellingId === msg.id}
                            className="flex items-center gap-1 rounded-md bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 px-2 py-0.5 text-[10px] font-semibold text-rose-300 transition-colors cursor-pointer"
                            title="Cancel this transaction and refund account"
                          >
                            <Trash2 className="h-2.5 w-2.5 text-rose-400" />
                            <span>{cancellingId === msg.id ? "Refunding..." : "Cancel & Refund"}</span>
                          </button>
                        )}
                        <span className="text-[10px] text-slate-500 ml-auto">{msg.timestamp}</span>
                      </div>
                    </div>
                  )}

                  {/* If bot response with TODO SAVED */}
                  {!isUser && msg.uploadStatus === "TODO_SAVED" && (
                    <div className="space-y-2.5 min-w-0">
                      <div className="flex items-center gap-1.5 rounded-lg bg-indigo-500/20 px-2.5 py-1 text-[11px] font-bold text-indigo-300 border border-indigo-500/30 flex-wrap">
                        <span>📋</span>
                        <span>TASK SAVED TO TO-DOS</span>
                      </div>

                      <div className="rounded-xl bg-black/40 p-3 border border-slate-700/60 space-y-2 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <span className="text-[11px] text-slate-400 shrink-0">Action Item</span>
                          <span className="font-bold text-white text-right break-words [overflow-wrap:anywhere] max-w-[70%]">
                            {msg.parsedData?.todoTitle || msg.text}
                          </span>
                        </div>
                        {msg.parsedData?.todoDueDate && (
                          <div className="flex items-center justify-between gap-2 text-[11px]">
                            <span className="text-slate-400 shrink-0">Due Date</span>
                            <span className="font-semibold text-cyan-300 text-right">
                              📅 {msg.parsedData.todoDueDate}
                            </span>
                          </div>
                        )}
                        {msg.parsedData?.todoPriority && (
                          <div className="flex items-center justify-between gap-2 text-[11px]">
                            <span className="text-slate-400 shrink-0">Priority</span>
                            <span
                              className={`font-bold px-2 py-0.5 rounded text-[10px] ${
                                msg.parsedData.todoPriority === "HIGH"
                                  ? "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                                  : msg.parsedData.todoPriority === "LOW"
                                  ? "bg-slate-700 text-slate-300"
                                  : "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                              }`}
                            >
                              {msg.parsedData.todoPriority}
                            </span>
                          </div>
                        )}
                      </div>

                      {msg.transcript && (
                        <div className="rounded-lg bg-slate-900/80 p-2 text-[10px] text-slate-400 italic border border-slate-800 break-words [overflow-wrap:anywhere]">
                          <span className="text-indigo-400 not-italic font-semibold">Transcript: </span>
                          &ldquo;{msg.transcript}&rdquo;
                        </div>
                      )}

                      <div className="pt-1 flex items-center justify-between gap-2 flex-wrap border-t border-slate-800/60 mt-1">
                        <Link
                          href="/notes"
                          className="text-[10px] font-bold text-indigo-400 hover:underline flex items-center gap-1 shrink-0"
                        >
                          <span>View in Tasks / Notes</span>
                          <ArrowUpRight className="h-3 w-3" />
                        </Link>
                        {msg.todoId && (
                          <button
                            onClick={() => handleCancelItem(msg.id, "TODO", msg.todoId)}
                            disabled={cancellingId === msg.id}
                            className="flex items-center gap-1 rounded-md bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 px-2 py-0.5 text-[10px] font-semibold text-rose-300 transition-colors cursor-pointer"
                            title="Delete this task"
                          >
                            <Trash2 className="h-2.5 w-2.5 text-rose-400" />
                            <span>{cancellingId === msg.id ? "Deleting..." : "Cancel Task"}</span>
                          </button>
                        )}
                        <span className="text-[10px] text-slate-500 ml-auto">{msg.timestamp}</span>
                      </div>
                    </div>
                  )}

                  {/* If bot response with NOTE SAVED */}
                  {!isUser && msg.uploadStatus === "NOTE_SAVED" && (
                    <div className="space-y-2.5 min-w-0">
                      <div className="flex items-center gap-1.5 rounded-lg bg-sky-500/20 px-2.5 py-1 text-[11px] font-bold text-sky-300 border border-sky-500/30 flex-wrap">
                        <span>📝</span>
                        <span>NOTE SAVED TO MEMOS</span>
                      </div>

                      <div className="rounded-xl bg-black/40 p-3 border border-slate-700/60 space-y-2 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <span className="text-[11px] text-slate-400 shrink-0">Title</span>
                          <span className="font-bold text-white text-right break-words [overflow-wrap:anywhere] max-w-[70%]">
                            {msg.parsedData?.noteTitle || "灵感便签"}
                          </span>
                        </div>
                        {msg.parsedData?.noteContent && (
                          <div className="rounded-lg bg-slate-900/60 p-2 text-[11px] text-slate-200 border border-slate-800 break-words [overflow-wrap:anywhere] whitespace-pre-wrap">
                            {msg.parsedData.noteContent}
                          </div>
                        )}
                      </div>

                      {msg.transcript && (
                        <div className="rounded-lg bg-slate-900/80 p-2 text-[10px] text-slate-400 italic border border-slate-800 break-words [overflow-wrap:anywhere]">
                          <span className="text-sky-400 not-italic font-semibold">Transcript: </span>
                          &ldquo;{msg.transcript}&rdquo;
                        </div>
                      )}

                      <div className="pt-1 flex items-center justify-between gap-2 flex-wrap border-t border-slate-800/60 mt-1">
                        <Link
                          href="/notes"
                          className="text-[10px] font-bold text-sky-400 hover:underline flex items-center gap-1 shrink-0"
                        >
                          <span>View in Notes</span>
                          <ArrowUpRight className="h-3 w-3" />
                        </Link>
                        {msg.noteId && (
                          <button
                            onClick={() => handleCancelItem(msg.id, "NOTE", msg.noteId)}
                            disabled={cancellingId === msg.id}
                            className="flex items-center gap-1 rounded-md bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 px-2 py-0.5 text-[10px] font-semibold text-rose-300 transition-colors cursor-pointer"
                            title="Delete this note"
                          >
                            <Trash2 className="h-2.5 w-2.5 text-rose-400" />
                            <span>{cancellingId === msg.id ? "Deleting..." : "Delete Note"}</span>
                          </button>
                        )}
                        <span className="text-[10px] text-slate-500 ml-auto">{msg.timestamp}</span>
                      </div>
                    </div>
                  )}

                  {/* If bot response with CLARIFICATION */}
                  {!isUser && msg.uploadStatus === "CLARIFICATION" && (
                    <div className="space-y-2 min-w-0">
                      <div className="flex items-center gap-1.5 rounded-lg bg-amber-500/20 px-2 py-0.5 text-[10px] font-bold text-amber-300 border border-amber-500/30 w-fit">
                        <Sparkles className="h-3 w-3 text-amber-400" />
                        <span>QUESTION / CLARIFICATION</span>
                      </div>

                      <p className="whitespace-pre-wrap leading-relaxed break-words [overflow-wrap:anywhere] [word-break:break-word] text-slate-100 text-xs">
                        {msg.text}
                      </p>

                      {msg.transcript && (
                        <div className="rounded-lg bg-slate-900/80 p-2 text-[10px] text-slate-400 italic border border-slate-800 break-words [overflow-wrap:anywhere]">
                          <span className="text-amber-400 not-italic font-semibold">Heard: </span>
                          &ldquo;{msg.transcript}&rdquo;
                        </div>
                      )}

                      <div className="pt-1 flex items-center justify-between gap-2 flex-wrap">
                        <button
                          onClick={() => handleOpenManualSave(msg.transcript || "", "Food & Dining")}
                          className="flex items-center gap-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 px-2.5 py-1 text-[10px] font-bold text-amber-200 transition-all shrink-0 cursor-pointer"
                        >
                          <Plus className="h-3 w-3" />
                          <span>补充具体金额 / 账户</span>
                        </button>
                        <span className="text-[10px] text-slate-500 ml-auto">{msg.timestamp}</span>
                      </div>
                    </div>
                  )}

                  {/* If bot response with NO AMOUNT DETECTED */}
                  {!isUser && msg.uploadStatus === "NO_AMOUNT" && (
                    <div className="space-y-2 min-w-0">
                      <div className="flex items-center gap-1.5 rounded-lg bg-amber-500/20 px-2.5 py-1 text-[11px] font-bold text-amber-300 border border-amber-500/30 flex-wrap">
                        <AlertCircle className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                        <span>NO AMOUNT DETECTED</span>
                      </div>

                      <p className="text-xs text-slate-300 leading-relaxed break-words [overflow-wrap:anywhere]">
                        {msg.text || "I heard what you said, but could not detect a numerical price or amount."}
                      </p>

                      {msg.transcript && (
                        <div className="rounded-lg bg-black/40 p-2 text-[11px] text-slate-300 border border-slate-700/60 break-words [overflow-wrap:anywhere] [word-break:break-word]">
                          <span className="text-amber-400 font-semibold">Heard: </span>
                          &ldquo;{msg.transcript}&rdquo;
                        </div>
                      )}

                      <div className="pt-1 flex items-center justify-between gap-2 flex-wrap">
                        <button
                          onClick={() => handleOpenManualSave(msg.transcript || msg.text, "Food & Dining")}
                          className="flex items-center gap-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 px-2.5 py-1 text-[10px] font-bold text-amber-200 transition-all shrink-0 cursor-pointer"
                        >
                          <Plus className="h-3 w-3" />
                          <span>Enter Amount Manually</span>
                        </button>
                        <span className="text-[10px] text-slate-500 ml-auto">{msg.timestamp}</span>
                      </div>
                    </div>
                  )}

                  {/* If bot response or item CANCELLED */}
                  {!isUser && msg.uploadStatus === "CANCELLED" && (
                    <div className="space-y-2 min-w-0">
                      <div className="flex items-center gap-1.5 rounded-lg bg-rose-500/20 px-2.5 py-1 text-[10px] font-bold text-rose-300 border border-rose-500/30 w-fit">
                        <X className="h-3 w-3 text-rose-400 shrink-0" />
                        <span>RECORD CANCELLED / DELETED</span>
                      </div>

                      <p className="text-xs text-rose-200/90 leading-relaxed break-words [overflow-wrap:anywhere] [word-break:break-word] line-through decoration-rose-500/60">
                        {msg.text}
                      </p>

                      {msg.transcript && (
                        <div className="rounded-lg bg-slate-900/80 p-2 text-[10px] text-slate-400 italic border border-slate-800 break-words [overflow-wrap:anywhere]">
                          <span className="text-rose-400 not-italic font-semibold">Voice command: </span>
                          &ldquo;{msg.transcript}&rdquo;
                        </div>
                      )}

                      <div className="mt-1 flex items-center justify-end text-[10px] text-slate-400">
                        <span>{msg.timestamp}</span>
                      </div>
                    </div>
                  )}

                  {/* If bot response with RECONCILIATION_REPORT */}
                  {!isUser && msg.uploadStatus === "RECONCILIATION_REPORT" && msg.reconciliationData && (
                    <div className="space-y-3 min-w-0 w-full sm:min-w-[340px]">
                      {/* Top Header Badge */}
                      <div className="flex items-center justify-between gap-2 border-b border-slate-700/60 pb-2.5">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-400 shrink-0">
                            <FileText className="h-4 w-4" />
                          </span>
                          <div className="min-w-0">
                            <h4 className="font-bold text-white text-xs truncate">
                              {msg.reconciliationData.statement.bankName || "银行流水对账报告"}
                            </h4>
                            {msg.reconciliationData.statement.statementPeriod?.start && (
                              <p className="text-[10px] text-slate-400">
                                周期: {msg.reconciliationData.statement.statementPeriod.start} ~ {msg.reconciliationData.statement.statementPeriod.end}
                              </p>
                            )}
                          </div>
                        </div>
                        <span className="rounded-full bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-bold text-emerald-300 shrink-0">
                          AI 对账报告
                        </span>
                      </div>

                      {/* 4 Summary Stats Bar */}
                      <div className="grid grid-cols-4 gap-1.5 text-center">
                        <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-1.5">
                          <div className="text-emerald-400 font-black text-sm">
                            {msg.reconciliationData.summary.matchedCount}
                          </div>
                          <div className="text-[9px] text-emerald-300/80 font-medium">🟢 已匹配</div>
                        </div>
                        <div className="rounded-xl bg-amber-500/10 border border-amber-500/20 p-1.5">
                          <div className="text-amber-400 font-black text-sm">
                            {msg.reconciliationData.summary.discrepancyCount}
                          </div>
                          <div className="text-[9px] text-amber-300/80 font-medium">🟡 金额差异</div>
                        </div>
                        <div className="rounded-xl bg-blue-500/10 border border-blue-500/20 p-1.5">
                          <div className="text-blue-400 font-black text-sm">
                            {msg.reconciliationData.missing.filter((m: any) => !m.imported).length}
                          </div>
                          <div className="text-[9px] text-blue-300/80 font-medium">🔵 漏记账</div>
                        </div>
                        <div className="rounded-xl bg-purple-500/10 border border-purple-500/20 p-1.5">
                          <div className="text-purple-400 font-black text-sm">
                            {msg.reconciliationData.ambiguous.filter((a: any) => !a.resolved).length}
                          </div>
                          <div className="text-[9px] text-purple-300/80 font-medium">❓ 需确认</div>
                        </div>
                      </div>

                      {/* 1. DISCREPANCIES (金额不符) */}
                      {msg.reconciliationData.discrepancies.length > 0 && (
                        <div className="space-y-2 rounded-xl bg-amber-950/20 border border-amber-500/30 p-2.5">
                          <div className="flex items-center gap-1.5 text-amber-300 font-bold text-[11px]">
                            <AlertCircle className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                            <span>🟡 发现金额差异 ({msg.reconciliationData.discrepancies.length} 笔)</span>
                          </div>
                          <div className="space-y-2">
                            {msg.reconciliationData.discrepancies.map((disc, idx) => {
                              const isResolved = disc.resolved;
                              return (
                                <div
                                  key={idx}
                                  className="rounded-lg bg-black/40 p-2 border border-amber-500/20 text-xs space-y-1.5"
                                >
                                  <div className="flex items-start justify-between gap-1">
                                    <span className="font-semibold text-white truncate max-w-[65%]">
                                      {disc.statementTx.description}
                                    </span>
                                    <span className="text-[10px] text-slate-400">{disc.statementTx.date}</span>
                                  </div>
                                  <div className="flex items-center justify-between text-[11px]">
                                    <span className="text-slate-400">
                                      账本原记: <span className="line-through text-slate-400">RM {disc.dbTx.amount.toFixed(2)}</span>
                                    </span>
                                    <span className="font-bold text-amber-300">
                                      账单实际: RM {disc.statementTx.amount.toFixed(2)}
                                    </span>
                                  </div>
                                  <div className="pt-1 flex justify-end">
                                    {isResolved ? (
                                      <span className="text-[10px] font-bold text-emerald-400 flex items-center gap-1 bg-emerald-500/20 px-2 py-0.5 rounded">
                                        <Check className="h-3 w-3" /> 已同步为账单金额
                                      </span>
                                    ) : (
                                      <button
                                        onClick={() => handleApplyDiscrepancy(msg.id, idx, disc)}
                                        disabled={isSyncingDiscrepancy === `${msg.id}-${idx}`}
                                        className="flex items-center gap-1 rounded-md bg-amber-500 hover:bg-amber-400 px-2.5 py-1 text-[10px] font-bold text-slate-950 transition-all cursor-pointer disabled:opacity-50 shadow"
                                      >
                                        <RefreshCw
                                          className={`h-3 w-3 ${
                                            isSyncingDiscrepancy === `${msg.id}-${idx}` ? "animate-spin" : ""
                                          }`}
                                        />
                                        <span>
                                          {isSyncingDiscrepancy === `${msg.id}-${idx}`
                                            ? "同步中..."
                                            : `一键校正为 RM ${disc.statementTx.amount.toFixed(2)}`}
                                        </span>
                                      </button>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* 2. MISSING TRANSACTIONS (漏记账) */}
                      {msg.reconciliationData.missing.length > 0 && (
                        <div className="space-y-2 rounded-xl bg-blue-950/20 border border-blue-500/30 p-2.5">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-1.5 text-blue-300 font-bold text-[11px]">
                              <Plus className="h-3.5 w-3.5 text-blue-400 shrink-0" />
                              <span>
                                🔵 发现未记账流水 (
                                {msg.reconciliationData.missing.filter((m: any) => !m.imported).length} 笔待补记)
                              </span>
                            </div>
                            {msg.reconciliationData.missing.some((m: any) => !m.imported) && (
                              <button
                                onClick={() =>
                                  handleBatchImportMissing(
                                    msg.id,
                                    msg.reconciliationData!.missing.filter((m: any) => !m.imported)
                                  )
                                }
                                disabled={isBatchImporting === msg.id}
                                className="flex items-center gap-1 rounded-lg bg-blue-600 hover:bg-blue-500 px-2 py-1 text-[10px] font-bold text-white transition-all cursor-pointer shadow disabled:opacity-50 shrink-0"
                              >
                                <FileUp className="h-3 w-3" />
                                <span>{isBatchImporting === msg.id ? "导入中..." : "一键批量补记全部"}</span>
                              </button>
                            )}
                          </div>

                          <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                            {msg.reconciliationData.missing.map((item: any, idx: number) => {
                              const isImported = item.imported;
                              return (
                                <div
                                  key={idx}
                                  className="flex items-center justify-between gap-2 rounded-lg bg-black/40 p-2 border border-blue-500/20 text-xs"
                                >
                                  <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-1.5">
                                      <span className="font-semibold text-white truncate max-w-[140px]">
                                        {item.description}
                                      </span>
                                      <span className="rounded bg-slate-800 px-1.5 py-0.2 text-[9px] text-slate-300 shrink-0">
                                        {item.category}
                                      </span>
                                    </div>
                                    <div className="text-[10px] text-slate-400 flex items-center gap-2 mt-0.5">
                                      <span>{item.date}</span>
                                      <span
                                        className={
                                          item.type === "INCOME"
                                            ? "text-emerald-400 font-bold"
                                            : "text-rose-300 font-bold"
                                        }
                                      >
                                        {item.type === "INCOME" ? "+" : "-"}RM {item.amount.toFixed(2)}
                                      </span>
                                    </div>
                                  </div>

                                  <div className="shrink-0">
                                    {isImported ? (
                                      <span className="text-[10px] font-bold text-emerald-400 flex items-center gap-0.5">
                                        <Check className="h-3 w-3" /> 已入账
                                      </span>
                                    ) : (
                                      <button
                                        onClick={() => handleImportSingleMissing(msg.id, item, idx)}
                                        className="rounded bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/40 px-2 py-0.5 text-[10px] font-semibold text-blue-200 transition-colors cursor-pointer"
                                      >
                                        + 补记
                                      </button>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* 3. AMBIGUOUS TRANSACTIONS (需要向用户确认) */}
                      {msg.reconciliationData.ambiguous.length > 0 && (
                        <div className="space-y-2 rounded-xl bg-purple-950/20 border border-purple-500/30 p-2.5">
                          <div className="flex items-center gap-1.5 text-purple-300 font-bold text-[11px]">
                            <HelpCircle className="h-3.5 w-3.5 text-purple-400 shrink-0" />
                            <span>❓ 需向您确认的转账交易 ({msg.reconciliationData.ambiguous.length} 笔)</span>
                          </div>

                          <div className="space-y-1.5">
                            {msg.reconciliationData.ambiguous.map((amb, idx) => {
                              const isResolved = amb.resolved;
                              return (
                                <div
                                  key={idx}
                                  className="rounded-lg bg-black/40 p-2 border border-purple-500/20 text-xs space-y-1"
                                >
                                  <div className="flex items-start justify-between gap-1">
                                    <span className="font-semibold text-white truncate max-w-[70%]">
                                      {amb.rawNarration || amb.description}
                                    </span>
                                    <span className="font-bold text-purple-300 shrink-0">
                                      RM {amb.amount.toFixed(2)}
                                    </span>
                                  </div>
                                  <p className="text-[10px] text-purple-200/90 leading-tight">
                                    💬 {amb.ambiguityReason || "这是个人转账/DuitNow，请问是什么用途？"}
                                  </p>
                                  <div className="pt-1 flex justify-end">
                                    {isResolved ? (
                                      <span className="text-[10px] font-bold text-emerald-400 flex items-center gap-1 bg-emerald-500/20 px-2 py-0.5 rounded">
                                        <Check className="h-3 w-3" /> 已补充说明并入账
                                      </span>
                                    ) : (
                                      <button
                                        onClick={() => {
                                          setPendingClarification({ msgId: msg.id, itemIndex: idx, item: amb });
                                          setInputMessage(`这是 `);
                                        }}
                                        className="flex items-center gap-1 rounded bg-purple-600 hover:bg-purple-500 px-2.5 py-1 text-[10px] font-bold text-white transition-all cursor-pointer shadow"
                                      >
                                        <span>💬 补充说明此笔交易</span>
                                      </button>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* 4. MATCHED (核对一致) */}
                      {msg.reconciliationData.matched.length > 0 && (
                        <div className="rounded-xl bg-black/40 border border-slate-700/60 overflow-hidden">
                          <button
                            onClick={() =>
                              setExpandedMatched((prev) => ({
                                ...prev,
                                [msg.id]: !prev[msg.id],
                              }))
                            }
                            className="w-full flex items-center justify-between p-2.5 text-xs text-slate-300 hover:bg-slate-800/50 transition-colors text-left"
                          >
                            <span className="flex items-center gap-1.5 font-semibold text-emerald-400">
                              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                              <span>🟢 已核对一致 ({msg.reconciliationData.matched.length} 笔)</span>
                            </span>
                            {expandedMatched[msg.id] ? (
                              <ChevronUp className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                            ) : (
                              <ChevronDown className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                            )}
                          </button>

                          {expandedMatched[msg.id] && (
                            <div className="p-2 space-y-1 max-h-40 overflow-y-auto border-t border-slate-800 text-[11px]">
                              {msg.reconciliationData.matched.map((m, idx) => (
                                <div
                                  key={idx}
                                  className="flex items-center justify-between gap-1 text-slate-300 py-0.5 border-b border-slate-800/40 last:border-0"
                                >
                                  <div className="truncate max-w-[65%]">
                                    <span className="text-slate-400 mr-1.5">{m.statementTx.date}</span>
                                    <span>{m.statementTx.description}</span>
                                  </div>
                                  <span className="font-bold text-emerald-400 shrink-0">
                                    RM {m.statementTx.amount.toFixed(2)}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      {/* View in Ledger Link */}
                      <div className="pt-1 flex items-center justify-between gap-2 flex-wrap border-t border-slate-800/60 mt-1">
                        <Link
                          href="/transactions"
                          className="text-[10px] font-bold text-emerald-400 hover:underline flex items-center gap-1 shrink-0"
                        >
                          <span>在账本中查看所有交易 (View in Ledger)</span>
                          <ArrowUpRight className="h-3 w-3" />
                        </Link>
                        <span className="text-[10px] text-slate-500 ml-auto">{msg.timestamp}</span>
                      </div>
                    </div>
                  )}

                  {/* Standard initial bot messages */}
                  {!isUser &&
                    msg.uploadStatus !== "SAVED" &&
                    msg.uploadStatus !== "NO_AMOUNT" &&
                    msg.uploadStatus !== "TODO_SAVED" &&
                    msg.uploadStatus !== "NOTE_SAVED" &&
                    msg.uploadStatus !== "CLARIFICATION" &&
                    msg.uploadStatus !== "CANCELLED" &&
                    msg.uploadStatus !== "UPDATED" &&
                    msg.uploadStatus !== "RECONCILIATION_REPORT" && (
                      <>
                        <p className="whitespace-pre-wrap leading-relaxed break-words [overflow-wrap:anywhere] [word-break:break-word]">{msg.text}</p>
                        <div className="mt-1 flex items-center justify-end text-[10px] text-slate-400">
                          <span>{msg.timestamp}</span>
                        </div>
                      </>
                    )}
                </div>
              </div>
            );
          })}

          {isProcessing && (
            <div className="flex items-center gap-2.5 text-xs text-slate-300 bg-[#202c33] p-3 rounded-2xl rounded-tl-none w-fit border border-slate-700/40 animate-pulse">
              <Loader2 className="h-4 w-4 text-emerald-400 animate-spin shrink-0" />
              <span>{processingStep}</span>
            </div>
          )}

          <div ref={chatBottomRef} />
        </div>

        {/* Voice Recording Active Overlay */}
        {isRecording && (
          <div className="bg-[#1f2c34] border-t border-emerald-500/30 px-3.5 py-2.5 flex items-center justify-between gap-3 animate-fadeIn shrink-0">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="relative flex h-3 w-3 items-center justify-center shrink-0">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-500" />
              </div>
              <div className="flex flex-col min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-red-400">Recording...</span>
                  <span className="font-mono text-[11px] font-bold bg-red-500/20 text-red-300 px-1.5 py-0.5 rounded">
                    {formatDuration(recordingDuration)}
                  </span>
                </div>
                <span className="text-[10px] text-slate-400 truncate">
                  Speak an expense (e.g. &quot;Lunch 15.50&quot;)
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={cancelRecording}
                type="button"
                title="Cancel and discard voice note without sending"
                className="flex items-center gap-1.5 rounded-xl bg-slate-800 hover:bg-rose-950/60 border border-slate-700 hover:border-rose-500/40 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:text-rose-300 transition-all active:scale-95 cursor-pointer shadow"
              >
                <Trash2 className="h-3.5 w-3.5 text-rose-400" />
                <span>Cancel</span>
              </button>

              <button
                onClick={stopAndSendRecording}
                type="button"
                title="Stop and send voice note to AI"
                className="flex items-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 px-3.5 py-1.5 text-xs font-bold text-white transition-all shadow-md shadow-emerald-950 active:scale-95 cursor-pointer"
              >
                <Send className="h-3.5 w-3.5" />
                <span>Send</span>
              </button>
            </div>
          </div>
        )}

        {/* Hidden File Input for Statement Upload */}
        <input
          type="file"
          ref={fileInputRef}
          accept="application/pdf,image/png,image/jpeg,image/webp"
          onChange={handleFileSelect}
          className="hidden"
        />

        {/* Ambiguous Transaction Clarification Active Banner */}
        {pendingClarification && (
          <div className="bg-purple-950/80 border-t border-purple-500/40 px-3.5 py-2 flex items-center justify-between gap-2 text-xs text-purple-200 animate-fadeIn shrink-0">
            <div className="flex items-center gap-2 truncate">
              <HelpCircle className="h-4 w-4 text-purple-400 shrink-0" />
              <span className="truncate">
                正在向您确认：<strong>{pendingClarification.item.description || pendingClarification.item.rawNarration}</strong> (RM {pendingClarification.item.amount.toFixed(2)})
              </span>
            </div>
            <button
              onClick={() => setPendingClarification(null)}
              className="text-purple-300 hover:text-white text-[11px] font-bold shrink-0 ml-2 px-2 py-0.5 rounded bg-purple-900/60 hover:bg-purple-800 transition-colors"
            >
              取消
            </button>
          </div>
        )}

        {/* Input Bar */}
        <div className="flex items-center gap-2 bg-[#202c33] p-3 border-t border-slate-800 shrink-0">
          {/* File Upload Button */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isRecording || isProcessing}
            title="上传银行流水账单 (PDF / 截图)"
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#2a3942] text-slate-300 hover:text-emerald-400 hover:bg-slate-700 active:scale-95 transition-all shrink-0 cursor-pointer disabled:opacity-40"
          >
            <Paperclip className="h-4 w-4" />
          </button>

          <input
            type="text"
            placeholder={
              pendingClarification
                ? `💬 请输入说明（例如：还朋友钱 / 聚餐分账 / 晚餐）...`
                : isRecording
                ? "Recording voice... Click Cancel or Send"
                : "输入记账（如：打油50、宵夜35），或点 📎 上传账单..."
            }
            disabled={isRecording || isProcessing}
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSendText()}
            className="flex-1 rounded-xl bg-[#2a3942] px-4 py-2.5 text-xs text-white placeholder-slate-400 outline-none focus:ring-1 focus:ring-emerald-500 min-w-0"
          />

          {isRecording ? (
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                onClick={cancelRecording}
                title="Cancel recording (discard)"
                className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-800 border border-slate-700 text-rose-400 hover:bg-slate-700 hover:text-rose-300 transition-colors shrink-0 active:scale-95 cursor-pointer"
              >
                <Trash2 className="h-4 w-4" />
              </button>
              <button
                onClick={stopAndSendRecording}
                title="Send voice note"
                className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600 text-white hover:bg-emerald-500 transition-all shrink-0 active:scale-95 shadow-md shadow-emerald-900/30 cursor-pointer"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
          ) : inputMessage.trim() ? (
            <button
              onClick={() => handleSendText()}
              disabled={isProcessing}
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600 text-white hover:bg-emerald-500 transition-colors shrink-0 active:scale-95"
            >
              <Send className="h-4 w-4" />
            </button>
          ) : (
            <button
              onClick={startRecording}
              disabled={isProcessing}
              title="Speak Voice Note"
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600 text-white hover:bg-emerald-500 active:scale-95 transition-all shrink-0 cursor-pointer"
            >
              <Mic className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Right Column: Quick Test Samples & Status */}
      <div className="lg:col-span-5 flex flex-col gap-4">
        {/* Quick Test Prompt Card */}
        <div className="glass-card rounded-2xl p-5 border border-slate-800/80 space-y-3">
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-yellow-400" />
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-200">
              Instant 1-Click Test Prompts
            </h3>
          </div>
          <p className="text-xs text-slate-400">
            Click any prompt below to test immediate AI detection and database upload:
          </p>

          <div className="flex flex-col gap-2">
            {quickSamples.map((sample, idx) => (
              <button
                key={idx}
                onClick={() => handleSendText(sample)}
                disabled={isProcessing}
                className="text-left rounded-xl border border-slate-800 bg-slate-900/80 p-2.5 text-xs text-slate-300 hover:border-emerald-500/50 hover:bg-slate-800 hover:text-white transition-all active:scale-[0.99] flex items-center justify-between group"
              >
                <span className="truncate">{sample}</span>
                <span className="text-[10px] text-emerald-400 opacity-0 group-hover:opacity-100 font-semibold shrink-0 ml-2">
                  Send →
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* How Voice & Text Works Info Card */}
        <div className="glass-card rounded-2xl p-5 border border-slate-800/80 space-y-3">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-200 flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-purple-400" />
            <span>Detection & Auto-Upload Status</span>
          </h3>
          <ul className="space-y-2.5 text-xs text-slate-400">
            <li className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
              <span>
                <strong>Auto-Upload:</strong> Valid amounts are immediately stored in your database and appear in your Financial Overview charts.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <Bot className="h-4 w-4 text-blue-400 shrink-0 mt-0.5" />
              <span>
                <strong>Multilingual AI:</strong> Supports English, Malay, Chinese, and regional slang (e.g. <em>&quot;makan nasi lemak RM12&quot;</em>).
              </span>
            </li>
          </ul>
        </div>
      </div>

      {/* Manual Save Modal (Fallback if amount missed) */}
      {manualModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-sm rounded-2xl border border-slate-700 bg-slate-900 p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white">Manual Amount Entry</h3>
              <button
                onClick={() => setManualModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveManualTransaction} className="space-y-3 text-xs">
              <div>
                <label className="text-slate-400 block mb-1">Description</label>
                <input
                  type="text"
                  value={manualDesc}
                  onChange={(e) => setManualDesc(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-800 p-2 text-white"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Amount ({currency})</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  placeholder="0.00"
                  value={manualAmount}
                  onChange={(e) => setManualAmount(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-800 p-2 text-sm font-bold text-white"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Category</label>
                <select
                  value={manualCategory}
                  onChange={(e) => setManualCategory(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-800 p-2 text-white"
                >
                  {Object.keys(CATEGORY_DEFINITIONS).map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="submit"
                disabled={manualSaving}
                className="w-full rounded-xl bg-emerald-600 hover:bg-emerald-500 py-2.5 font-bold text-white transition-all disabled:opacity-50"
              >
                {manualSaving ? "Saving to Database..." : "Save to Ledger"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
