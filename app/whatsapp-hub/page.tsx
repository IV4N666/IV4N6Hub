"use client";

import React, { useState, useEffect } from "react";
import {
  MessageSquare,
  Mic,
  Key,
  Globe,
  CheckCircle,
  HelpCircle,
  Sparkles,
  Smartphone,
  ShieldCheck,
} from "lucide-react";
import { WhatsAppSimulator } from "@/components/whatsapp/WhatsAppSimulator";
import { WhatsAppWebhookGuide } from "@/components/whatsapp/WhatsAppWebhookGuide";

export default function WhatsAppHubPage() {
  const [activeTab, setActiveTab] = useState<"simulator" | "webhook" | "apikey">("simulator");
  const [currency, setCurrency] = useState("USD");
  const [apiKey, setApiKey] = useState("");
  const [savedKey, setSavedKey] = useState(false);

  useEffect(() => {
    fetch("/api/config")
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.config) {
          if (data.config.defaultCurrency) setCurrency(data.config.defaultCurrency);
          if (data.config.geminiApiKey) setApiKey(data.config.geminiApiKey);
        }
      })
      .catch((err) => console.error(err));
  }, []);

  const handleSaveApiKey = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ geminiApiKey: apiKey.trim() }),
      });
      if (res.ok) {
        setSavedKey(true);
        setTimeout(() => setSavedKey(false), 2500);
      }
    } catch (err) {
      console.error("Failed to save API key:", err);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              <MessageSquare className="h-5 w-5" />
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-white">
              WhatsApp AI & Voice Hub
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Send voice audio or text messages from anywhere. AI extracts the amount, categorizes it, and syncs to your web dashboard.
          </p>
        </div>

        {/* Tab Navigator */}
        <div className="flex rounded-xl bg-slate-900 border border-slate-800 p-1 text-xs">
          <button
            onClick={() => setActiveTab("simulator")}
            className={`flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 font-bold transition-all ${
              activeTab === "simulator"
                ? "bg-emerald-600 text-white shadow-md"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Smartphone className="h-3.5 w-3.5" />
            <span>Interactive Simulator</span>
          </button>
          <button
            onClick={() => setActiveTab("webhook")}
            className={`flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 font-bold transition-all ${
              activeTab === "webhook"
                ? "bg-blue-600 text-white shadow-md"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Globe className="h-3.5 w-3.5" />
            <span>Live Webhook Setup</span>
          </button>
          <button
            onClick={() => setActiveTab("apikey")}
            className={`flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 font-bold transition-all ${
              activeTab === "apikey"
                ? "bg-purple-600 text-white shadow-md"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Key className="h-3.5 w-3.5" />
            <span>AI Settings</span>
          </button>
        </div>
      </div>

      {/* Tab 1: Interactive WhatsApp Voice & Text Simulator */}
      {activeTab === "simulator" && (
        <WhatsAppSimulator currency={currency} />
      )}

      {/* Tab 2: Webhook Connection Guide */}
      {activeTab === "webhook" && <WhatsAppWebhookGuide />}

      {/* Tab 3: Gemini API Key Setup */}
      {activeTab === "apikey" && (
        <div className="max-w-2xl mx-auto space-y-6">
          <div className="glass-card rounded-2xl p-6 border border-slate-800">
            <h3 className="text-base font-bold text-white mb-2 flex items-center gap-2">
              <Key className="h-5 w-5 text-purple-400" />
              <span>Google Gemini AI API Key</span>
            </h3>
            <p className="text-xs text-slate-400 mb-5 leading-relaxed">
              IV4N6Hub includes a built-in heuristic parser that works out-of-the-box. Adding your free Google Gemini API key enables full multimodal voice audio transcription and contextual multi-currency understanding.
            </p>

            <form onSubmit={handleSaveApiKey} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Gemini API Key
                </label>
                <input
                  type="password"
                  placeholder="AIzaSy..."
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  className="w-full rounded-xl bg-slate-900 border border-slate-700 px-3.5 py-2.5 text-xs text-white placeholder-slate-500 outline-none focus:border-purple-500 font-mono"
                />
              </div>

              <div className="flex items-center justify-between pt-2">
                <a
                  href="https://aistudio.google.com/app/apikey"
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-blue-400 hover:underline flex items-center gap-1"
                >
                  <span>Get a free API key at Google AI Studio</span>
                  <span>↗</span>
                </a>

                <button
                  type="submit"
                  className="rounded-xl bg-purple-600 hover:bg-purple-500 px-4 py-2 text-xs font-bold text-white shadow-md shadow-purple-600/30 transition-all active:scale-95 flex items-center gap-1.5"
                >
                  {savedKey ? (
                    <>
                      <CheckCircle className="h-4 w-4 text-emerald-300" />
                      <span>Saved!</span>
                    </>
                  ) : (
                    <span>Save Key</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
