import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db, anomalyFeedback, transactions } from "@/db";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

const schema = z.object({
  transaction_id: z.string(),
  type: z.string(),
  user_verdict: z.enum(["confirmed", "false_alarm"]),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id!;
  const body = schema.parse(await req.json());

  // Verify the transaction belongs to this user
  const [tx] = await db.select({ id: transactions.id })
    .from(transactions)
    .where(and(eq(transactions.id, body.transaction_id), eq(transactions.userId, userId)))
    .limit(1);

  if (!tx) return NextResponse.json({ error: "Transaction not found" }, { status: 404 });

  await db.insert(anomalyFeedback).values({
    userId,
    transactionId: body.transaction_id,
    type: body.type,
    userVerdict: body.user_verdict,
  });

  return NextResponse.json({ success: true });
}
