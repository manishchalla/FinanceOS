import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db, categories } from "@/db";
import { eq } from "drizzle-orm";
import { askGroq } from "@/lib/groq";
import { z } from "zod";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id!;

  const { descriptions } = z.object({ descriptions: z.array(z.string()).min(1).max(20) }).parse(await req.json());

  const userCategories = await db.select({ id: categories.id, name: categories.name, type: categories.type })
    .from(categories).where(eq(categories.userId, userId));

  const prompt = `You are a bank transaction categorizer. Given transaction descriptions and a list of available categories, assign the best matching category to each transaction.

Available categories:
${userCategories.map(c => `- ID: ${c.id} | Name: ${c.name} | Type: ${c.type}`).join("\n")}

Transactions to categorize:
${descriptions.map((d, i) => `${i + 1}. "${d}"`).join("\n")}

Rules:
- Match to the most relevant category
- If income (salary, freelance, refund), use an income category
- If no good match exists, use null for categoryId
- Respond ONLY with valid JSON, no markdown

JSON format:
{
  "results": [
    { "description": "<original description>", "categoryId": "<id or null>", "categoryName": "<name or null>", "confidence": "high|medium|low" }
  ]
}`;

  const raw = await askGroq("You are a JSON-only transaction categorization system.", prompt, 1024);
  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) return NextResponse.json({ error: "AI response invalid" }, { status: 500 });

  const result = JSON.parse(match[0]);
  return NextResponse.json(result);
}
