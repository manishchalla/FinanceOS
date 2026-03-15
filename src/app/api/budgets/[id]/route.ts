import { NextRequest, NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";
import { auth } from "@/auth";
import { db, budgets } from "@/db";

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await db.delete(budgets).where(and(eq(budgets.id, params.id), eq(budgets.userId, session.user.id!)));
  return NextResponse.json({ success: true });
}
