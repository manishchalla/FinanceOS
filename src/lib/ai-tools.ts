import { tool } from "ai";
import { z } from "zod";
import { db, transactions, accounts, categories, budgets, aiMemory, chatHistory } from "@/db";
import { eq, and, gte, lte, sql, sum, count, like } from "drizzle-orm";

// ─── Tool: Query Transactions ─────────────────────────────────────────────────
export const queryTransactionsTool = (userId: string) => tool({
  description: "Query the user's transactions. Use this when asked about spending, income, or specific transactions in a period.",
  parameters: z.object({
    from: z.string().optional().describe("Start date YYYY-MM-DD"),
    to:   z.string().optional().describe("End date YYYY-MM-DD"),
    type: z.enum(["income", "expense", "transfer"]).optional(),
    description: z.string().optional().describe("Filter by description keyword"),
    limit: z.number().optional().default(20),
  }),
  execute: async ({ from, to, type, description, limit = 20 }) => {
    const conditions: ReturnType<typeof eq>[] = [eq(transactions.userId, userId)];
    if (from) conditions.push(gte(transactions.date, from));
    if (to)   conditions.push(lte(transactions.date, to));
    if (type) conditions.push(eq(transactions.type, type));
    if (description) conditions.push(like(transactions.description, `%${description}%`));

    const rows = await db.select({
      date: transactions.date,
      description: transactions.description,
      amount: transactions.amount,
      type: transactions.type,
    }).from(transactions)
      .where(and(...conditions))
      .orderBy(sql`${transactions.date} DESC`)
      .limit(limit);

    const total = rows.reduce((a, r) => a + r.amount, 0);
    return { transactions: rows, total: total.toFixed(2), count: rows.length };
  },
});

// ─── Tool: Get Spending Summary ───────────────────────────────────────────────
export const getSpendingSummaryTool = (userId: string) => tool({
  description: "Get a monthly income/expense summary. Use when asked about totals, averages, or comparisons across months.",
  parameters: z.object({
    from: z.string().optional().describe("Start date YYYY-MM-DD"),
    to:   z.string().optional().describe("End date YYYY-MM-DD"),
  }),
  execute: async ({ from, to }) => {
    const conditions: ReturnType<typeof eq>[] = [eq(transactions.userId, userId)];
    if (from) conditions.push(gte(transactions.date, from));
    if (to)   conditions.push(lte(transactions.date, to));

    const monthly = await db.select({
      month: sql<string>`strftime('%Y-%m', ${transactions.date})`,
      type: transactions.type,
      total: sum(transactions.amount),
      txCount: count(),
    }).from(transactions)
      .where(and(...conditions))
      .groupBy(sql`strftime('%Y-%m', ${transactions.date})`, transactions.type)
      .orderBy(sql`strftime('%Y-%m', ${transactions.date})`);

    // Shape into per-month object
    const byMonth: Record<string, { income: number; expense: number; net: number }> = {};
    for (const r of monthly) {
      if (!byMonth[r.month]) byMonth[r.month] = { income: 0, expense: 0, net: 0 };
      if (r.type === "income")  byMonth[r.month].income  = Number(r.total ?? 0);
      if (r.type === "expense") byMonth[r.month].expense = Number(r.total ?? 0);
    }
    for (const m of Object.values(byMonth)) m.net = m.income - m.expense;

    const allMonths = Object.entries(byMonth).sort(([a], [b]) => a.localeCompare(b));
    const totalIncome  = allMonths.reduce((a, [, v]) => a + v.income,  0);
    const totalExpense = allMonths.reduce((a, [, v]) => a + v.expense, 0);

    return {
      months: allMonths.map(([month, v]) => ({ month, ...v })),
      totalIncome:   totalIncome.toFixed(2),
      totalExpense:  totalExpense.toFixed(2),
      totalNet:      (totalIncome - totalExpense).toFixed(2),
      avgIncome:     allMonths.length ? (totalIncome  / allMonths.length).toFixed(2) : "0",
      avgExpense:    allMonths.length ? (totalExpense / allMonths.length).toFixed(2) : "0",
    };
  },
});

// ─── Tool: Create Budget ──────────────────────────────────────────────────────
export const createBudgetTool = (userId: string) => tool({
  description: "Create a new budget for the user. Use when user asks to set a budget for a category or overall spending.",
  parameters: z.object({
    name:       z.string().describe("Budget name e.g. Food Budget"),
    amount:     z.number().positive().describe("Budget amount in dollars"),
    period:     z.enum(["monthly", "weekly", "yearly"]).default("monthly"),
    categoryName: z.string().optional().describe("Category name to link budget to"),
  }),
  execute: async ({ name, amount, period, categoryName }) => {
    let categoryId: string | null = null;

    if (categoryName) {
      const [cat] = await db.select({ id: categories.id })
        .from(categories)
        .where(and(eq(categories.userId, userId), like(categories.name, `%${categoryName}%`)))
        .limit(1);
      categoryId = cat?.id ?? null;
    }

    const startDate = new Date().toISOString().slice(0, 10);
    const [budget] = await db.insert(budgets)
      .values({ userId, name, amount, period, startDate, categoryId })
      .returning({ id: budgets.id, name: budgets.name, amount: budgets.amount });

    return { success: true, budget, message: `Created "${name}" budget for $${amount}/${period}` };
  },
});

// ─── Tool: Categorize Transaction ─────────────────────────────────────────────
export const categorizeTool = (userId: string) => tool({
  description: "Categorize one or more uncategorized transactions. Use when user asks to organize or categorize their transactions.",
  parameters: z.object({
    keyword:      z.string().describe("Description keyword to match transactions"),
    categoryName: z.string().describe("Category name to assign"),
  }),
  execute: async ({ keyword, categoryName }) => {
    const [cat] = await db.select({ id: categories.id, name: categories.name })
      .from(categories)
      .where(and(eq(categories.userId, userId), like(categories.name, `%${categoryName}%`)))
      .limit(1);

    if (!cat) return { success: false, message: `Category "${categoryName}" not found` };

    const result = await db.update(transactions)
      .set({ categoryId: cat.id })
      .where(and(
        eq(transactions.userId, userId),
        like(transactions.description, `%${keyword}%`),
      ));

    return { success: true, categoryAssigned: cat.name, message: `Updated transactions matching "${keyword}" to category "${cat.name}"` };
  },
});

// ─── Tool: Save Memory ────────────────────────────────────────────────────────
export const saveMemoryTool = (userId: string) => tool({
  description: "Save an important fact about the user to remember across sessions. Use when you learn something useful like their savings goal, preferred currency, or financial preferences.",
  parameters: z.object({
    key:   z.string().describe("Short identifier e.g. savings_goal, preferred_currency"),
    value: z.string().describe("The value to remember"),
  }),
  execute: async ({ key, value }) => {
    const existing = await db.select({ id: aiMemory.id })
      .from(aiMemory)
      .where(and(eq(aiMemory.userId, userId), eq(aiMemory.key, key)))
      .limit(1);

    if (existing.length > 0) {
      await db.update(aiMemory)
        .set({ value, updatedAt: sql`(datetime('now'))` })
        .where(and(eq(aiMemory.userId, userId), eq(aiMemory.key, key)));
    } else {
      await db.insert(aiMemory).values({ userId, key, value });
    }

    return { saved: true, key, value };
  },
});

// ─── Tool: Get Account Summary ────────────────────────────────────────────────
export const getAccountsTool = (userId: string) => tool({
  description: "Get the user's current account balances. Use when asked about total wealth, balance, or specific account details.",
  parameters: z.object({}),
  execute: async () => {
    const accs = await db.select().from(accounts).where(eq(accounts.userId, userId));
    const total = accs.reduce((a, b) => a + b.balance, 0);
    return {
      accounts: accs.map(a => ({ name: a.name, type: a.type, balance: a.balance })),
      totalBalance: total.toFixed(2),
    };
  },
});