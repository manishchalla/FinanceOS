import { NextRequest } from "next/server";
import { streamText } from "ai";
import { createGroq } from "@ai-sdk/groq";
import { auth } from "@/auth";
import { db, aiMemory, chatHistory, transactions, accounts } from "@/db";
import { eq, and, desc, sql, sum } from "drizzle-orm";
import {
  queryTransactionsTool,
  getSpendingSummaryTool,
  createBudgetTool,
  categorizeTool,
  saveMemoryTool,
  getAccountsTool,
} from "@/lib/ai-tools";
import { z } from "zod";

const groq = createGroq({ apiKey: process.env.GROQ_API_KEY });

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return new Response("Unauthorized", { status: 401 });
  const userId = session.user.id!;

  const { message } = z.object({ message: z.string().min(1) }).parse(await req.json());

  // Load memory, recent history, and quick financial snapshot in parallel
  const [memories, recentHistory, dateRange, userAccounts] = await Promise.all([
    db.select().from(aiMemory).where(eq(aiMemory.userId, userId)),
    db.select({ role: chatHistory.role, content: chatHistory.content })
      .from(chatHistory)
      .where(eq(chatHistory.userId, userId))
      .orderBy(desc(chatHistory.createdAt))
      .limit(20),
    db.select({
      latest:   sql<string>`max(${transactions.date})`,
      earliest: sql<string>`min(${transactions.date})`,
      txCount:  sql<number>`count(*)`,
    }).from(transactions).where(eq(transactions.userId, userId)),
    db.select().from(accounts).where(eq(accounts.userId, userId)),
  ]);

  const totalBalance = userAccounts.reduce((a, b) => a + b.balance, 0);
  const memoryText = memories.length > 0
    ? memories.map(m => `${m.key}: ${m.value}`).join("\n")
    : "No memories saved yet";

  const systemPrompt = `You are a personal finance AI assistant with access to the user's real financial data through tools.

WHAT YOU KNOW RIGHT NOW (without calling tools):
- Total balance across all accounts: $${totalBalance.toFixed(2)}
- Accounts: ${userAccounts.map(a => `${a.name} ($${a.balance.toFixed(2)})`).join(", ") || "none"}
- Transaction data from: ${dateRange[0]?.earliest ?? "N/A"} to ${dateRange[0]?.latest ?? "N/A"}
- Total transactions tracked: ${dateRange[0]?.txCount ?? 0}

WHAT YOU REMEMBER ABOUT THIS USER:
${memoryText}

TOOLS AVAILABLE:
- query_transactions: fetch transactions by date/type/keyword
- get_spending_summary: monthly income/expense breakdown
- create_budget: create a budget in the database
- categorize_transaction: assign categories to transactions
- save_memory: remember something about the user for next session
- get_accounts: current account balances

BEHAVIOR RULES:
- Use tools to get exact data before answering questions about amounts
- When user asks to DO something (create budget, categorize), use the tool and confirm it's done
- After creating something, tell the user exactly what was created
- Save important preferences to memory (savings goals, financial targets)
- Be concise — 2 to 4 sentences unless showing a breakdown
- Always use exact dollar amounts, never approximate
- If asked about a specific month, call get_spending_summary with that month's date range`;

  // Save user message to history
  await db.insert(chatHistory).values({ userId, role: "user", content: message });

  // Build conversation history (reversed since we fetched desc)
  const history = recentHistory.reverse().map(h => ({
    role: h.role as "user" | "assistant",
    content: h.content,
  }));

  const result = await streamText({
    model: groq("llama-3.3-70b-versatile"),
    system: systemPrompt,
    messages: [...history, { role: "user", content: message }],
    maxTokens: 600,
    maxSteps: 5, // Allow up to 5 tool calls per response
    tools: {
      query_transactions:   queryTransactionsTool(userId),
      get_spending_summary: getSpendingSummaryTool(userId),
      create_budget:        createBudgetTool(userId),
      categorize_transaction: categorizeTool(userId),
      save_memory:          saveMemoryTool(userId),
      get_accounts:         getAccountsTool(userId),
    },
    onFinish: async ({ text }) => {
      // Save assistant reply to persistent history
      if (text) {
        await db.insert(chatHistory).values({ userId, role: "assistant", content: text });
        // Keep only last 40 messages per user
        const allHistory = await db.select({ id: chatHistory.id })
          .from(chatHistory)
          .where(eq(chatHistory.userId, userId))
          .orderBy(desc(chatHistory.createdAt));
        if (allHistory.length > 40) {
          const toDelete = allHistory.slice(40).map(h => h.id);
          for (const id of toDelete) {
            await db.delete(chatHistory).where(eq(chatHistory.id, id));
          }
        }
      }
    },
  });

  return result.toDataStreamResponse();
}

// Clear chat history
export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session) return new Response("Unauthorized", { status: 401 });
  await db.delete(chatHistory).where(eq(chatHistory.userId, session.user.id!));
  return new Response(JSON.stringify({ success: true }), { status: 200 });
}