import { NextRequest, NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import { auth } from "@/auth";
import { db, accounts } from "@/db";

const schema = z.object({
  name: z.string().min(1).optional(),
  type: z.enum(["checking","savings","credit","investment","cash"]).optional(),
  balance: z.number().optional(),
  color: z.string().optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = schema.parse(await req.json());
  const [acc] = await db.update(accounts).set(body).where(and(eq(accounts.id, params.id), eq(accounts.userId, session.user.id!))).returning();
  if (!acc) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(acc);
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await db.delete(accounts).where(and(eq(accounts.id, params.id), eq(accounts.userId, session.user.id!)));
  return NextResponse.json({ success: true });
}
