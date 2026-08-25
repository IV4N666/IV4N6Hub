"use client";

import React, { useState, useRef, useEffect } from "react";
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
} from "lucide-react";
import { formatCurrency } from "@/lib/category-meta";

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
      text: "👋 Hi! I'm your OmniHub Financial Assistant on WhatsApp.\n\nYou can send me any text (e.g. 'Spent 25 on fuel' or 'Lunch 14.50') or speak a voice note using the microphone below. I will extract your expenses and instantly update your financial web dashboard!",
      timestamp: "12:00 PM",
    },
  ]);

  const [inputMessage, setInputMessage] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeTab, setActiveTab] = useState<"simulator" | "guide">("simulator");

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const chatBottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isProcessing]);

  // Voice recording handlers
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, {
          type: mediaRecorder.mimeType || "audio/webm",
        });
        await handleAudioUpload(audioBlob);
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingDuration(0);

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

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  const handleAudioUpload = async (audioBlob: Blob) => {
    setIsProcessing(true);
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
    }
  };

  const handleSendText = async (textToSend?: string) => {
    const text = (textToSend || inputMessage).trim();
    if (!text || isProcessing) return;

    setInputMessage("");
    setIsProcessing(true);
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
    }
  };

  const handleApiResponse = (data: any, timestamp: string) => {
    setIsProcessing(false);
    if (data.success && data.parsed) {
      const parsed = data.parsed;
      let replyText = "";

      if (parsed.amount > 0) {
        replyText = `✅ Recorded ${formatCurrency(
          parsed.amount,
          parsed.currency || currency
        )} for ${parsed.category} (${parsed.description}).\n\nYour monthly spending and charts are now updated! 📊`;
      } else {
        replyText = `⚠️ I received your message ("${parsed.description}"), but could not detect an expense amount. Try saying e.g. "Coffee $4.50" or "Gas 40".`;
      }

      setMessages((prev) => [
        ...prev,
        {
          id: String(Date.now() + 1),
          sender: "bot",
          type: "text",
          text: replyText,
          transcript: parsed.transcript,
          parsedData: parsed,
          timestamp,
        },
      ]);

      if (parsed.amount > 0 && onExpenseLogged) {
        onExpenseLogged();
      }
    }
  };

  const quickSamples = [
    "🍔 Lunch with colleagues $18.50",
    "⛽ Petrol 50 at Shell station",
    "🛒 Whole foods grocery 92.40",
    "☕ Starbucks iced latte 6.50",
    "💡 Electricity utility bill 145",
    "💰 Received salary 4500",
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* WhatsApp Simulated Phone Box */}
      <div className="lg:col-span-7 flex flex-col h-[650px] rounded-3xl border border-slate-700 bg-slate-950 overflow-hidden shadow-2xl">
        {/* WhatsApp Top Green Header */}
        <div className="flex items-center justify-between bg-[#075e54] px-4 py-3 text-white">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-700 text-white font-bold border border-emerald-400/40">
                <Bot className="h-5 w-5" />
              </div>
              <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-green-400 border-2 border-[#075e54]" />
            </div>
            <div>
              <div className="text-sm font-bold flex items-center gap-1.5">
                <span>IV4N6Hub Finance Assistant</span>
                <Sparkles className="h-3.5 w-3.5 text-yellow-300" />
              </div>
              <div className="text-[11px] text-emerald-100 flex items-center gap-1">
                <span>Online • Powered by Gemini AI</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-emerald-800/80 px-2.5 py-1 text-[11px] font-semibold text-emerald-200 border border-emerald-600/40">
              Live Bridge
            </span>
          </div>
        </div>

        {/* WhatsApp Chat Conversation Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#0b141a] bg-opacity-95">
          {messages.map((msg) => {
            const isUser = msg.sender === "user";
            return (
              <div
                key={msg.id}
                className={`flex flex-col ${
                  isUser ? "items-end" : "items-start"
                }`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl p-3.5 text-xs shadow-md ${
                    isUser
                      ? "bg-[#005c4b] text-emerald-50 rounded-tr-none"
                      : "bg-[#202c33] text-slate-100 rounded-tl-none border border-slate-700/40"
                  }`}
                >
                  {msg.type === "voice" && (
                    <div className="flex items-center gap-2 mb-1.5 pb-1 border-b border-white/10 font-semibold text-emerald-300">
                      <Volume2 className="h-3.5 w-3.5" />
                      <span>Audio Voice Note</span>
                    </div>
                  )}

                  <p className="whitespace-pre-line leading-relaxed">{msg.text}</p>

                  {/* If transcript exists */}
                  {msg.transcript && (
                    <div className="mt-2 rounded-lg bg-black/30 p-2 text-[11px] text-slate-300 border border-slate-700/50">
                      <span className="font-semibold text-emerald-400">
                        Speech Transcript:{" "}
                      </span>
                      &quot;{msg.transcript}&quot;
                    </div>
                  )}

                  {/* Parsed JSON badge */}
                  {msg.parsedData && msg.parsedData.amount > 0 && (
                    <div className="mt-2.5 flex flex-wrap gap-1 pt-1.5 border-t border-slate-700/60 text-[10px]">
                      <span className="rounded-md bg-blue-500/20 px-2 py-0.5 font-bold text-blue-300 border border-blue-500/30">
                        {msg.parsedData.type}
                      </span>
                      <span className="rounded-md bg-amber-500/20 px-2 py-0.5 font-bold text-amber-300 border border-amber-500/30">
                        {msg.parsedData.category}
                      </span>
                      <span className="rounded-md bg-emerald-500/20 px-2 py-0.5 font-bold text-emerald-300 border border-emerald-500/30">
                        {formatCurrency(
                          msg.parsedData.amount,
                          msg.parsedData.currency || currency
                        )}
                      </span>
                    </div>
                  )}

                  <div className="mt-1 flex items-center justify-end gap-1 text-[10px] text-slate-400">
                    <span>{msg.timestamp}</span>
                    {isUser && (
                      <CheckCheck className="h-3.5 w-3.5 text-blue-400" />
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          {isProcessing && (
            <div className="flex items-center gap-2 text-xs text-slate-400 bg-[#202c33] p-3 rounded-2xl rounded-tl-none w-fit border border-slate-700/40">
              <Sparkles className="h-4 w-4 text-emerald-400 animate-spin" />
              <span>AI is analyzing speech and categorizing expense...</span>
            </div>
          )}

          <div ref={chatBottomRef} />
        </div>

        {/* Voice Recording Active Overlay */}
        {isRecording && (
          <div className="bg-[#1f2c34] border-t border-slate-700 p-3 flex items-center justify-between animate-fadeIn">
            <div className="flex items-center gap-3">
              <div className="h-4 w-4 rounded-full bg-red-500 recording-pulse" />
              <span className="text-xs font-bold text-red-400">
                Recording Voice Note... ({recordingDuration}s)
              </span>
            </div>
            <button
              onClick={stopRecording}
              className="flex items-center gap-1.5 rounded-xl bg-red-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-red-500 transition-colors shadow-lg"
            >
              <Square className="h-3.5 w-3.5 fill-current" />
              <span>Stop & Process</span>
            </button>
          </div>
        )}

        {/* Input Bar */}
        <div className="flex items-center gap-2 bg-[#202c33] p-3 border-t border-slate-800">
          <input
            type="text"
            placeholder={
              isRecording
                ? "Listening to voice..."
                : "Type an expense (e.g. 'Coffee 4.50', 'Spent 30 on fuel')..."
            }
            disabled={isRecording || isProcessing}
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSendText()}
            className="flex-1 rounded-xl bg-[#2a3942] px-4 py-2.5 text-xs text-white placeholder-slate-400 outline-none focus:ring-1 focus:ring-emerald-500"
          />

          {inputMessage.trim() ? (
            <button
              onClick={() => handleSendText()}
              disabled={isProcessing}
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600 text-white hover:bg-emerald-500 transition-colors shrink-0"
            >
              <Send className="h-4 w-4" />
            </button>
          ) : (
            <button
              onClick={isRecording ? stopRecording : startRecording}
              disabled={isProcessing}
              title={isRecording ? "Stop Recording" : "Speak Voice Note"}
              className={`flex h-10 w-10 items-center justify-center rounded-xl transition-all shrink-0 ${
                isRecording
                  ? "bg-red-600 text-white recording-pulse"
                  : "bg-emerald-600 text-white hover:bg-emerald-500 active:scale-95"
              }`}
            >
              {isRecording ? <Square className="h-4 w-4 fill-current" /> : <Mic className="h-4 w-4" />}
            </button>
          )}
        </div>
      </div>

      {/* Right Column: Quick Test Samples & Webhook Setup */}
      <div className="lg:col-span-5 flex flex-col gap-4">
        {/* Quick Test Prompt Card */}
        <div className="glass-card rounded-2xl p-5 border border-slate-800/80">
          <div className="flex items-center gap-2 mb-3">
            <Zap className="h-4 w-4 text-yellow-400" />
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-200">
              Quick One-Click Test Prompts
            </h3>
          </div>
          <p className="text-xs text-slate-400 mb-3">
            Click any message below to simulate how the AI parses and categorizes real WhatsApp inputs:
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
        <div className="glass-card rounded-2xl p-5 border border-slate-800/80">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-200 flex items-center gap-2 mb-2">
            <Sparkles className="h-4 w-4 text-purple-400" />
            <span>How WhatsApp AI Works</span>
          </h3>
          <ul className="space-y-2 text-xs text-slate-400">
            <li className="flex items-start gap-2">
              <span className="text-emerald-400 font-bold">1.</span>
              <span>
                <strong>Voice Note / Text Message:</strong> Send audio or text directly in your WhatsApp chat anytime from anywhere.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-400 font-bold">2.</span>
              <span>
                <strong>Gemini Multimodal AI:</strong> Transcribes audio, extracts numerical amount, detects currency, and assigns correct expense categories.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-purple-400 font-bold">3.</span>
              <span>
                <strong>Live Dashboard Sync:</strong> Your monthly and yearly financial metrics, budgets, and charts update instantly in real time.
              </span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};
