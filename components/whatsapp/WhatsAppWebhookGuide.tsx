"use client";

import React, { useState } from "react";
import { Copy, Check, ExternalLink, ShieldCheck, Terminal } from "lucide-react";

export const WhatsAppWebhookGuide: React.FC = () => {
  const [copied, setCopied] = useState<string | null>(null);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(null), 2000);
  };

  const webhookUrl = typeof window !== "undefined"
    ? `${window.location.origin}/api/webhook/whatsapp`
    : "https://your-domain.com/api/webhook/whatsapp";

  const verifyToken = "omnihub_secret_token";

  return (
    <div className="space-y-6">
      {/* Webhook Configuration Details */}
      <div className="glass-card rounded-2xl p-6 border border-slate-800">
        <h3 className="text-base font-bold text-white mb-2 flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-emerald-400" />
          <span>WhatsApp Cloud API Webhook Details</span>
        </h3>
        <p className="text-xs text-slate-400 mb-5 leading-relaxed">
          Configure your Meta Developer Portal or Twilio account with these credentials to receive WhatsApp messages in real-time.
        </p>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Callback URL (Webhook URL)
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={webhookUrl}
                className="flex-1 rounded-xl bg-slate-900 border border-slate-700 px-3.5 py-2.5 text-xs text-blue-300 font-mono select-all"
              />
              <button
                onClick={() => copyToClipboard(webhookUrl, "url")}
                className="flex items-center gap-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 px-3.5 py-2.5 text-xs font-semibold text-white transition-colors shrink-0"
              >
                {copied === "url" ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-emerald-400" />
                    <span>Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5" />
                    <span>Copy</span>
                  </>
                )}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Verify Token
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={verifyToken}
                className="flex-1 rounded-xl bg-slate-900 border border-slate-700 px-3.5 py-2.5 text-xs text-emerald-300 font-mono select-all"
              />
              <button
                onClick={() => copyToClipboard(verifyToken, "token")}
                className="flex items-center gap-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 px-3.5 py-2.5 text-xs font-semibold text-white transition-colors shrink-0"
              >
                {copied === "token" ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-emerald-400" />
                    <span>Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5" />
                    <span>Copy</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 3 Step Integration Guide */}
      <div className="glass-card rounded-2xl p-6 border border-slate-800">
        <h3 className="text-base font-bold text-white mb-4">
          Quick Setup Steps (Meta WhatsApp Cloud API)
        </h3>

        <div className="space-y-4 text-xs text-slate-300">
          <div className="flex items-start gap-3 rounded-xl bg-slate-900/60 p-4 border border-slate-800">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white font-bold text-xs">
              1
            </span>
            <div>
              <div className="font-semibold text-white">Create a Meta Developer App</div>
              <p className="text-slate-400 mt-1">
                Go to{" "}
                <a
                  href="https://developers.facebook.com"
                  target="_blank"
                  rel="noreferrer"
                  className="text-blue-400 underline inline-flex items-center gap-0.5"
                >
                  developers.facebook.com <ExternalLink className="h-3 w-3 inline" />
                </a>{" "}
                and add the <strong>WhatsApp</strong> product to your App.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 rounded-xl bg-slate-900/60 p-4 border border-slate-800">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white font-bold text-xs">
              2
            </span>
            <div>
              <div className="font-semibold text-white">Paste Callback URL & Verify Token</div>
              <p className="text-slate-400 mt-1">
                Under WhatsApp &gt; Configuration, click <strong>Edit Webhook</strong>, paste the Callback URL and Verify Token above, and subscribe to <code>messages</code>.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 rounded-xl bg-slate-900/60 p-4 border border-slate-800">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white font-bold text-xs">
              3
            </span>
            <div>
              <div className="font-semibold text-white">Send Voice & Text Messages</div>
              <p className="text-slate-400 mt-1">
                Send test voice notes or text messages from your phone to your test WhatsApp number. The transactions will immediately appear on your IV4N6Hub Web Dashboard!
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
