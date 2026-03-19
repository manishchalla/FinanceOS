import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { db, users, categories } from "@/db";

const schema = z.object({ name: z.string().min(2), email: z.string().email(), password: z.string().min(6) });

async function seedCategories(userId: string) {
  const defaults = [
    { name: "Salary", icon: "💼", color: "#22c55e", type: "income" as const },
    { name: "Freelance", icon: "💻", color: "#3b82f6", type: "income" as const },
    { name: "Investment", icon: "📈", color: "#8b5cf6", type: "income" as const },
    { name: "Food & Dining", icon: "🍔", color: "#f97316", type: "expense" as const },
    { name: "Transport", icon: "🚗", color: "#0284c7", type: "expense" as const },
    { name: "Shopping", icon: "🛍️", color: "#ec4899", type: "expense" as const },
    { name: "Housing", icon: "🏠", color: "#14b8a6", type: "expense" as const },
    { name: "Health", icon: "⚕️", color: "#ef4444", type: "expense" as const },
    { name: "Entertainment", icon: "🎬", color: "#f59e0b", type: "expense" as const },
    { name: "Education", icon: "📚", color: "#0ea5e9", type: "expense" as const },
    { name: "Utilities", icon: "💡", color: "#78716c", type: "expense" as const },
    { name: "Transfer", icon: "🔄", color: "#a3a3a3", type: "both" as const },
  ];
  await db.insert(categories).values(defaults.map((c) => ({ ...c, userId })));
}

export async function POST(req: NextRequest) {
  try {
    const body = schema.parse(await req.json());
    const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.email, body.email)).limit(1);
    if (existing) return NextResponse.json({ error: "Email already in use" }, { status: 409 });
    const hashed = await bcrypt.hash(body.password, 12);
    const [user] = await db.insert(users).values({ name: body.name, email: body.email, password: hashed }).returning({ id: users.id });
    await seedCategories(user.id);
    return NextResponse.json({ success: true }, { status: 201 });
  } catch (e) {
    if (e instanceof z.ZodError) return NextResponse.json({ error: e.errors }, { status: 400 });
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}