const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  // Seed Platform Modules
  const modules = [
    {
      key: "finance",
      name: "Financial Tracker",
      description: "Track monthly and yearly expenses, income, budgets, and automated spending analytics.",
      category: "Finance",
      isEnabled: true,
      icon: "DollarSign",
      path: "/finance",
    },
    {
      key: "whatsapp_ai",
      name: "WhatsApp AI Assistant",
      description: "Log expenses instantly via WhatsApp voice notes and text messages parsed by Gemini AI.",
      category: "Integrations",
      isEnabled: true,
      icon: "MessageSquare",
      path: "/whatsapp-hub",
    },
    {
      key: "transactions",
      name: "Transactions Ledger",
      description: "Search, filter, edit, and export complete spending history.",
      category: "Finance",
      isEnabled: true,
      icon: "Receipt",
      path: "/transactions",
    },
    {
      key: "tasks",
      name: "Task & Project Manager",
      description: "Organize daily tasks, project boards, and personal milestones (Modular Add-on).",
      category: "Productivity",
      isEnabled: false,
      icon: "CheckSquare",
      path: "/modules/tasks",
    },
    {
      key: "notes",
      name: "Knowledge & Notes",
      description: "Quick markdown notes, voice transcripts, and smart knowledge base (Modular Add-on).",
      category: "Productivity",
      isEnabled: false,
      icon: "BookOpen",
      path: "/modules/notes",
    },
    {
      key: "inventory",
      name: "Inventory & Assets",
      description: "Track physical assets, warranties, equipment, and home inventory (Modular Add-on).",
      category: "Operations",
      isEnabled: false,
      icon: "Package",
      path: "/modules/inventory",
    },
    {
      key: "crm",
      name: "Contacts & Clients",
      description: "Manage client relationships, meetings, follow-ups, and notes (Modular Add-on).",
      category: "Business",
      isEnabled: false,
      icon: "Users",
      path: "/modules/crm",
    },
  ];

  for (const mod of modules) {
    await prisma.platformModule.upsert({
      where: { key: mod.key },
      update: mod,
      create: mod,
    });
  }

  // Seed Category Budgets
  const categoryBudgets = [
    { category: "Food & Dining", monthlyLimit: 600, color: "#f97316", icon: "Utensils" },
    { category: "Transport & Fuel", monthlyLimit: 350, color: "#06b6d4", icon: "Car" },
    { category: "Shopping & Groceries", monthlyLimit: 500, color: "#8b5cf6", icon: "ShoppingBag" },
    { category: "Bills & Utilities", monthlyLimit: 300, color: "#ef4444", icon: "Zap" },
    { category: "Entertainment & Leisure", monthlyLimit: 250, color: "#ec4899", icon: "Film" },
    { category: "Healthcare & Medical", monthlyLimit: 150, color: "#10b981", icon: "HeartPulse" },
    { category: "Housing & Rent", monthlyLimit: 1200, color: "#3b82f6", icon: "Home" },
    { category: "Investments & Savings", monthlyLimit: 800, color: "#14b8a6", icon: "PiggyBank" },
    { category: "Travel & Holiday", monthlyLimit: 400, color: "#eab308", icon: "Plane" },
    { category: "Education", monthlyLimit: 200, color: "#6366f1", icon: "GraduationCap" },
    { category: "Other", monthlyLimit: 150, color: "#94a3b8", icon: "MoreHorizontal" },
  ];

  for (const b of categoryBudgets) {
    await prisma.categoryBudget.upsert({
      where: { category: b.category },
      update: b,
      create: b,
    });
  }

  // Seed App Config
  await prisma.appConfig.upsert({
    where: { id: "default" },
    update: { defaultCurrency: "USD" },
    create: { id: "default", defaultCurrency: "USD", theme: "dark" },
  });

  // Seed sample transactions if empty
  const txCount = await prisma.transaction.count();
  if (txCount === 0) {
    console.log("Generating sample realistic transactions across recent months...");
    const sampleTxs = [
      // August 2026 (Current month)
      { amount: 4500, type: "INCOME", category: "Salary & Income", description: "Monthly Tech Salary", source: "WEB_MANUAL", date: new Date(2026, 7, 1) },
      { amount: 1200, type: "EXPENSE", category: "Housing & Rent", description: "Apartment Monthly Rent", source: "WEB_MANUAL", date: new Date(2026, 7, 2) },
      { amount: 120, type: "EXPENSE", category: "Bills & Utilities", description: "High-speed Fiber Internet & Electricity", source: "WEB_MANUAL", date: new Date(2026, 7, 3) },
      { amount: 85.50, type: "EXPENSE", category: "Shopping & Groceries", description: "Weekly Whole Foods supermarket run", source: "WHATSAPP_TEXT", rawInput: "spent 85.50 on groceries at whole foods", date: new Date(2026, 7, 5) },
      { amount: 24.00, type: "EXPENSE", category: "Food & Dining", description: "Lunch bowl & green tea", source: "WHATSAPP_VOICE", rawInput: "[Voice Note] Spent 24 dollars on lunch with team", date: new Date(2026, 7, 8) },
      { amount: 50.00, type: "EXPENSE", category: "Transport & Fuel", description: "Shell Petrol Station refuel", source: "WHATSAPP_TEXT", rawInput: "Petrol pump 50 dollars", date: new Date(2026, 7, 10) },
      { amount: 350, type: "INCOME", category: "Investments & Savings", description: "Quarterly Stock Dividend Payout", source: "WEB_MANUAL", date: new Date(2026, 7, 12) },
      { amount: 45.00, type: "EXPENSE", category: "Entertainment & Leisure", description: "Cinema tickets & popcorn IMAX", source: "WHATSAPP_VOICE", rawInput: "[Voice Note] 45 bucks for IMAX movie night", date: new Date(2026, 7, 14) },
      { amount: 65.20, type: "EXPENSE", category: "Food & Dining", description: "Italian bistro dinner with friends", source: "WHATSAPP_TEXT", rawInput: "Dinner 65.20 with Sarah and Mike", date: new Date(2026, 7, 18) },
      { amount: 38.00, type: "EXPENSE", category: "Transport & Fuel", description: "Grab / Uber ride to airport", source: "WHATSAPP_TEXT", rawInput: "Grab ride 38", date: new Date(2026, 7, 20) },
      { amount: 95.00, type: "EXPENSE", category: "Healthcare & Medical", description: "Dental checkup & cleaning", source: "WEB_MANUAL", date: new Date(2026, 7, 22) },
      { amount: 18.50, type: "EXPENSE", category: "Food & Dining", description: "Starbucks reserve coffee & pastry", source: "WHATSAPP_VOICE", rawInput: "[Voice Note] Bought Starbucks breakfast 18.50", date: new Date(2026, 7, 24) },

      // July 2026
      { amount: 4500, type: "INCOME", category: "Salary & Income", description: "Monthly Tech Salary", source: "WEB_MANUAL", date: new Date(2026, 6, 1) },
      { amount: 1200, type: "EXPENSE", category: "Housing & Rent", description: "Apartment Monthly Rent", source: "WEB_MANUAL", date: new Date(2026, 6, 2) },
      { amount: 480, type: "EXPENSE", category: "Food & Dining", description: "Monthly dining & coffee", source: "WEB_MANUAL", date: new Date(2026, 6, 15) },
      { amount: 310, type: "EXPENSE", category: "Shopping & Groceries", description: "Groceries & household supplies", source: "WEB_MANUAL", date: new Date(2026, 6, 18) },
      { amount: 210, type: "EXPENSE", category: "Transport & Fuel", description: "Fuel and MRT transit passes", source: "WEB_MANUAL", date: new Date(2026, 6, 20) },
      { amount: 150, type: "EXPENSE", category: "Bills & Utilities", description: "Electricity & water bills", source: "WEB_MANUAL", date: new Date(2026, 6, 22) },

      // June 2026
      { amount: 4500, type: "INCOME", category: "Salary & Income", description: "Monthly Tech Salary", source: "WEB_MANUAL", date: new Date(2026, 5, 1) },
      { amount: 600, type: "INCOME", category: "Investments & Savings", description: "Freelance consulting project", source: "WEB_MANUAL", date: new Date(2026, 5, 12) },
      { amount: 1200, type: "EXPENSE", category: "Housing & Rent", description: "Apartment Monthly Rent", source: "WEB_MANUAL", date: new Date(2026, 5, 2) },
      { amount: 520, type: "EXPENSE", category: "Food & Dining", description: "Dining out & food delivery", source: "WEB_MANUAL", date: new Date(2026, 5, 16) },
      { amount: 450, type: "EXPENSE", category: "Travel & Holiday", description: "Weekend road trip & hotel", source: "WEB_MANUAL", date: new Date(2026, 5, 25) },
    ];

    for (const tx of sampleTxs) {
      await prisma.transaction.create({ data: tx });
    }
  }

  console.log("Seeding completed successfully!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
