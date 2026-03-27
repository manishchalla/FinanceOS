import type { RecurringSubscription } from "./subscriptions";

export type SpendableBreakdown = {
  incomeThisMonth: number;
  committedBills: number;
  savingsGoal: number;
  alreadySpent: number;
  trueDiscretionary: number;
  dailySpendable: number;
  daysRemaining: number;
  status: "green" | "amber" | "red";
};

export function computeDailySpendable(
  incomeThisMonth: number,
  expensesThisMonth: number,
  recurringSubscriptions: RecurringSubscription[],
  totalBalance: number,
  daysInMonth: number,
  dayOfMonth: number,
): SpendableBreakdown {
  const daysRemaining = Math.max(1, daysInMonth - dayOfMonth + 1);
  const committedBills = recurringSubscriptions.reduce((s, r) => s + r.monthlyAmount, 0);
  // Simple savings goal: 10% of income
  const savingsGoal = incomeThisMonth * 0.10;
  const trueDiscretionary = Math.max(0, incomeThisMonth - committedBills - savingsGoal - expensesThisMonth);
  const dailySpendable = trueDiscretionary / daysRemaining;

  const status = dailySpendable > 50 ? "green" : dailySpendable > 10 ? "amber" : "red";

  return {
    incomeThisMonth,
    committedBills,
    savingsGoal,
    alreadySpent: expensesThisMonth,
    trueDiscretionary,
    dailySpendable,
    daysRemaining,
    status,
  };
}
