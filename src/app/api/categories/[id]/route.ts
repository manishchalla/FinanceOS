import { NextRequest, NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import { auth } from "@/auth";
import { db, categories } from "@/db";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = z.object({ name: z.string().optional(), icon: z.string().optional(), color: z.string().optional(), type: z.enum(["income","expense","both"]).optional() }).parse(await req.json());
  const [cat] = await db.update(categories).set(body).where(and(eq(categories.id, params.id), eq(categories.userId, session.user.id!))).returning();
  return NextResponse.json(cat);
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await db.delete(categories).where(and(eq(categories.id, params.id), eq(categories.userId, session.user.id!)));
  return NextResponse.json({ success: true });
}
