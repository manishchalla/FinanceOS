import { NextRequest, NextResponse } from "next/server";
import { eq, and, sql } from "drizzle-orm";
import { z } from "zod";
import { auth } from "@/auth";
import { db, transactions, accounts } from "@/db";

const patchSchema = z.object({
  accountId: z.string().optional(),
  categoryId: z.string().nullable().optional(),
  amount: z.number().positive().optional(),
  type: z.enum(["income","expense","transfer"]).optional(),
  description: z.string().min(1).optional(),
  notes: z.string().nullable().optional(),
  date: z.string().optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [existing] = await db.select().from(transactions)
    .where(and(eq(transactions.id, params.id), eq(transactions.userId, session.user.id!)))
    .limit(1);
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = patchSchema.parse(await req.json());

  // If amount or type changed, reverse old balance effect and apply new one
  const amountChanged = body.amount !== undefined || body.type !== undefined;
  if (amountChanged) {
    const oldDelta = existing.type === "income" ? -existing.amount : existing.amount;
    await db.update(accounts).set({ balance: sql`${accounts.balance} + ${oldDelta}` }).where(eq(accounts.id, existing.accountId));
    const newAmount = body.amount ?? existing.amount;
    const newType = body.type ?? existing.type;
    const newDelta = newType === "income" ? newAmount : -newAmount;
    const targetAccountId = body.accountId ?? existing.accountId;
    await db.update(accounts).set({ balance: sql`${accounts.balance} + ${newDelta}` }).where(eq(accounts.id, targetAccountId));
  }

  const [updated] = await db.update(transactions).set(body).where(eq(transactions.id, params.id)).returning();
  return NextResponse.json(updated);
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [tx] = await db.select().from(transactions)
    .where(and(eq(transactions.id, params.id), eq(transactions.userId, session.user.id!)))
    .limit(1);
  if (!tx) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const delta = tx.type === "income" ? -tx.amount : tx.amount;
  await db.update(accounts).set({ balance: sql`${accounts.balance} + ${delta}` }).where(eq(accounts.id, tx.accountId));
  await db.delete(transactions).where(eq(transactions.id, params.id));
  return NextResponse.json({ success: true });
}
