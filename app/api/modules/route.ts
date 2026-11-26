import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

const DEFAULT_PLATFORM_MODULES = [
  {
    key: "finance_dashboard",
    name: "Financial Overview & Analytics",
    description: "Real-time monthly/yearly cashflow, net worth tracking, category budgets & AI financial advisor.",
    category: "Core",
    isEnabled: true,
    icon: "DollarSign",
    path: "/finance",
  },
  {
    key: "multi_accounts",
    name: "Multi-Account Asset Vault",
    description: "Manage bank accounts, e-wallets (Touch 'n Go), cash wallets, credit cards & inter-account transfers.",
    category: "Finance",
    isEnabled: true,
    icon: "BookOpen",
    path: "/accounts",
  },
  {
    key: "transactions_ledger",
    name: "Transactions & Backup Center",
    description: "Full ledger history, inline editing, tag/account filtering, JSON snapshot restore & CSV export.",
    category: "Finance",
    isEnabled: true,
    icon: "Receipt",
    path: "/transactions",
  },
  {
    key: "whatsapp_ai_hub",
    name: "WhatsApp AI & Statement Reconciler",
    description: "Multimodal voice/text expense logging, receipt OCR, PDF/CSV bank statement auto-reconciliation & NL queries.",
    category: "AI",
    isEnabled: true,
    icon: "MessageSquare",
    path: "/whatsapp-hub",
  },
  {
    key: "smart_planner_notes",
    name: "Eat-That-Frog Planner & Memo Notes",
    description: "Top 3 Focus tasks, Morning/Afternoon/Evening time blocks, AI task breakdown, habit matrix & Obsidian/iCal export.",
    category: "Productivity",
    isEnabled: true,
    icon: "CheckSquare",
    path: "/notes",
  },
  {
    key: "file_converter_studio",
    name: "File Studio (Word ↔ PDF & AI Editor)",
    description: "Convert Word (.docx/.doc) ↔ PDF, edit documents with Gemini AI, compress/convert images, and edit CSV/JSON tables.",
    category: "Productivity",
    isEnabled: true,
    icon: "BookOpen",
    path: "/file-studio",
  },
  {
    key: "system_telemetry",
    name: "Dual PC & Cloud Hardware Monitor",
    description: "Live client GPU/Battery/Screen hardware diagnostics paired with Cloud Host CPU & RAM waveform telemetry.",
    category: "System",
    isEnabled: true,
    icon: "Package",
    path: "/system-monitor",
  },
];

export async function GET() {
  try {
    let modules = await db.platformModule.findMany({
      orderBy: { createdAt: "asc" },
    });

    if (modules.length === 0) {
      await Promise.all(
        DEFAULT_PLATFORM_MODULES.map((mod) =>
          db.platformModule.upsert({
            where: { key: mod.key },
            update: {},
            create: mod,
          })
        )
      );
      modules = await db.platformModule.findMany({
        orderBy: { createdAt: "asc" },
      });
    }

    return NextResponse.json({ success: true, modules });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { key, isEnabled } = body;

    if (!key || isEnabled === undefined) {
      return NextResponse.json({ success: false, error: "Key and isEnabled are required" }, { status: 400 });
    }

    const updated = await db.platformModule.update({
      where: { key },
      data: { isEnabled },
    });

    return NextResponse.json({ success: true, module: updated });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
