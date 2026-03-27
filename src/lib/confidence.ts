export type ConfidenceLevel = "HIGH" | "MEDIUM" | "LOW" | "UNKNOWN";

export type ConfidenceResult = {
  level: ConfidenceLevel;
  reason: string;
  txCount: number;
  daysOfHistory: number;
};

export function computeConfidence(txCount: number, daysOfHistory: number): ConfidenceResult {
  if (txCount === 0 || daysOfHistory === 0) {
    return { level: "UNKNOWN", reason: "No transactions found", txCount, daysOfHistory };
  }
  if (txCount >= 50 && daysOfHistory >= 90) {
    return { level: "HIGH", reason: `${txCount} transactions over ${daysOfHistory} days`, txCount, daysOfHistory };
  }
  if (txCount >= 20 && daysOfHistory >= 30) {
    return { level: "MEDIUM", reason: `${txCount} transactions over ${daysOfHistory} days — limited history`, txCount, daysOfHistory };
  }
  return { level: "LOW", reason: `Only ${txCount} transactions over ${daysOfHistory} days`, txCount, daysOfHistory };
}

export function confidenceLabel(level: ConfidenceLevel): string {
  switch (level) {
    case "HIGH":    return "Based on your actual transaction history";
    case "MEDIUM":  return "Based on limited history — verify independently";
    case "LOW":     return "General estimate — need more data";
    case "UNKNOWN": return "Insufficient data to advise";
  }
}
