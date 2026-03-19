import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db, chatHistory } from "@/db";
import { eq, asc } from "drizzle-orm";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const history = await db
    .select({ role: chatHistory.role, content: chatHistory.content })
    .from(chatHistory)
    .where(eq(chatHistory.userId, session.user.id!))
    .orderBy(asc(chatHistory.createdAt))
    .limit(40);

  return NextResponse.json(history);
}