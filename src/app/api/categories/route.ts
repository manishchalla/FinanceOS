import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { auth } from "@/auth";
import { db, categories } from "@/db";

const schema = z.object({
  name: z.string().min(1),
  icon: z.string().default("📦"),
  color: z.string().default("#6366f1"),
  type: z.enum(["income","expense","both"]).default("both"),
});

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json(await db.select().from(categories).where(eq(categories.userId, session.user.id!)));
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = schema.parse(await req.json());
  const [cat] = await db.insert(categories).values({ ...body, userId: session.user.id! }).returning();
  return NextResponse.json(cat, { status: 201 });
}
