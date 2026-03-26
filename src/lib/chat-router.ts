export type ChatIntent = "data" | "planning" | "ambiguous";

function hasAnyKeyword(query: string, keywords: string[]): boolean {
  return keywords.some(k => query.includes(k));
}

function hasAnyRegex(query: string, patterns: RegExp[]): boolean {
  return patterns.some(p => p.test(query));
}

/**
 * Fast, zero-latency intent classifier.
 * Rules:
 * - "data": totals/averages/transactions/balance/history queries
 * - "planning": what-if/forecast/can-I-afford/save/reduce/project/goal queries
 * - everything else => "ambiguous"
 */
export function classifyIntent(query: string): ChatIntent {
  const q = query.toLowerCase();

  // Data keywords
  const dataPhrases = [
    "how much",
    "total",
    "last month",
    "average",
    "spent on",
    "transactions",
    "balance",
    "history",
  ];

  const dataRegexes = [
    /\b(income|expenses|spending)\b/i,
    /\b(net savings|savings rate)\b/i,
    /\b(monthly)\b/i,
  ];

  // Planning keywords
  const planningPhrases = [
    "what if",
    "should i",
    "can i afford",
    "project",
    "forecast",
    "goal",
    "save",
    "reduce",
    "subscription",
  ];

  const planningRegexes = [
    /\b(afford)\b/i,
    /\b(plan|budget)\b/i,
    /\b(should)\b/i,
    /\b(forecast)\b/i,
  ];

  if (hasAnyKeyword(q, planningPhrases) || hasAnyRegex(q, planningRegexes)) {
    return "planning";
  }

  if (hasAnyKeyword(q, dataPhrases) || hasAnyRegex(q, dataRegexes)) {
    return "data";
  }

  return "ambiguous";
}

