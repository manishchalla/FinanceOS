export type LlmTx = {
  description: string;
  categoryName?: string | null;
};

function sanitizeCategory(input: string): string {
  return input
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

/**
 * Replace merchant/description values with stable anonymized tokens per category.
 * Example: MERCHANT_FOOD_1, MERCHANT_UTILITIES_2, ...
 */
export function anonymizeForLLM<T extends LlmTx>(transactions: T[]): T[] {
  const labelByKey = new Map<string, number>();
  const nextIndexByCategory = new Map<string, number>();

  const getIndex = (category: string, description: string): number => {
    const key = `${category}|||${description}`;
    const existing = labelByKey.get(key);
    if (existing) return existing;

    const next = (nextIndexByCategory.get(category) ?? 0) + 1;
    labelByKey.set(key, next);
    nextIndexByCategory.set(category, next);
    return next;
  };

  return transactions.map((tx) => {
    const catRaw = tx.categoryName ?? "UNCATEGORIZED";
    const category = sanitizeCategory(catRaw || "UNCATEGORIZED") || "UNCATEGORIZED";
    const idx = getIndex(category, tx.description);
    const anonymized = `MERCHANT_${category}_${idx}`;

    return { ...tx, description: anonymized };
  });
}

