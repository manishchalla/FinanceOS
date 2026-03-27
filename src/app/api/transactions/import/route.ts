import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { db, transactions, accounts } from "@/db";
import { eq, sql, and, inArray } from "drizzle-orm";

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
  rows: z.array(rowSchema).min(1).max(5000), // raised from 500 to 5000
});

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const userId = session.user.id!;
    const body = importSchema.parse(await req.json());

    const uniqueAccountIds = [...new Set(body.rows.map(r => r.accountId))];
    const userAccounts = await db.select({ id: accounts.id })
      .from(accounts).where(eq(accounts.userId, userId));
    const validAccountIds = new Set(userAccounts.map(a => a.id));
    const invalidIds = uniqueAccountIds.filter(id => !validAccountIds.has(id));
    if (invalidIds.length > 0) {
      return NextResponse.json({ error: "Invalid account IDs" }, { status: 400 });
    }

    // Process in batches of 200
    const CHUNK = 200;
    let totalImported = 0;
    for (let i = 0; i < body.rows.length; i += CHUNK) {
      const chunk = body.rows.slice(i, i + CHUNK);
      const rows = chunk.map(r => ({
        userId,
        accountId: r.accountId,
        categoryId: r.categoryId ?? null,
        amount: r.amount,
        type: r.type,
        description: r.description,
        date: r.date,
        notes: r.notes ?? null,
      }));
      await db.insert(transactions).values(rows);

      // Update account balances for this chunk
      const balanceDeltas: Record<string, number> = {};
      for (const r of chunk) {
        const delta = r.type === "income" ? r.amount : r.type === "expense" ? -r.amount : 0;
        balanceDeltas[r.accountId] = (balanceDeltas[r.accountId] ?? 0) + delta;
      }
      for (const [accountId, delta] of Object.entries(balanceDeltas)) {
        if (delta !== 0) {
          await db.update(accounts)
            .set({ balance: sql`${accounts.balance} + ${delta}` })
            .where(and(eq(accounts.id, accountId), eq(accounts.userId, userId)));
        }
      }
      totalImported += chunk.length;
    }

    return NextResponse.json({ imported: totalImported });
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: "Invalid data", details: err.errors }, { status: 400 });
    console.error("Import error:", err);
    return NextResponse.json({ error: "Import failed" }, { status: 500 });
  }
}
