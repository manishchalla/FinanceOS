export type YoYResult = {
  thisYear: number;
  lastYear: number;
  deltaAbs: number;
  deltaPct: number | null;
  direction: "up" | "down" | "flat";
};

export function computeYoY(thisYear: number, lastYear: number): YoYResult {
  const deltaAbs = thisYear - lastYear;
  const deltaPct = lastYear > 0 ? (deltaAbs / lastYear) * 100 : null;
  const direction = deltaAbs > 0.01 ? "up" : deltaAbs < -0.01 ? "down" : "flat";
  return { thisYear, lastYear, deltaAbs, deltaPct, direction };
}
