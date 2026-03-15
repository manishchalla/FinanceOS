import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { auth } from "@/auth";
import { db, budgets } from "@/db";

const schema = z.object({
  name: z.string().min(1),
  categoryId: z.string().optional().nullable(),
  amount: z.number().positive(),
  period: z.enum(["monthly","weekly","yearly"]).default("monthly"),
  startDate: z.string(),
});

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json(await db.select().from(budgets).where(eq(budgets.userId, session.user.id!)));
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = schema.parse(await req.json());
  const [b] = await db.insert(budgets).values({ ...body, userId: session.user.id! }).returning();
  return NextResponse.json(b, { status: 201 });
}
