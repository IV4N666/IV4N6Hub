export type TransactionType = "EXPENSE" | "INCOME" | "TRANSFER";

export type TransactionSource =
  | "WEB_MANUAL"
  | "WHATSAPP_TEXT"
  | "WHATSAPP_VOICE"
  | "API"
  | "RECEIPT_OCR"
  | "RECURRING";

export type AccountType =
  | "CASH"
  | "BANK"
  | "E_WALLET"
  | "CREDIT_CARD"
  | "INVESTMENT"
  | "OTHER";

export type RecurringFrequency = "DAILY" | "WEEKLY" | "MONTHLY" | "YEARLY";

export interface Account {
  id: string;
  name: string;
  type: AccountType;
  currency: string;
  balance: number;
  initialBalance: number;
  color: string;
  icon: string;
  isArchived: boolean;
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

export interface RecurringBill {
  id: string;
  name: string;
  amount: number;
  type: "EXPENSE" | "INCOME";
  category: string;
  subCategory?: string | null;
  frequency: RecurringFrequency;
  nextDueDate: string | Date;
  lastPaidDate?: string | Date | null;
  isActive: boolean;
  autoExecute: boolean;
  accountId?: string | null;
  account?: Account | null;
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

export interface Transaction {
  id: string;
  amount: number;
  type: TransactionType;
  category: string;
  subCategory?: string | null;
  tags?: string | null;
  description?: string | null;
  source: TransactionSource;
  rawInput?: string | null;
  currency: string;
  accountId?: string | null;
  toAccountId?: string | null;
  account?: Account | null;
  toAccount?: Account | null;
  date: string | Date;
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

export interface CategoryBudget {
  id: string;
  category: string;
  monthlyLimit: number;
  color: string;
  icon: string;
}

export interface MonthlyStats {
  month: string; // e.g. "2026-08"
  monthName: string; // e.g. "August 2026"
  totalExpense: number;
  totalIncome: number;
  netSavings: number;
  savingsRate: number;
  dailyAverageSpend: number;
  transactionCount: number;
  categoryBreakdown: {
    category: string;
    total: number;
    percentage: number;
    color: string;
    count: number;
  }[];
  dailySpending: {
    day: number;
    date: string;
    expense: number;
    income: number;
  }[];
}

export interface YearlyStats {
  year: number;
  totalExpense: number;
  totalIncome: number;
  netSavings: number;
  savingsRate: number;
  monthlyAverageExpense: number;
  monthlyAverageIncome: number;
  monthlyBreakdown: {
    monthIndex: number;
    monthName: string;
    shortName: string;
    expense: number;
    income: number;
    net: number;
  }[];
  topExpenseCategories: {
    category: string;
    total: number;
    percentage: number;
    color: string;
  }[];
}

export interface PlatformModule {
  id: string;
  key: string;
  name: string;
  description: string;
  category: string;
  isEnabled: boolean;
  icon: string;
  path: string;
  badge?: string;
}

export interface AIParsedExpense {
  amount: number;
  type: TransactionType;
  category: string;
  description: string;
  currency: string;
  date?: string;
  confidence: number;
  reasoning?: string;
}
