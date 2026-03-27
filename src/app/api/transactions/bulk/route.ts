import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db, transactions, accounts } from "@/db";
import { eq, and, inArray, sql } from "drizzle-orm";
import { z } from "zod";

const schema = z.object({
  ids: z.array(z.string()).min(1).max(500),
  action: z.enum(["recategorize", "delete"]),
  categoryId: z.string().nullable().optional(),
});

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id!;
  const body = schema.parse(await req.json());

  // Verify all transactions belong to this user
  const owned = await db.select({ id: transactions.id, amount: transactions.amount, type: transactions.type, accountId: transactions.accountId })
    .from(transactions)
    .where(and(eq(transactions.userId, userId), inArray(transactions.id, body.ids)));

  if (owned.length === 0) return NextResponse.json({ error: "No matching transactions" }, { status: 404 });
  const ownedIds = owned.map(t => t.id);

  if (body.action === "recategorize") {
    await db.update(transactions)
      .set({ categoryId: body.categoryId ?? null })
      .where(and(eq(transactions.userId, userId), inArray(transactions.id, ownedIds)));
    return NextResponse.json({ updated: ownedIds.length });
  }

  if (body.action === "delete") {
    // Reverse balances for each deleted transaction
    for (const tx of owned) {
      const delta = tx.type === "income" ? -tx.amount : tx.type === "expense" ? tx.amount : 0;
      if (delta !== 0) {
        await db.update(accounts)
          .set({ balance: sql`${accounts.balance} + ${delta}` })
          .where(eq(accounts.id, tx.accountId));
      }
    }
    await db.delete(transactions)
      .where(and(eq(transactions.userId, userId), inArray(transactions.id, ownedIds)));
    return NextResponse.json({ deleted: ownedIds.length });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
