"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Settings,
  Coins,
  Key,
  Shield,
  Smartphone,
  Save,
  CheckCircle,
  Lock,
  LogOut,
  Sparkles,
  AlertCircle,
  Eye,
  EyeOff,
} from "lucide-react";

export default function SettingsPage() {
  const router = useRouter();
  const [currency, setCurrency] = useState("MYR");
  const [geminiApiKey, setGeminiApiKey] = useState("");
  const [maskedGeminiKey, setMaskedGeminiKey] = useState("");
  const [hasGeminiKey, setHasGeminiKey] = useState(false);

  const [webhookSecret, setWebhookSecret] = useState("omnihub_secret_token");
  const [whatsappPhone, setWhatsappPhone] = useState("");
  const [allowedPhoneNumbers, setAllowedPhoneNumbers] = useState("");

  const [newAdminPassword, setNewAdminPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    fetch("/api/config")
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.config) {
          if (data.config.defaultCurrency) setCurrency(data.config.defaultCurrency);
          if (data.config.maskedGeminiKey) setMaskedGeminiKey(data.config.maskedGeminiKey);
          if (data.config.hasGeminiKey) setHasGeminiKey(data.config.hasGeminiKey);
          if (data.config.webhookSecret) setWebhookSecret(data.config.webhookSecret);
          if (data.config.whatsappPhone) setWhatsappPhone(data.config.whatsappPhone);
          if (data.config.allowedPhoneNumbers) setAllowedPhoneNumbers(data.config.allowedPhoneNumbers);
        }
      })
      .catch((err) => console.error(err));
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");

    if (newAdminPassword && newAdminPassword !== confirmPassword) {
      setErrorMessage("New passcodes do not match.");
      return;
    }

    if (newAdminPassword && newAdminPassword.length < 4) {
      setErrorMessage("Passcode must be at least 4 characters.");
      return;
    }

    setIsSaving(true);
    try {
      const res = await fetch("/api/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          defaultCurrency: currency,
          geminiApiKey: geminiApiKey.trim(),
          webhookSecret: webhookSecret.trim(),
          whatsappPhone: whatsappPhone.trim(),
          allowedPhoneNumbers: allowedPhoneNumbers.trim(),
          ...(newAdminPassword ? { newAdminPassword: newAdminPassword.trim() } : {}),
        }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setSavedSuccess(true);
        if (data.config?.maskedGeminiKey) {
          setMaskedGeminiKey(data.config.maskedGeminiKey);
          setHasGeminiKey(true);
          setGeminiApiKey("");
        }
        setNewAdminPassword("");
        setConfirmPassword("");
        setTimeout(() => setSavedSuccess(false), 3000);
      } else {
        setErrorMessage(data.error || "Failed to save settings.");
      }
    } catch (err) {
      setErrorMessage("An unexpected error occurred while saving.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/login");
      router.refresh();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="border-b border-slate-800 pb-5 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-800 text-slate-300 border border-slate-700">
              <Settings className="h-5 w-5" />
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-white">
              System & Security Vault
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Manage your single-user passcode, API keys, whitelist and accounting currency.
          </p>
        </div>

        <button
          onClick={handleLogout}
          type="button"
          className="flex items-center gap-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 px-3.5 py-2 text-xs font-semibold transition-all active:scale-95"
        >
          <LogOut className="h-4 w-4" />
          <span>Lock / Log Out</span>
        </button>
      </div>

      {errorMessage && (
        <div className="rounded-xl bg-rose-500/10 border border-rose-500/30 p-3.5 text-xs text-rose-300 flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* 1. Master Passcode Security */}
        <div className="glass-card rounded-2xl p-6 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-200 flex items-center gap-2">
              <Shield className="h-4 w-4 text-emerald-400" />
              <span>Master Access Passcode (Single-User Lock)</span>
            </h3>
            <span className="text-[11px] text-emerald-400 font-semibold bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
              Vault Protected
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                New Passcode (Leave empty to keep current)
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter new master passcode..."
                  value={newAdminPassword}
                  onChange={(e) => setNewAdminPassword(e.target.value)}
                  className="w-full rounded-xl bg-slate-900 border border-slate-700 pl-3.5 pr-10 py-2.5 text-xs text-white placeholder-slate-500 outline-none focus:border-emerald-500 font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500 hover:text-slate-300"
                >
                  {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Confirm New Passcode
              </label>
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Confirm new master passcode..."
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full rounded-xl bg-slate-900 border border-slate-700 px-3.5 py-2.5 text-xs text-white placeholder-slate-500 outline-none focus:border-emerald-500 font-mono"
              />
            </div>
          </div>
          <p className="text-[11px] text-slate-400">
            This master passcode encrypts your session and guards all accounting data against unauthorized access.
          </p>
        </div>

        {/* 2. Global Currency */}
        <div className="glass-card rounded-2xl p-6 border border-slate-800 space-y-4">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-200 flex items-center gap-2">
            <Coins className="h-4 w-4 text-yellow-400" />
            <span>Default Accounting Currency</span>
          </h3>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Primary Currency
            </label>
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="w-full rounded-xl bg-slate-900 border border-slate-700 px-3.5 py-2.5 text-xs text-white outline-none focus:border-blue-500 cursor-pointer"
            >
              <option value="USD">USD - US Dollar ($)</option>
              <option value="MYR">MYR - Malaysian Ringgit (RM)</option>
              <option value="SGD">SGD - Singapore Dollar (S$)</option>
              <option value="EUR">EUR - Euro (€)</option>
              <option value="GBP">GBP - British Pound (£)</option>
              <option value="AUD">AUD - Australian Dollar (A$)</option>
              <option value="CAD">CAD - Canadian Dollar (C$)</option>
              <option value="CNY">CNY - Chinese Yuan (¥)</option>
            </select>
          </div>
        </div>

        {/* 3. AI & WhatsApp Credentials */}
        <div className="glass-card rounded-2xl p-6 border border-slate-800 space-y-4">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-200 flex items-center gap-2">
            <Key className="h-4 w-4 text-purple-400" />
            <span>AI Voice & WhatsApp Configuration</span>
          </h3>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-300">
                Google Gemini API Key
              </label>
              {hasGeminiKey && (
                <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                  Key Active ({maskedGeminiKey})
                </span>
              )}
            </div>
            <input
              type="password"
              placeholder={hasGeminiKey ? "Enter new key to replace existing..." : "AIzaSy..."}
              value={geminiApiKey}
              onChange={(e) => setGeminiApiKey(e.target.value)}
              className="w-full rounded-xl bg-slate-900 border border-slate-700 px-3.5 py-2.5 text-xs text-white placeholder-slate-500 outline-none focus:border-purple-500 font-mono"
            />
            <p className="text-[11px] text-slate-400 mt-1">
              Never exposed to public. Used by Gemini 1.5 Flash for natural language and voice audio parsing.
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              WhatsApp Allowed Phone Numbers Whitelist (Comma separated)
            </label>
            <input
              type="text"
              placeholder="+60123456789, +6591234567"
              value={allowedPhoneNumbers}
              onChange={(e) => setAllowedPhoneNumbers(e.target.value)}
              className="w-full rounded-xl bg-slate-900 border border-slate-700 px-3.5 py-2.5 text-xs text-white placeholder-slate-500 outline-none focus:border-purple-500 font-mono"
            />
            <p className="text-[11px] text-slate-400 mt-1">
              🛡️ Security Defense: Only WhatsApp messages sent from these authorized phone numbers will be processed and logged.
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              WhatsApp Webhook Verification Secret
            </label>
            <input
              type="text"
              value={webhookSecret}
              onChange={(e) => setWebhookSecret(e.target.value)}
              className="w-full rounded-xl bg-slate-900 border border-slate-700 px-3.5 py-2.5 text-xs text-emerald-300 outline-none focus:border-emerald-500 font-mono"
            />
          </div>
        </div>

        {/* Submit */}
        <div className="flex items-center justify-between pt-2">
          {savedSuccess ? (
            <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400">
              <CheckCircle className="h-4 w-4" />
              <span>Settings and security credentials saved successfully!</span>
            </div>
          ) : (
            <div />
          )}

          <button
            type="submit"
            disabled={isSaving}
            className="flex items-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-500 px-6 py-2.5 text-xs font-bold text-white shadow-lg shadow-blue-500/30 transition-all active:scale-95 disabled:opacity-50"
          >
            <Save className="h-4 w-4" />
            <span>{isSaving ? "Saving..." : "Save All Settings"}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
