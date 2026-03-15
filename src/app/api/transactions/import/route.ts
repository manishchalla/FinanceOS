import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { db, transactions, accounts } from "@/db";
import { eq, sql, and } from "drizzle-orm";

const rowSchema = z.object({
  accountId: z.string(),
  categoryId: z.string().nullable().optional(),
  amount: z.number().positive(),
  type: z.enum(["income","expense","transfer"]),
  description: z.string().min(1),
  date: z.string(),
  notes: z.string().optional().nullable(),
});

const importSchema = z.object({
  rows: z.array(rowSchema).min(1).max(500),
});

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const userId = session.user.id!;
    const body = importSchema.parse(await req.json());

    // Validate that all accountIds actually belong to this user
    const uniqueAccountIds = [...new Set(body.rows.map(r => r.accountId))];
    const userAccounts = await db
      .select({ id: accounts.id })
      .from(accounts)
      .where(eq(accounts.userId, userId));

    const validAccountIds = new Set(userAccounts.map(a => a.id));

    const invalidIds = uniqueAccountIds.filter(id => !validAccountIds.has(id));
    if (invalidIds.length > 0) {
      return NextResponse.json(
        { error: `Invalid account ID(s): ${invalidIds.join(", ")}. Make sure you have at least one account created.` },
        { status: 400 }
      );
    }

    // Insert in batches of 50 to avoid hitting SQLite limits
    const batchSize = 50;
    let totalInserted = 0;
    const balanceMap = new Map<string, number>();

    for (let i = 0; i < body.rows.length; i += batchSize) {
      const batch = body.rows.slice(i, i + batchSize);
      const inserted = await db.insert(transactions)
        .values(batch.map(r => ({ ...r, userId })))
        .returning({ id: transactions.id, accountId: transactions.accountId, amount: transactions.amount, type: transactions.type });

      totalInserted += inserted.length;

      for (const tx of inserted) {
        const delta = tx.type === "income" ? tx.amount : -tx.amount;
        balanceMap.set(tx.accountId, (balanceMap.get(tx.accountId) ?? 0) + delta);
      }
    }

    // Update account balances
    for (const [accountId, delta] of balanceMap) {
      await db.update(accounts)
        .set({ balance: sql`${accounts.balance} + ${delta}` })
        .where(and(eq(accounts.id, accountId), eq(accounts.userId, userId)));
    }

    return NextResponse.json({ imported: totalInserted });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid data format", details: err.errors }, { status: 400 });
    }
    console.error("Import error:", err);
    return NextResponse.json({ error: "Import failed: " + (err as Error).message }, { status: 500 });
  }
}
