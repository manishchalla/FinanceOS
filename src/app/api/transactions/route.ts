import { NextRequest, NextResponse } from "next/server";
import { eq, and, gte, lte, desc, sql } from "drizzle-orm";
import { z } from "zod";
import { auth } from "@/auth";
import { db, transactions, accounts, categories } from "@/db";

const schema = z.object({
  accountId: z.string(),
  categoryId: z.string().optional().nullable(),
  amount: z.number().positive(),
  type: z.enum(["income","expense","transfer"]),
  description: z.string().min(1),
  notes: z.string().optional().nullable(),
  date: z.string(),
});

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const from   = searchParams.get("from");
  const to     = searchParams.get("to");
  const type   = searchParams.get("type");
  const limit  = Math.min(parseInt(searchParams.get("limit")  ?? "500"), 1000);
  const offset = parseInt(searchParams.get("offset") ?? "0");

  const conditions = [eq(transactions.userId, session.user.id!)];
  if (from) conditions.push(gte(transactions.date, from));
  if (to)   conditions.push(lte(transactions.date, to));
  if (type && ["income","expense","transfer"].includes(type)) {
    conditions.push(eq(transactions.type, type as "income"|"expense"|"transfer"));
  }

  const data = await db.select({
    id: transactions.id,
    description: transactions.description,
    amount: transactions.amount,
    type: transactions.type,
    date: transactions.date,
    notes: transactions.notes,
    accountId: transactions.accountId,
    categoryId: transactions.categoryId,
    accountName: accounts.name,
    accountColor: accounts.color,
    catName: categories.name,
    catIcon: categories.icon,
    catColor: categories.color,
  })
  .from(transactions)
  .leftJoin(accounts, eq(transactions.accountId, accounts.id))
  .leftJoin(categories, eq(transactions.categoryId, categories.id))
  .where(and(...conditions))
  .orderBy(desc(transactions.date))
  .limit(limit)
  .offset(offset);

  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = schema.parse(await req.json());
  const [tx] = await db.insert(transactions)
    .values({ ...body, userId: session.user.id! })
    .returning();

  // Update account balance
  const delta = body.type === "income" ? body.amount : -body.amount;
  await db.update(accounts)
    .set({ balance: sql`${accounts.balance} + ${delta}` })
    .where(eq(accounts.id, body.accountId));

  return NextResponse.json(tx, { status: 201 });
}
