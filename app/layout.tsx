"use client";

import "./globals.css";
import React, { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { Sidebar } from "@/components/layout/Sidebar";
import { MobileNav } from "@/components/layout/MobileNav";
import { AddTransactionModal } from "@/components/finance/AddTransactionModal";
import { AnimatedCyberBackground } from "@/components/layout/AnimatedCyberBackground";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isLoginPage = pathname === "/login";

  const [currency, setCurrency] = useState("MYR"); // Default to MYR (RM)
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  useEffect(() => {
    // Load config from backend
    fetch("/api/config")
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.config?.defaultCurrency) {
          setCurrency(data.config.defaultCurrency);
        } else {
          setCurrency("MYR");
        }
      })
      .catch((err) => console.error(err));
  }, []);

  const handleCurrencyChange = async (newCurrency: string) => {
    setCurrency(newCurrency);
    try {
      await fetch("/api/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ defaultCurrency: newCurrency }),
      });
    } catch (e) {
      console.error("Failed to save currency:", e);
    }
  };

  const handleRefresh = () => {
    window.location.reload();
  };

  return (
    <html lang="en" className="dark">
      <head>
        <title>IV4N6Hub - Modular Platform & WhatsApp AI Finance</title>
        <meta
          name="description"
          content="IV4N6Hub is an extensible modular web application with intelligent WhatsApp AI finance and budget tracking."
        />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
        <link rel="manifest" href="/manifest.json" />
        <link rel="icon" href="/icon.svg" type="image/svg+xml" />
        <meta name="theme-color" content="#090d16" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
      </head>
      <body className="min-h-screen bg-[#090d16] text-slate-100 antialiased selection:bg-blue-600 selection:text-white relative overflow-x-hidden">
        {/* Dynamic Animated Ambient Background */}
        <AnimatedCyberBackground />

        {isLoginPage ? (
          /* Pure Fullscreen Centered Vault on Login Page */
          <main className="relative z-10 min-h-screen w-full flex items-center justify-center">
            {children}
          </main>
        ) : (
          /* Full App Shell */
          <div className="flex min-h-screen flex-col relative z-10">
            <Header
              currentCurrency={currency}
              onCurrencyChange={handleCurrencyChange}
              onRefresh={handleRefresh}
            />

            <div className="flex flex-1">
              <Sidebar onOpenAddModal={() => setIsAddModalOpen(true)} />
              <main className="flex-1 pb-20 md:pb-10 overflow-y-auto">{children}</main>
            </div>

            <MobileNav onOpenAddModal={() => setIsAddModalOpen(true)} />

            <AddTransactionModal
              isOpen={isAddModalOpen}
              onClose={() => setIsAddModalOpen(false)}
              onSuccess={() => window.location.reload()}
              currency={currency}
            />
          </div>
        )}
      </body>
    </html>
  );
}
