"use client";

type Category = { id: string; name: string; icon: string };

type Props = {
  selectedCount: number;
  categories: Category[];
  onRecategorize: (categoryId: string) => void;
  onDelete: () => void;
  onClear: () => void;
};

export function BulkActionBar({ selectedCount, categories, onRecategorize, onDelete, onClear }: Props) {
  if (selectedCount === 0) return null;

  return (
    <div className="flex items-center gap-3 px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm">
      <span className="text-slate-300 font-medium">{selectedCount} selected</span>
      <div className="flex-1 flex items-center gap-2">
        <select
          onChange={e => { if (e.target.value) { onRecategorize(e.target.value); e.target.value = ""; } }}
          className="bg-slate-900 border border-slate-700 text-slate-200 text-xs rounded-lg px-3 py-1.5 focus:outline-none focus:border-purple-500"
        >
          <option value="">Recategorize…</option>
          {categories.map(c => (
            <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
          ))}
        </select>
        <button
          onClick={onDelete}
          className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20 transition-all"
        >
          Delete
        </button>
      </div>
      <button
        onClick={onClear}
        className="text-xs text-slate-500 hover:text-slate-300 transition-colors"
      >
        Clear
      </button>
    </div>
  );
}
