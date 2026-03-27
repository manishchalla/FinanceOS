export type Archetype = "credit_rebuilder" | "cash_surfer" | "wealth_builder" | "debt_destroyer" | null;

export type ArchetypeInfo = {
  id: Archetype;
  label: string;
  tagline: string;
  fear: string;
  color: string;
  kpis: string[];
};

export const ARCHETYPES: ArchetypeInfo[] = [
  {
    id: "credit_rebuilder",
    label: "Credit Rebuilder",
    tagline: "Escaping high-interest cycles",
    fear: "I'll never escape this",
    color: "red",
    kpis: ["payment_streak", "utilization_ratio", "runway", "subscriptions"],
  },
  {
    id: "cash_surfer",
    label: "Cash Flow Surfer",
    tagline: "Gig worker / irregular income",
    fear: "I don't know if I can pay rent",
    color: "amber",
    kpis: ["runway", "daily_spendable", "income_concentration", "subscriptions"],
  },
  {
    id: "wealth_builder",
    label: "Wealth Builder",
    tagline: "Stable income, optimization mode",
    fear: "I'm wasting my potential",
    color: "green",
    kpis: ["savings_rate", "net_worth", "fire_timeline", "subscriptions"],
  },
  {
    id: "debt_destroyer",
    label: "Debt Destroyer",
    tagline: "Paying down high-interest debt",
    fear: "I'll die in debt",
    color: "purple",
    kpis: ["daily_spendable", "payoff_velocity", "runway", "subscriptions"],
  },
];

export function getArchetypeInfo(id: Archetype): ArchetypeInfo | undefined {
  return ARCHETYPES.find(a => a.id === id);
}
