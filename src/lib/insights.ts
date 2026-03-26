export type InsightStatus = "green" | "amber" | "red";

function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function roundPct(pct: number): number {
  return Math.round(pct * 100);
}

/**
 * Compute a "trend vs average" using a percent of the historical average magnitude.
 *
 * Notes:
 * - For negative averages (e.g. net savings), we still treat "above average" as "less bad".
 * - We use Math.abs(average) for the denominator to keep the sign intuitive.
 */
export function getTrendVsAverage(current: number, average: number): {
  pct: number;
  trend: string;
  insight: string;
} {
  const denom = Math.abs(average);

  if (denom === 0) {
    // Not enough history to compute a meaningful percent. Keep it stable.
    if (current === 0) {
      return { pct: 0, trend: "+0% vs avg", insight: "0% above average" };
    }
    return { pct: 0, trend: "n/a", insight: "Insufficient history" };
  }

  const pct = (current - average) / denom;
  const pctRounded = roundPct(Math.abs(pct));
  const isAbove = current >= average;

  const trend = `${isAbove ? "+" : "-"}${pctRounded}% vs avg`;
  const insight = `${pctRounded}% ${isAbove ? "above" : "below"} average`;

  return { pct, trend, insight };
}

export function computeMonthStatus(
  trendPct: number,
  opts: { isGoodWhenHigher: boolean },
): InsightStatus {
  // Convert into "goodness" where positive means good.
  const effective = opts.isGoodWhenHigher ? trendPct : -trendPct;

  if (effective >= 0.15) return "green";
  if (effective <= -0.15) return "red";
  return "amber";
}

/**
 * Months remaining of liquidity given an average expense rate.
 *
 * Formula: months = totalLiquidAssets / avgMonthlyExpenses
 */
export function getCashRunway(avgMonthlyExpenses: number, totalLiquidAssets: number): {
  monthsRemaining: number;
  status: InsightStatus;
  insight: string;
} {
  if (avgMonthlyExpenses <= 0) {
    return {
      monthsRemaining: Infinity,
      status: "green",
      insight: "No expenses recorded (runway unknown)",
    };
  }

  const monthsRemaining = totalLiquidAssets / avgMonthlyExpenses;

  const status: InsightStatus =
    monthsRemaining >= 6 ? "green" : monthsRemaining >= 3 ? "amber" : "red";

  if (!Number.isFinite(monthsRemaining)) {
    return { monthsRemaining, status, insight: "Runway calculation not available" };
  }

  const rounded = Math.max(0, Math.round(monthsRemaining * 10) / 10);
  const monthsText = rounded === 1 ? "1 month" : `${rounded} months`;

  return {
    monthsRemaining,
    status,
    insight: `${monthsText} remaining`,
  };
}

// Small internal export for future tests/fixtures.
export const __private = { mean };

