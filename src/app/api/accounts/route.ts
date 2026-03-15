import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { auth } from "@/auth";
import { db, accounts } from "@/db";

const schema = z.object({
  name: z.string().min(1),
  type: z.enum(["checking","savings","credit","investment","cash"]),
  balance: z.number().default(0),
  currency: z.string().default("USD"),
  color: z.string().default("#6366f1"),
});

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const data = await db.select().from(accounts).where(eq(accounts.userId, session.user.id!));
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = schema.parse(await req.json());
  const [acc] = await db.insert(accounts).values({ ...body, userId: session.user.id! }).returning();
  return NextResponse.json(acc, { status: 201 });
}
