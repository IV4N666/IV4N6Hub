export interface CategoryMeta {
  name: string;
  color: string;
  bgLight: string;
  icon: string;
  defaultBudget: number;
  subCategories?: string[];
}

export const CATEGORY_DEFINITIONS: Record<string, CategoryMeta> = {
  "Food & Dining": {
    name: "Food & Dining",
    color: "#f97316", // orange
    bgLight: "rgba(249, 115, 22, 0.15)",
    icon: "Utensils",
    defaultBudget: 600,
    subCategories: ["Breakfast", "Lunch", "Dinner", "Cafe & Coffee", "Groceries", "Snacks & Drinks", "Delivery"],
  },
  "Transport & Fuel": {
    name: "Transport & Fuel",
    color: "#06b6d4", // cyan
    bgLight: "rgba(6, 182, 212, 0.15)",
    icon: "Car",
    defaultBudget: 350,
    subCategories: ["Petrol/Gas", "Toll & Parking", "Grab / Taxi", "Public Transit", "Car Maintenance", "Insurance"],
  },
  "Shopping & Groceries": {
    name: "Shopping & Groceries",
    color: "#8b5cf6", // purple
    bgLight: "rgba(139, 92, 246, 0.15)",
    icon: "ShoppingBag",
    defaultBudget: 500,
    subCategories: ["Supermarket", "Clothing", "Electronics & Gadgets", "Home & Kitchen", "Online Shopping"],
  },
  "Bills & Utilities": {
    name: "Bills & Utilities",
    color: "#ef4444", // red
    bgLight: "rgba(239, 68, 68, 0.15)",
    icon: "Zap",
    defaultBudget: 300,
    subCategories: ["Electricity (TNB)", "Water Bill", "Internet / WiFi", "Mobile Phone", "Streaming / Subscriptions"],
  },
  "Entertainment & Leisure": {
    name: "Entertainment & Leisure",
    color: "#ec4899", // pink
    bgLight: "rgba(236, 72, 153, 0.15)",
    icon: "Film",
    defaultBudget: 250,
    subCategories: ["Movies & Cinema", "Gaming", "Hobbies", "Events & Concerts", "Outdoor & Sports"],
  },
  "Healthcare & Medical": {
    name: "Healthcare & Medical",
    color: "#10b981", // emerald
    bgLight: "rgba(16, 185, 129, 0.15)",
    icon: "HeartPulse",
    defaultBudget: 150,
    subCategories: ["Doctor / Clinic", "Pharmacy / Medicine", "Dental", "Fitness & Gym", "Supplements"],
  },
  "Housing & Rent": {
    name: "Housing & Rent",
    color: "#3b82f6", // blue
    bgLight: "rgba(59, 130, 246, 0.15)",
    icon: "Home",
    defaultBudget: 1200,
    subCategories: ["Monthly Rent", "Mortgage", "Maintenance / HOA", "Furniture & Decor", "Repairs"],
  },
  "Salary & Income": {
    name: "Salary & Income",
    color: "#22c55e", // green
    bgLight: "rgba(34, 197, 94, 0.15)",
    icon: "TrendingUp",
    defaultBudget: 0,
    subCategories: ["Main Salary", "Freelance & Projects", "Bonus", "Dividends & Interest", "Refund / Cashback"],
  },
  "Investments & Savings": {
    name: "Investments & Savings",
    color: "#14b8a6", // teal
    bgLight: "rgba(20, 184, 166, 0.15)",
    icon: "PiggyBank",
    defaultBudget: 800,
    subCategories: ["Fixed Deposit", "Stocks & ETFs", "Crypto", "EPF / Retirement", "Emergency Fund"],
  },
  "Travel & Holiday": {
    name: "Travel & Holiday",
    color: "#eab308", // yellow
    bgLight: "rgba(234, 179, 8, 0.15)",
    icon: "Plane",
    defaultBudget: 400,
    subCategories: ["Flights", "Hotel & Lodging", "Dining & Food", "Attractions & Tours", "Souvenirs"],
  },
  "Education": {
    name: "Education",
    color: "#6366f1", // indigo
    bgLight: "rgba(99, 102, 241, 0.15)",
    icon: "GraduationCap",
    defaultBudget: 200,
    subCategories: ["Tuition", "Books & Courses", "Software & Tools", "Certification"],
  },
  "Other": {
    name: "Other",
    color: "#94a3b8", // slate
    bgLight: "rgba(148, 163, 184, 0.15)",
    icon: "MoreHorizontal",
    defaultBudget: 150,
    subCategories: ["Gifts & Donations", "Fees & Penalties", "Miscellaneous"],
  },
};

export const ACCOUNT_TYPE_META: Record<string, { label: string; icon: string; defaultColor: string }> = {
  CASH: { label: "Cash & Wallet", icon: "Banknote", defaultColor: "#10b981" },
  BANK: { label: "Bank Account", icon: "Landmark", defaultColor: "#3b82f6" },
  E_WALLET: { label: "E-Wallet", icon: "Smartphone", defaultColor: "#06b6d4" },
  CREDIT_CARD: { label: "Credit Card", icon: "CreditCard", defaultColor: "#ec4899" },
  INVESTMENT: { label: "Investment", icon: "TrendingUp", defaultColor: "#8b5cf6" },
  OTHER: { label: "Other Asset", icon: "Vault", defaultColor: "#64748b" },
};

export function getCategoryMeta(categoryName: string): CategoryMeta {
  return (
    CATEGORY_DEFINITIONS[categoryName] || {
      name: categoryName,
      color: "#94a3b8",
      bgLight: "rgba(148, 163, 184, 0.15)",
      icon: "Tag",
      defaultBudget: 100,
      subCategories: ["General"],
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
