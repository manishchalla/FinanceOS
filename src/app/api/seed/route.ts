import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db, accounts, categories, transactions } from "@/db";
import { eq, sql } from "drizzle-orm";

export async function POST() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id!;

  // Get user's first account and categories
  const userAccounts = await db.select().from(accounts).where(eq(accounts.userId, userId));
  const userCategories = await db.select().from(categories).where(eq(categories.userId, userId));

  if (userAccounts.length === 0) {
    return NextResponse.json({ error: "Create at least one account first" }, { status: 400 });
  }

  const accountId = userAccounts[0].id;

  const getCat = (name: string) => userCategories.find(c => c.name.toLowerCase().includes(name.toLowerCase()))?.id ?? null;

  const salaryId     = getCat("salary");
  const freelanceId  = getCat("freelance");
  const foodId       = getCat("food");
  const transportId  = getCat("transport");
  const shoppingId   = getCat("shopping");
  const housingId    = getCat("housing");
  const healthId     = getCat("health");
  const entertainId  = getCat("entertainment");
  const utilitiesId  = getCat("utilities");
  const educationId  = getCat("education");

  // 6 months of realistic data
  const txData = [
    // ── October 2025 ──────────────────────────────
    { date: "2025-10-01", description: "Monthly Salary", amount: 5000, type: "income",   categoryId: salaryId },
    { date: "2025-10-02", description: "House Rent",     amount: 1200, type: "expense",  categoryId: housingId },
    { date: "2025-10-03", description: "Electricity Bill",amount: 95,  type: "expense",  categoryId: utilitiesId },
    { date: "2025-10-04", description: "Grocery Store",  amount: 210,  type: "expense",  categoryId: foodId },
    { date: "2025-10-06", description: "Uber Eats",      amount: 38,   type: "expense",  categoryId: foodId },
    { date: "2025-10-08", description: "Netflix",        amount: 16,   type: "expense",  categoryId: entertainId },
    { date: "2025-10-10", description: "Gym Membership", amount: 50,   type: "expense",  categoryId: healthId },
    { date: "2025-10-12", description: "Amazon Purchase",amount: 89,   type: "expense",  categoryId: shoppingId },
    { date: "2025-10-14", description: "Petrol",         amount: 60,   type: "expense",  categoryId: transportId },
    { date: "2025-10-16", description: "Coffee Shop",    amount: 22,   type: "expense",  categoryId: foodId },
    { date: "2025-10-18", description: "Freelance Project",amount: 800,type: "income",   categoryId: freelanceId },
    { date: "2025-10-20", description: "Phone Bill",     amount: 45,   type: "expense",  categoryId: utilitiesId },
    { date: "2025-10-22", description: "Dining Out",     amount: 65,   type: "expense",  categoryId: foodId },
    { date: "2025-10-25", description: "Clothes Shopping",amount: 120, type: "expense",  categoryId: shoppingId },
    { date: "2025-10-28", description: "Uber Cab",       amount: 18,   type: "expense",  categoryId: transportId },

    // ── November 2025 ─────────────────────────────
    { date: "2025-11-01", description: "Monthly Salary", amount: 5000, type: "income",   categoryId: salaryId },
    { date: "2025-11-02", description: "House Rent",     amount: 1200, type: "expense",  categoryId: housingId },
    { date: "2025-11-03", description: "Electricity Bill",amount: 110, type: "expense",  categoryId: utilitiesId },
    { date: "2025-11-04", description: "Grocery Store",  amount: 195,  type: "expense",  categoryId: foodId },
    { date: "2025-11-06", description: "Swiggy Order",   amount: 42,   type: "expense",  categoryId: foodId },
    { date: "2025-11-08", description: "Netflix",        amount: 16,   type: "expense",  categoryId: entertainId },
    { date: "2025-11-09", description: "Spotify",        amount: 10,   type: "expense",  categoryId: entertainId },
    { date: "2025-11-10", description: "Gym Membership", amount: 50,   type: "expense",  categoryId: healthId },
    { date: "2025-11-12", description: "Online Course",  amount: 199,  type: "expense",  categoryId: educationId },
    { date: "2025-11-14", description: "Petrol",         amount: 55,   type: "expense",  categoryId: transportId },
    { date: "2025-11-15", description: "Freelance Project",amount: 1200,type:"income",   categoryId: freelanceId },
    { date: "2025-11-18", description: "Phone Bill",     amount: 45,   type: "expense",  categoryId: utilitiesId },
    { date: "2025-11-20", description: "Doctor Visit",   amount: 80,   type: "expense",  categoryId: healthId },
    { date: "2025-11-22", description: "Dining Out",     amount: 55,   type: "expense",  categoryId: foodId },
    { date: "2025-11-26", description: "Black Friday Shopping",amount: 340,type:"expense",categoryId: shoppingId },
    { date: "2025-11-28", description: "Uber Cab",       amount: 25,   type: "expense",  categoryId: transportId },

    // ── December 2025 ─────────────────────────────
    { date: "2025-12-01", description: "Monthly Salary", amount: 5000, type: "income",   categoryId: salaryId },
    { date: "2025-12-01", description: "Year End Bonus", amount: 2000, type: "income",   categoryId: salaryId },
    { date: "2025-12-02", description: "House Rent",     amount: 1200, type: "expense",  categoryId: housingId },
    { date: "2025-12-03", description: "Electricity Bill",amount: 130, type: "expense",  categoryId: utilitiesId },
    { date: "2025-12-05", description: "Grocery Store",  amount: 280,  type: "expense",  categoryId: foodId },
    { date: "2025-12-07", description: "Zomato",         amount: 55,   type: "expense",  categoryId: foodId },
    { date: "2025-12-08", description: "Netflix",        amount: 16,   type: "expense",  categoryId: entertainId },
    { date: "2025-12-10", description: "Gym Membership", amount: 50,   type: "expense",  categoryId: healthId },
    { date: "2025-12-12", description: "Christmas Gifts",amount: 450,  type: "expense",  categoryId: shoppingId },
    { date: "2025-12-14", description: "Petrol",         amount: 70,   type: "expense",  categoryId: transportId },
    { date: "2025-12-15", description: "Freelance Project",amount: 950,type: "income",   categoryId: freelanceId },
    { date: "2025-12-18", description: "Phone Bill",     amount: 45,   type: "expense",  categoryId: utilitiesId },
    { date: "2025-12-20", description: "Flight Tickets", amount: 380,  type: "expense",  categoryId: transportId },
    { date: "2025-12-22", description: "Holiday Dining", amount: 145,  type: "expense",  categoryId: foodId },
    { date: "2025-12-24", description: "Hotel Stay",     amount: 220,  type: "expense",  categoryId: entertainId },
    { date: "2025-12-28", description: "New Year Party", amount: 95,   type: "expense",  categoryId: entertainId },

    // ── January 2026 ──────────────────────────────
    { date: "2026-01-01", description: "Monthly Salary", amount: 5000, type: "income",   categoryId: salaryId },
    { date: "2026-01-02", description: "House Rent",     amount: 1200, type: "expense",  categoryId: housingId },
    { date: "2026-01-03", description: "Electricity Bill",amount: 105, type: "expense",  categoryId: utilitiesId },
    { date: "2026-01-05", description: "Grocery Store",  amount: 220,  type: "expense",  categoryId: foodId },
    { date: "2026-01-07", description: "Uber Eats",      amount: 35,   type: "expense",  categoryId: foodId },
    { date: "2026-01-08", description: "Netflix",        amount: 16,   type: "expense",  categoryId: entertainId },
    { date: "2026-01-10", description: "Gym Membership", amount: 50,   type: "expense",  categoryId: healthId },
    { date: "2026-01-12", description: "Amazon Purchase",amount: 145,  type: "expense",  categoryId: shoppingId },
    { date: "2026-01-14", description: "Petrol",         amount: 58,   type: "expense",  categoryId: transportId },
    { date: "2026-01-15", description: "Freelance Project",amount: 1500,type:"income",   categoryId: freelanceId },
    { date: "2026-01-18", description: "Phone Bill",     amount: 45,   type: "expense",  categoryId: utilitiesId },
    { date: "2026-01-20", description: "Dining Out",     amount: 72,   type: "expense",  categoryId: foodId },
    // Anomaly: unusually high shopping in Jan
    { date: "2026-01-22", description: "iPhone Purchase",amount: 999,  type: "expense",  categoryId: shoppingId },
    { date: "2026-01-25", description: "Coffee Shop",    amount: 18,   type: "expense",  categoryId: foodId },
    // Anomaly: duplicate Netflix charge
    { date: "2026-01-28", description: "Netflix",        amount: 16,   type: "expense",  categoryId: entertainId },
    { date: "2026-01-29", description: "Medical Bill",   amount: 180,  type: "expense",  categoryId: healthId },

    // ── February 2026 ─────────────────────────────
    { date: "2026-02-01", description: "Monthly Salary", amount: 5000, type: "income",   categoryId: salaryId },
    { date: "2026-02-02", description: "House Rent",     amount: 1200, type: "expense",  categoryId: housingId },
    { date: "2026-02-03", description: "Electricity Bill",amount: 98,  type: "expense",  categoryId: utilitiesId },
    { date: "2026-02-05", description: "Grocery Store",  amount: 205,  type: "expense",  categoryId: foodId },
    { date: "2026-02-07", description: "Swiggy Order",   amount: 40,   type: "expense",  categoryId: foodId },
    { date: "2026-02-08", description: "Netflix",        amount: 16,   type: "expense",  categoryId: entertainId },
    { date: "2026-02-10", description: "Gym Membership", amount: 50,   type: "expense",  categoryId: healthId },
    { date: "2026-02-12", description: "Valentines Dinner",amount: 120,type: "expense",  categoryId: foodId },
    { date: "2026-02-14", description: "Petrol",         amount: 62,   type: "expense",  categoryId: transportId },
    { date: "2026-02-15", description: "Freelance Project",amount: 1100,type:"income",   categoryId: freelanceId },
    { date: "2026-02-18", description: "Phone Bill",     amount: 45,   type: "expense",  categoryId: utilitiesId },
    { date: "2026-02-20", description: "Online Course",  amount: 89,   type: "expense",  categoryId: educationId },
    { date: "2026-02-22", description: "Dining Out",     amount: 58,   type: "expense",  categoryId: foodId },
    { date: "2026-02-25", description: "Amazon Purchase",amount: 75,   type: "expense",  categoryId: shoppingId },
    { date: "2026-02-27", description: "Uber Cab",       amount: 22,   type: "expense",  categoryId: transportId },

    // ── March 2026 ────────────────────────────────
    { date: "2026-03-01", description: "Monthly Salary", amount: 5000, type: "income",   categoryId: salaryId },
    { date: "2026-03-02", description: "House Rent",     amount: 1200, type: "expense",  categoryId: housingId },
    { date: "2026-03-03", description: "Electricity Bill",amount: 88,  type: "expense",  categoryId: utilitiesId },
    { date: "2026-03-05", description: "Grocery Store",  amount: 198,  type: "expense",  categoryId: foodId },
    { date: "2026-03-07", description: "Uber Eats",      amount: 44,   type: "expense",  categoryId: foodId },
    { date: "2026-03-08", description: "Netflix",        amount: 16,   type: "expense",  categoryId: entertainId },
    { date: "2026-03-10", description: "Gym Membership", amount: 50,   type: "expense",  categoryId: healthId },
    // Anomaly: very high food spend in March
    { date: "2026-03-12", description: "Team Lunch Expense",amount: 320,type:"expense",  categoryId: foodId },
    { date: "2026-03-14", description: "Petrol",         amount: 65,   type: "expense",  categoryId: transportId },
    { date: "2026-03-15", description: "Freelance Project",amount: 2000,type:"income",   categoryId: freelanceId },
    { date: "2026-03-18", description: "Phone Bill",     amount: 45,   type: "expense",  categoryId: utilitiesId },
    { date: "2026-03-20", description: "Dining Out",     amount: 68,   type: "expense",  categoryId: foodId },
    { date: "2026-03-22", description: "Amazon Purchase",amount: 110,  type: "expense",  categoryId: shoppingId },
    { date: "2026-03-25", description: "Coffee Shop",    amount: 20,   type: "expense",  categoryId: foodId },
    { date: "2026-03-28", description: "Uber Cab",       amount: 28,   type: "expense",  categoryId: transportId },
  ];

  // Insert all transactions
  const inserted = await db.insert(transactions)
    .values(txData.map(t => ({ ...t, userId, accountId, type: t.type as "income"|"expense"|"transfer" })))
    .returning({ id: transactions.id, amount: transactions.amount, type: transactions.type });

  // Update account balance
  const delta = inserted.reduce((sum, t) => sum + (t.type === "income" ? t.amount : -t.amount), 0);
  await db.update(accounts).set({ balance: sql`${accounts.balance} + ${delta}` }).where(eq(accounts.id, accountId));

  return NextResponse.json({ success: true, inserted: inserted.length, balanceDelta: delta.toFixed(2) });
}
