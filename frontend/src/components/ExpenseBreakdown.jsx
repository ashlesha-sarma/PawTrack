import React, { useState } from 'react';

const CATEGORY_LABELS = { medical: 'Medical', food: 'Food', shelter: 'Shelter', other: 'Other' };
const CATEGORY_BADGE = {
  medical: 'badge-red',
  food: 'badge-amber',
  shelter: 'badge-blue',
  other: 'badge-terra',
};
const INITIAL_VISIBLE = 5;

const inr = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;

export default function ExpenseBreakdown({ summary, raised }) {
  const [showAll, setShowAll] = useState(false);

  const expenses = summary.expenses || [];
  const byCategory = summary.by_category || [];
  const visible = showAll ? expenses : expenses.slice(0, INITIAL_VISIBLE);
  const spentPct = raised > 0 ? Math.min(100, (summary.spent / raised) * 100) : 0;

  return (
    <div className="card p-6">
      <h2 className="text-xl text-forest-950 dark:text-cream-100">Transparency</h2>
      <p className="mt-1 text-sm text-forest-500 dark:text-forest-400">
        Where this campaign&apos;s funds stand right now, and exactly what they were spent on.
      </p>

      {/* Raised / Spent / Remaining */}
      <div className="mt-4 grid grid-cols-3 gap-3 text-center">
        <div>
          <p className="text-lg font-semibold text-forest-950 dark:text-cream-100">{inr(raised)}</p>
          <p className="text-xs text-forest-500 dark:text-forest-400">Raised</p>
        </div>
        <div>
          <p className="text-lg font-semibold text-forest-950 dark:text-cream-100">{inr(summary.spent)}</p>
          <p className="text-xs text-forest-500 dark:text-forest-400">Spent</p>
        </div>
        <div>
          <p className="text-lg font-semibold text-forest-950 dark:text-cream-100">{inr(summary.remaining)}</p>
          <p className="text-xs text-forest-500 dark:text-forest-400">Remaining</p>
        </div>
      </div>

      {/* Spent progress bar */}
      <div className="mt-4">
        <div className="progress-bar">
          <div className="progress-fill" style={{ width: `${spentPct}%` }} />
        </div>
        <p className="mt-1.5 text-xs text-forest-500 dark:text-forest-400">
          {spentPct.toFixed(0)}% of the funds raised have been spent
        </p>
      </div>

      {/* Category breakdown */}
      {byCategory.length > 0 && (
        <div className="mt-5">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-forest-500 dark:text-forest-400">
            Spending by category
          </p>
          <div className="flex flex-wrap gap-2">
            {byCategory.map((c) => (
              <span key={c.category} className={CATEGORY_BADGE[c.category] || 'badge-terra'}>
                {CATEGORY_LABELS[c.category] || c.category}: {inr(c.total)}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Expense list */}
      <div className="mt-5 border-t border-cream-200 pt-4 dark:border-forest-800">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-forest-500 dark:text-forest-400">
          Expense history
        </p>

        {expenses.length === 0 ? (
          <p className="text-sm text-forest-500 dark:text-forest-400">No expenses have been recorded yet.</p>
        ) : (
          <div className="space-y-2">
            {visible.map((e) => (
              <div key={e.expense_id} className="surface-muted flex items-start justify-between gap-3 rounded-xl p-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-forest-900 dark:text-cream-100">{e.description}</p>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    <span className={`${CATEGORY_BADGE[e.category] || 'badge-terra'} text-xs`}>
                      {CATEGORY_LABELS[e.category] || e.category}
                    </span>
                    <span className="text-xs text-forest-400">
                      {new Date(e.expense_date).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </span>
                  </div>
                </div>
                <span className="flex-shrink-0 text-sm font-semibold text-terra-700 dark:text-terra-300">
                  {inr(e.amount)}
                </span>
              </div>
            ))}

            {expenses.length > INITIAL_VISIBLE && (
              <button
                onClick={() => setShowAll((v) => !v)}
                className="w-full pt-1 text-center text-sm font-medium text-terra-600 hover:text-terra-700 dark:text-terra-300"
              >
                {showAll ? 'Show fewer' : `Show all ${expenses.length} expenses`}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
