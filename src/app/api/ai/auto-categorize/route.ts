import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db, transactions, categories } from "@/db";
import { eq, and, isNull } from "drizzle-orm";
import { askGroq } from "@/lib/groq";

export async function POST() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id!;

  const uncategorized = await db
    .select({ id: transactions.id, description: transactions.description, type: transactions.type })
    .from(transactions)
    .where(and(eq(transactions.userId, userId), isNull(transactions.categoryId)))
    .limit(100);

  if (uncategorized.length === 0) {
    return NextResponse.json({ categorized: 0, message: "All transactions already categorized" });
  }

  const userCategories = await db
    .select({ id: categories.id, name: categories.name, type: categories.type })
    .from(categories)
    .where(eq(categories.userId, userId));

  const uniqueDescs = [...new Set(uncategorized.map(t => t.description))];

  const prompt = `You are a transaction categorizer. Match each description to the best category.

AVAILABLE CATEGORIES:
${userCategories.map(c => `- "${c.name}" (id: ${c.id}, type: ${c.type})`).join("\n")}

TRANSACTIONS TO CATEGORIZE:
${uniqueDescs.map((d, i) => `${i + 1}. "${d}"`).join("\n")}

RULES:
- Salary, bonus, income, freelance → income categories
- Food, dining, restaurant, grocery, Swiggy, Zomato, Uber Eats → Food & Dining
- Netflix, Spotify, cinema, games → Entertainment
- Uber, Ola, petrol, fuel, cab, transport → Transport
- Rent, electricity, water, phone bill, internet → Housing or Utilities
- Amazon, shopping, clothes, purchase → Shopping
- Gym, doctor, hospital, pharmacy, medical → Health
- Course, education, books, school → Education
- Salary, wages, paycheck → Salary
- Freelance, consulting, project payment → Freelance
- If genuinely no match → null

Respond ONLY with valid JSON no markdown:
{
  "mappings": [
    { "description": "<exact description text>", "categoryId": "<category id or null>" }
  ]
}`;

  const raw = await askGroq("You are a JSON-only transaction categorization system.", prompt, 2048);
  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) return NextResponse.json({ categorized: 0, message: "AI could not categorize" });

  const { mappings } = JSON.parse(match[0]);
  let categorized = 0;

  for (const mapping of mappings) {
    if (!mapping.categoryId) continue;
    const validCat = userCategories.find(c => c.id === mapping.categoryId);
    if (!validCat) continue;

    await db.update(transactions)
      .set({ categoryId: mapping.categoryId })
      .where(and(
        eq(transactions.userId, userId),
        eq(transactions.description, mapping.description),
        isNull(transactions.categoryId),
      ));
    categorized++;
  }

  return NextResponse.json({ categorized, total: uncategorized.length });
}