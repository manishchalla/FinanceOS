import Groq from "groq-sdk";

// Singleton Groq client
export const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

export const GROQ_MODEL = "llama-3.3-70b-versatile";

// Helper: call Groq and return text
export async function askGroq(systemPrompt: string, userMessage: string, maxTokens = 1024): Promise<string> {
  const completion = await groq.chat.completions.create({
    model: GROQ_MODEL,
    max_tokens: maxTokens,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userMessage },
    ],
  });
  return completion.choices[0]?.message?.content ?? "";
}
