import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db, accounts, transactions, categories } from "@/db";
import { eq } from "drizzle-orm";
import { format, subDays } from "date-fns";

export async function POST() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id!;

  const existing = await db.select({ id: accounts.id }).from(accounts).where(eq(accounts.userId, userId));
  if (existing.length > 0) {
    return NextResponse.json({ error: "already_has_accounts" }, { status: 400 });
  }

  const [checking] = await db.insert(accounts).values({
    userId, name: "Main Checking", type: "checking", balance: 0, color: "#22c55e",
  }).returning();
  const [savings] = await db.insert(accounts).values({
    userId, name: "Savings", type: "savings", balance: 0, color: "#3b82f6",
  }).returning();

  const userCategories = await db.select().from(categories).where(eq(categories.userId, userId));
  const getCat = (name: string) => userCategories.find(c => c.name === name)?.id ?? null;

  const txData = [
    { accountId: checking.id, amount: 5000,  type: "income"  as const, description: "Monthly Salary",         categoryId: getCat("Salary"),         date: format(subDays(new Date(), 30), "yyyy-MM-dd") },
    { accountId: checking.id, amount: 5000,  type: "income"  as const, description: "Monthly Salary",         categoryId: getCat("Salary"),         date: format(subDays(new Date(), 1),  "yyyy-MM-dd") },
    { accountId: checking.id, amount: 1200,  type: "income"  as const, description: "Freelance - Web Project", categoryId: getCat("Freelance"),      date: format(subDays(new Date(), 20), "yyyy-MM-dd") },
    { accountId: savings.id,  amount: 500,   type: "income"  as const, description: "Interest Income",        categoryId: getCat("Investment"),      date: format(subDays(new Date(), 15), "yyyy-MM-dd") },
    { accountId: checking.id, amount: 1200,  type: "expense" as const, description: "Rent Payment",           categoryId: getCat("Housing"),         date: format(subDays(new Date(), 28), "yyyy-MM-dd") },
    { accountId: checking.id, amount: 1200,  type: "expense" as const, description: "Rent Payment",           categoryId: getCat("Housing"),         date: format(subDays(new Date(), 1),  "yyyy-MM-dd") },
    { accountId: checking.id, amount: 89,    type: "expense" as const, description: "Weekly Groceries",       categoryId: getCat("Food & Dining"),   date: format(subDays(new Date(), 3),  "yyyy-MM-dd") },
    { accountId: checking.id, amount: 45,    type: "expense" as const, description: "Uber Eats",              categoryId: getCat("Food & Dining"),   date: format(subDays(new Date(), 5),  "yyyy-MM-dd") },
    { accountId: checking.id, amount: 120,   type: "expense" as const, description: "Electricity Bill",       categoryId: getCat("Utilities"),       date: format(subDays(new Date(), 10), "yyyy-MM-dd") },
    { accountId: checking.id, amount: 15.99, type: "expense" as const, description: "Netflix",                categoryId: getCat("Entertainment"),   date: format(subDays(new Date(), 12), "yyyy-MM-dd") },
    { accountId: checking.id, amount: 49.99, type: "expense" as const, description: "Gym Membership",         categoryId: getCat("Health"),          date: format(subDays(new Date(), 14), "yyyy-MM-dd") },
    { accountId: checking.id, amount: 35,    type: "expense" as const, description: "Uber Ride",              categoryId: getCat("Transport"),       date: format(subDays(new Date(), 7),  "yyyy-MM-dd") },
    { accountId: checking.id, amount: 250,   type: "expense" as const, description: "Online Shopping",        categoryId: getCat("Shopping"),        date: format(subDays(new Date(), 9),  "yyyy-MM-dd") },
    { accountId: checking.id, amount: 8.50,  type: "expense" as const, description: "Coffee Shop",            categoryId: getCat("Food & Dining"),   date: format(subDays(new Date(), 2),  "yyyy-MM-dd") },
    { accountId: checking.id, amount: 60,    type: "expense" as const, description: "Internet Bill",          categoryId: getCat("Utilities"),       date: format(subDays(new Date(), 11), "yyyy-MM-dd") },
    { accountId: checking.id, amount: 199,   type: "expense" as const, description: "New Shoes",              categoryId: getCat("Shopping"),        date: format(subDays(new Date(), 18), "yyyy-MM-dd") },
    { accountId: checking.id, amount: 75,    type: "expense" as const, description: "Doctor Visit",           categoryId: getCat("Health"),          date: format(subDays(new Date(), 22), "yyyy-MM-dd") },
    { accountId: checking.id, amount: 12,    type: "expense" as const, description: "Spotify",                categoryId: getCat("Entertainment"),   date: format(subDays(new Date(), 25), "yyyy-MM-dd") },
    { accountId: checking.id, amount: 5000,  type: "income"  as const, description: "Monthly Salary",         categoryId: getCat("Salary"),         date: format(subDays(new Date(), 60), "yyyy-MM-dd") },
    { accountId: checking.id, amount: 1200,  type: "expense" as const, description: "Rent Payment",           categoryId: getCat("Housing"),         date: format(subDays(new Date(), 58), "yyyy-MM-dd") },
    { accountId: checking.id, amount: 320,   type: "expense" as const, description: "Groceries",              categoryId: getCat("Food & Dining"),   date: format(subDays(new Date(), 45), "yyyy-MM-dd") },
    { accountId: checking.id, amount: 500,   type: "expense" as const, description: "Flight Ticket",          categoryId: getCat("Transport"),       date: format(subDays(new Date(), 40), "yyyy-MM-dd") },
  ];

  await db.insert(transactions).values(txData.map(t => ({ ...t, userId })));

  const checkingBal = txData.filter(t => t.accountId === checking.id).reduce((s, t) => s + (t.type === "income" ? t.amount : -t.amount), 0);
  const savingsBal  = txData.filter(t => t.accountId === savings.id).reduce((s, t) => s + (t.type === "income" ? t.amount : -t.amount), 0);

  await db.update(accounts).set({ balance: checkingBal }).where(eq(accounts.id, checking.id));
  await db.update(accounts).set({ balance: savingsBal }).where(eq(accounts.id, savings.id));

  return NextResponse.json({ success: true, accounts: 2, transactions: txData.length });
}
