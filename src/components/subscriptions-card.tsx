import { formatCurrency } from "@/lib/utils";
import type { RecurringSubscription } from "@/lib/subscriptions";

type Props = {
  items: RecurringSubscription[];
};

export function SubscriptionsCard({ items }: Props) {
  const totalMonthly = items.reduce((sum, item) => sum + item.monthlyAmount, 0);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-white font-semibold">Recurring Subscriptions</h3>
          <p className="text-slate-400 text-xs">Detected from last 6 months</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-slate-500">Estimated monthly total</p>
          <p className="text-sm font-semibold text-amber-400">{formatCurrency(totalMonthly)}</p>
        </div>
      </div>

      {items.length === 0 ? (
        <div className="text-sm text-slate-500 py-6 text-center">No recurring subscriptions detected</div>
      ) : (
        <div className="space-y-2">
          {items.slice(0, 6).map((sub) => (
            <a
              key={`${sub.description}-${sub.lastSeen}`}
              href={`/transactions?type=expense&q=${encodeURIComponent(sub.description)}`}
              className="flex items-center justify-between p-3 rounded-lg bg-slate-800/50 border border-slate-700/50 hover:border-amber-500/30 transition-all"
              title="Open matching transactions"
            >
              <div>
                <p className="text-sm font-medium text-slate-200">{sub.description}</p>
                <p className="text-xs text-slate-500">{sub.months} consecutive months</p>
              </div>
              <p className="text-sm font-semibold text-slate-300">{formatCurrency(sub.monthlyAmount)}</p>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

