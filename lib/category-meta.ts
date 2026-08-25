export interface CategoryMeta {
  name: string;
  color: string;
  bgLight: string;
  icon: string;
  defaultBudget: number;
}

export const CATEGORY_DEFINITIONS: Record<string, CategoryMeta> = {
  "Food & Dining": {
    name: "Food & Dining",
    color: "#f97316", // orange
    bgLight: "rgba(249, 115, 22, 0.15)",
    icon: "Utensils",
    defaultBudget: 600,
  },
  "Transport & Fuel": {
    name: "Transport & Fuel",
    color: "#06b6d4", // cyan
    bgLight: "rgba(6, 182, 212, 0.15)",
    icon: "Car",
    defaultBudget: 350,
  },
  "Shopping & Groceries": {
    name: "Shopping & Groceries",
    color: "#8b5cf6", // purple
    bgLight: "rgba(139, 92, 246, 0.15)",
    icon: "ShoppingBag",
    defaultBudget: 500,
  },
  "Bills & Utilities": {
    name: "Bills & Utilities",
    color: "#ef4444", // red
    bgLight: "rgba(239, 68, 68, 0.15)",
    icon: "Zap",
    defaultBudget: 300,
  },
  "Entertainment & Leisure": {
    name: "Entertainment & Leisure",
    color: "#ec4899", // pink
    bgLight: "rgba(236, 72, 153, 0.15)",
    icon: "Film",
    defaultBudget: 250,
  },
  "Healthcare & Medical": {
    name: "Healthcare & Medical",
    color: "#10b981", // emerald
    bgLight: "rgba(16, 185, 129, 0.15)",
    icon: "HeartPulse",
    defaultBudget: 150,
  },
  "Housing & Rent": {
    name: "Housing & Rent",
    color: "#3b82f6", // blue
    bgLight: "rgba(59, 130, 246, 0.15)",
    icon: "Home",
    defaultBudget: 1200,
  },
  "Salary & Income": {
    name: "Salary & Income",
    color: "#22c55e", // green
    bgLight: "rgba(34, 197, 94, 0.15)",
    icon: "TrendingUp",
    defaultBudget: 0,
  },
  "Investments & Savings": {
    name: "Investments & Savings",
    color: "#14b8a6", // teal
    bgLight: "rgba(20, 184, 166, 0.15)",
    icon: "PiggyBank",
    defaultBudget: 800,
  },
  "Travel & Holiday": {
    name: "Travel & Holiday",
    color: "#eab308", // yellow
    bgLight: "rgba(234, 179, 8, 0.15)",
    icon: "Plane",
    defaultBudget: 400,
  },
  "Education": {
    name: "Education",
    color: "#6366f1", // indigo
    bgLight: "rgba(99, 102, 241, 0.15)",
    icon: "GraduationCap",
    defaultBudget: 200,
  },
  "Other": {
    name: "Other",
    color: "#94a3b8", // slate
    bgLight: "rgba(148, 163, 184, 0.15)",
    icon: "MoreHorizontal",
    defaultBudget: 150,
  },
};

export function getCategoryMeta(categoryName: string): CategoryMeta {
  return (
    CATEGORY_DEFINITIONS[categoryName] || {
      name: categoryName,
      color: "#94a3b8",
      bgLight: "rgba(148, 163, 184, 0.15)",
      icon: "Tag",
      defaultBudget: 100,
    }
  );
}

export function formatCurrency(amount: number, currency = "USD"): string {
  const symbols: Record<string, string> = {
    USD: "$",
    MYR: "RM",
    SGD: "S$",
    EUR: "€",
    GBP: "£",
    JPY: "¥",
    CNY: "¥",
    AUD: "A$",
  };

  const symbol = symbols[currency] || `${currency} `;
  return `${symbol}${amount.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}
