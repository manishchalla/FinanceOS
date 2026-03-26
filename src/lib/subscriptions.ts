export type SubscriptionTx = {
  description: string;
  amount: number;
  date: string; // yyyy-MM-dd
  type?: string;
};

export type RecurringSubscription = {
  description: string;
  monthlyAmount: number;
  months: number;
  occurrences: number;
  lastSeen: string;
};

function normalizeDescription(description: string): string {
  return description.trim().toLowerCase().replace(/\s+/g, " ");
}

function monthKey(date: string): string {
  return date.slice(0, 7);
}

function amountsAreSimilar(a: number, b: number): boolean {
  if (a === 0 && b === 0) return true;
  const maxAbs = Math.max(Math.abs(a), Math.abs(b), 1);
  return Math.abs(a - b) / maxAbs <= 0.1; // within 10%
}

/**
 * Detect recurring subscriptions by finding same normalized description
 * with similar monthly amounts across >= 2 consecutive months.
 */
export function detectRecurring(transactions: SubscriptionTx[]): RecurringSubscription[] {
  const expenseTx = transactions
    .filter(t => (t.type ? t.type === "expense" : true))
    .filter(t => t.amount > 0)
    .map(t => ({ ...t, normalized: normalizeDescription(t.description) }))
    .filter(t => t.normalized.length > 0);

  const byDescription = new Map<string, typeof expenseTx>();
  for (const tx of expenseTx) {
    const arr = byDescription.get(tx.normalized) ?? [];
    arr.push(tx);
    byDescription.set(tx.normalized, arr);
  }

  const subscriptions: RecurringSubscription[] = [];

  for (const [, txs] of byDescription) {
    const perMonth = new Map<string, number[]>();
    for (const tx of txs) {
      const key = monthKey(tx.date);
      const arr = perMonth.get(key) ?? [];
      arr.push(tx.amount);
      perMonth.set(key, arr);
    }

    const months = [...perMonth.keys()].sort();
    if (months.length < 2) continue;

    let bestStreak = 1;
    let currentStreak = 1;
    let currentAmount = perMonth.get(months[0])?.[0] ?? 0;

    for (let i = 1; i < months.length; i++) {
      const prev = months[i - 1];
      const next = months[i];

      const [py, pm] = prev.split("-").map(Number);
      const prevDate = new Date(py, pm - 1, 1);
      const expectedNext = new Date(prevDate.getFullYear(), prevDate.getMonth() + 1, 1);
      const expectedNextKey = `${expectedNext.getFullYear()}-${String(expectedNext.getMonth() + 1).padStart(2, "0")}`;

      const nextAmounts = perMonth.get(next) ?? [];
      const hasSimilar = nextAmounts.some(a => amountsAreSimilar(a, currentAmount));

      if (next === expectedNextKey && hasSimilar) {
        currentStreak += 1;
        currentAmount = nextAmounts[0] ?? currentAmount;
      } else {
        bestStreak = Math.max(bestStreak, currentStreak);
        currentStreak = 1;
        currentAmount = nextAmounts[0] ?? 0;
      }
    }
    bestStreak = Math.max(bestStreak, currentStreak);

    if (bestStreak < 2) continue;

    const amounts = txs.map(t => t.amount);
    const monthlyAmount = amounts.reduce((a, b) => a + b, 0) / amounts.length;
    const sortedByDate = [...txs].sort((a, b) => a.date.localeCompare(b.date));
    const lastSeen = sortedByDate[sortedByDate.length - 1]?.date ?? "";
    const displayDescription = sortedByDate[sortedByDate.length - 1]?.description ?? txs[0].description;

    subscriptions.push({
      description: displayDescription,
      monthlyAmount,
      months: bestStreak,
      occurrences: txs.length,
      lastSeen,
    });
  }

  return subscriptions.sort((a, b) => b.monthlyAmount - a.monthlyAmount);
}

