"use client";

import React, { useState, useRef, useEffect } from "react";
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
} from "lucide-react";
import { formatCurrency, getCategoryMeta, CATEGORY_DEFINITIONS } from "@/lib/category-meta";

interface ChatMessage {
  id: string;
  sender: "user" | "bot";
  type: "text" | "voice";
  text: string;
  transcript?: string;
  parsedData?: {
    amount: number;
    category: string;
    description: string;
    currency: string;
    type: string;
  };
  uploadStatus?: "SAVED" | "NO_AMOUNT" | "ERROR";
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
      text: "👋 Hi! I'm your IV4N6Hub Financial Assistant on WhatsApp.\n\nYou can speak a voice note or type an expense (e.g. 'Spent 25 on fuel' or 'Lunch 14.50'). Gemini AI will extract the amount, categorize it, and instantly upload it to your ledger!",
      uploadStatus: "SAVED",
      timestamp: "12:00 PM",
    },
  ]);

  const [inputMessage, setInputMessage] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStep, setProcessingStep] = useState("Analyzing with Gemini AI...");

  // Quick Manual Edit Modal if amount not detected
  const [manualModalOpen, setManualModalOpen] = useState(false);
  const [manualDesc, setManualDesc] = useState("");
  const [manualAmount, setManualAmount] = useState("");
  const [manualCategory, setManualCategory] = useState("Food & Dining");
  const [manualSaving, setManualSaving] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const isCancelledRef = useRef<boolean>(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const chatBottomRef = useRef<HTMLDivElement | null>(null);

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

    const userMsgId = String(Date.now());
    setMessages((prev) => [
      ...prev,
      {
        id: userMsgId,
        sender: "user",
        type: "voice",
        text: `🎤 Voice note (${recordingDuration}s)`,
        timestamp: now,
      },
    ]);

    try {
      const reader = new FileReader();
      reader.readAsDataURL(audioBlob);
      reader.onloadend = async () => {
        const base64Data = (reader.result as string).split(",")[1];

        setProcessingStep("Extracting amount & uploading to database...");
        const res = await fetch("/api/ai/parse", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            audioBase64: base64Data,
            mimeType: audioBlob.type,
            defaultCurrency: currency,
            autoSave: true,
            source: "WHATSAPP_VOICE",
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
          text: `❌ Error processing voice note: ${err.message || "Network error"}`,
          uploadStatus: "ERROR",
          timestamp: now,
        },
      ]);
    }
  };

  const handleSendText = async (textToSend?: string) => {
    const text = (textToSend || inputMessage).trim();
    if (!text || isProcessing) return;

    setInputMessage("");
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

    try {
      const res = await fetch("/api/ai/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text,
          defaultCurrency: currency,
          autoSave: true,
          source: "WHATSAPP_TEXT",
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
          text: `❌ Server error: ${err.message || "Failed to contact AI"}`,
          uploadStatus: "ERROR",
          timestamp: now,
        },
      ]);
    }
  };

  const handleApiResponse = (data: any, timestamp: string) => {
    setIsProcessing(false);
    if (data.success && data.parsed) {
      const parsed = data.parsed;

      if (parsed.amount > 0) {
        setMessages((prev) => [
          ...prev,
          {
            id: String(Date.now() + 1),
            sender: "bot",
            type: "text",
            text: `Recorded ${formatCurrency(
              parsed.amount,
              parsed.currency || currency
            )} for ${parsed.category}`,
            transcript: parsed.transcript,
            parsedData: parsed,
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
            text: `Could not detect a numerical price in your input.`,
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
          text: `⚠️ ${data.error || "Could not process request."}`,
          uploadStatus: "ERROR",
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
    "🍔 Lunch with colleagues 18.50",
    "🍜 吃午餐花了 15 块半 (Food & Dining)",
    "⛽ 打油 50 块 (Shell Petrol)",
    "☕ 喝 Starbucks 咖啡 16 块",
    "🛒 Grocery shopping 92.40",
    "💰 收到薪水 4500 (Salary Income)",
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
                    <p className="whitespace-pre-wrap leading-relaxed break-words [overflow-wrap:anywhere] [word-break:break-word]">{msg.text}</p>
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
                      </div>

                      {msg.transcript && (
                        <div className="rounded-lg bg-slate-900/80 p-2 text-[10px] text-slate-400 italic border border-slate-800 break-words [overflow-wrap:anywhere] [word-break:break-word]">
                          <span className="text-emerald-400 not-italic font-semibold">Transcript: </span>
                          &ldquo;{msg.transcript}&rdquo;
                        </div>
                      )}

                      <div className="pt-1 flex items-center justify-between gap-2 flex-wrap">
                        <Link
                          href="/transactions"
                          className="text-[10px] font-bold text-cyan-400 hover:underline flex items-center gap-1 shrink-0"
                        >
                          <span>View in Ledger</span>
                          <ArrowUpRight className="h-3 w-3" />
                        </Link>
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
                        I heard what you said, but could not detect a numerical price or amount.
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

                  {/* Standard initial bot messages */}
                  {!isUser && msg.uploadStatus !== "SAVED" && msg.uploadStatus !== "NO_AMOUNT" && (
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

        {/* Input Bar */}
        <div className="flex items-center gap-2 bg-[#202c33] p-3 border-t border-slate-800 shrink-0">
          <input
            type="text"
            placeholder={
              isRecording
                ? "Recording voice... Click Cancel or Send"
                : "Type an expense (e.g. 'Lunch 15.50', 'Spent 40 on fuel')..."
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
