import { Transaction, MonthlyStats, YearlyStats } from "./types";
import { getCategoryMeta } from "./category-meta";
import { format, startOfYear, endOfYear, eachMonthOfInterval } from "date-fns";

export function computeMonthlyStats(
  transactions: Transaction[],
  yearMonth: string // "YYYY-MM"
): MonthlyStats {
  const [yearStr, monthStr] = yearMonth.split("-");
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10);

  const monthDate = new Date(year, month - 1, 1);
  const monthName = format(monthDate, "MMMM yyyy");
  const daysInMonth = new Date(year, month, 0).getDate();

  // Filter transactions for this month
  const monthTransactions = transactions.filter((t) => {
    const tDate = new Date(t.date);
    return (
      tDate.getFullYear() === year && tDate.getMonth() === month - 1
    );
  });

  let totalExpense = 0;
  let totalIncome = 0;
  const categoryMap: Record<string, { total: number; count: number }> = {};
  const dailyMap: Record<number, { expense: number; income: number }> = {};

  for (let d = 1; d <= daysInMonth; d++) {
    dailyMap[d] = { expense: 0, income: 0 };
  }

  monthTransactions.forEach((t) => {
    const d = new Date(t.date).getDate();
    if (t.type === "EXPENSE") {
      totalExpense += t.amount;
      if (!categoryMap[t.category]) {
        categoryMap[t.category] = { total: 0, count: 0 };
      }
      categoryMap[t.category].total += t.amount;
      categoryMap[t.category].count += 1;
      if (dailyMap[d]) dailyMap[d].expense += t.amount;
    } else {
      totalIncome += t.amount;
      if (dailyMap[d]) dailyMap[d].income += t.amount;
    }
  });

  const categoryBreakdown = Object.entries(categoryMap)
    .map(([cat, val]) => ({
      category: cat,
      total: Math.round(val.total * 100) / 100,
      percentage:
        totalExpense > 0
          ? Math.round((val.total / totalExpense) * 1000) / 10
          : 0,
      color: getCategoryMeta(cat).color,
      count: val.count,
    }))
    .sort((a, b) => b.total - a.total);

  const dailySpending = Object.entries(dailyMap).map(([day, val]) => ({
    day: parseInt(day, 10),
    date: `${yearMonth}-${String(day).padStart(2, "0")}`,
    expense: Math.round(val.expense * 100) / 100,
    income: Math.round(val.income * 100) / 100,
  }));

  const netSavings = totalIncome - totalExpense;
  const savingsRate =
    totalIncome > 0 ? Math.round((netSavings / totalIncome) * 1000) / 10 : 0;
  const dailyAverageSpend =
    daysInMonth > 0 ? Math.round((totalExpense / daysInMonth) * 100) / 100 : 0;

  return {
    month: yearMonth,
    monthName,
    totalExpense: Math.round(totalExpense * 100) / 100,
    totalIncome: Math.round(totalIncome * 100) / 100,
    netSavings: Math.round(netSavings * 100) / 100,
    savingsRate,
    dailyAverageSpend,
    transactionCount: monthTransactions.length,
    categoryBreakdown,
    dailySpending,
  };
}

export function computeYearlyStats(
  transactions: Transaction[],
  year: number
): YearlyStats {
  const yearDate = new Date(year, 0, 1);
  const months = eachMonthOfInterval({
    start: startOfYear(yearDate),
    end: endOfYear(yearDate),
  });

  const monthlyBreakdown = months.map((m, idx) => {
    const monthNum = idx + 1;
    const monthTransactions = transactions.filter((t) => {
      const tDate = new Date(t.date);
      return tDate.getFullYear() === year && tDate.getMonth() === idx;
    });

    let expense = 0;
    let income = 0;

    monthTransactions.forEach((t) => {
      if (t.type === "EXPENSE") expense += t.amount;
      else income += t.amount;
    });

    return {
      monthIndex: monthNum,
      monthName: format(m, "MMMM"),
      shortName: format(m, "MMM"),
      expense: Math.round(expense * 100) / 100,
      income: Math.round(income * 100) / 100,
      net: Math.round((income - expense) * 100) / 100,
    };
  });

  let totalExpense = 0;
  let totalIncome = 0;
  const categoryMap: Record<string, number> = {};

  transactions
    .filter((t) => new Date(t.date).getFullYear() === year)
    .forEach((t) => {
      if (t.type === "EXPENSE") {
        totalExpense += t.amount;
        categoryMap[t.category] = (categoryMap[t.category] || 0) + t.amount;
      } else {
        totalIncome += t.amount;
      }
    });

  const topExpenseCategories = Object.entries(categoryMap)
    .map(([cat, total]) => ({
      category: cat,
      total: Math.round(total * 100) / 100,
      percentage:
        totalExpense > 0 ? Math.round((total / totalExpense) * 1000) / 10 : 0,
      color: getCategoryMeta(cat).color,
    }))
    .sort((a, b) => b.total - a.total);

  const netSavings = totalIncome - totalExpense;
  const savingsRate =
    totalIncome > 0 ? Math.round((netSavings / totalIncome) * 1000) / 10 : 0;

  return {
    year,
    totalExpense: Math.round(totalExpense * 100) / 100,
    totalIncome: Math.round(totalIncome * 100) / 100,
    netSavings: Math.round(netSavings * 100) / 100,
    savingsRate,
    monthlyAverageExpense: Math.round((totalExpense / 12) * 100) / 100,
    monthlyAverageIncome: Math.round((totalIncome / 12) * 100) / 100,
    monthlyBreakdown,
    topExpenseCategories,
  };
}
