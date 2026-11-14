import React, { useCallback, useEffect, useState } from 'react';
import API from '../api/api';

const CATEGORIES = ['medical', 'food', 'shelter', 'other'];
const CATEGORY_LABELS = { medical: 'Medical', food: 'Food', shelter: 'Shelter', other: 'Other' };
const CATEGORY_BADGE = {
  medical: 'badge-red',
  food: 'badge-amber',
  shelter: 'badge-blue',
  other: 'badge-terra',
};

const todayStr = () => new Date().toISOString().slice(0, 10);
const emptyForm = () => ({ description: '', amount: '', expense_date: todayStr(), category: 'medical' });
const rs = (n) => `Rs. ${Number(n || 0).toLocaleString('en-IN')}`;

export default function ExpensePanel({ driveId }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(emptyForm());
  const [editId, setEditId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState({ text: '', ok: true });

  const fetchData = useCallback(() => {
    return API.get(`/expenses/${driveId}`)
      .then((r) => setData(r.data))
      .catch(() => setMsg({ text: 'Could not load expenses.', ok: false }))
      .finally(() => setLoading(false));
  }, [driveId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const resetForm = () => {
    setForm(emptyForm());
    setEditId(null);
  };

  const submit = async (e) => {
    e.preventDefault();
    setMsg({ text: '', ok: true });
    setSaving(true);
    try {
      if (editId) {
        await API.put(`/expenses/${editId}`, form);
        setMsg({ text: 'Expense updated.', ok: true });
      } else {
        await API.post('/expenses', { drive_id: driveId, ...form });
        setMsg({ text: 'Expense recorded.', ok: true });
      }
      resetForm();
      await fetchData();
    } catch (err) {
      setMsg({ text: err.response?.data?.error || 'Could not save expense.', ok: false });
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (exp) => {
    setEditId(exp.expense_id);
    setForm({
      description: exp.description || '',
      amount: exp.amount,
      expense_date: (exp.expense_date || '').slice(0, 10),
      category: exp.category,
    });
    setMsg({ text: '', ok: true });
  };

  const remove = async (id) => {
    if (!window.confirm('Delete this expense? This cannot be undone.')) return;
    try {
      await API.delete(`/expenses/${id}`);
      if (editId === id) resetForm();
      setMsg({ text: 'Expense deleted.', ok: true });
      await fetchData();
    } catch (err) {
      setMsg({ text: err.response?.data?.error || 'Could not delete expense.', ok: false });
    }
  };

  return (
    <div className="mt-5 border-t border-cream-200 pt-5 dark:border-forest-800">
      <h4 className="mb-3 text-sm font-semibold uppercase tracking-wider text-forest-500 dark:text-forest-400">
        Expenses
      </h4>

      {/* Totals */}
      {data && (
        <div className="mb-4 grid grid-cols-2 gap-3 text-center">
          <div className="surface-muted rounded-xl p-3">
            <p className="text-xs text-forest-500 dark:text-forest-400">Spent</p>
            <p className="font-semibold text-forest-950 dark:text-cream-100">{rs(data.spent)}</p>
          </div>
          <div className="surface-muted rounded-xl p-3">
            <p className="text-xs text-forest-500 dark:text-forest-400">Remaining</p>
            <p className="font-semibold text-forest-950 dark:text-cream-100">{rs(data.remaining)}</p>
          </div>
        </div>
      )}

      {/* Add / edit form */}
      <form onSubmit={submit} className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="sm:col-span-2 lg:col-span-4">
          <label className="label">Purpose / description *</label>
          <input
            className="input"
            required
            maxLength={255}
            value={form.description}
            onChange={set('description')}
            placeholder="e.g. Surgery for injured dog at City Vet Clinic"
          />
        </div>
        <div>
          <label className="label">Amount (Rs.) *</label>
          <input
            type="number"
            className="input"
            required
            min="0.01"
            step="0.01"
            value={form.amount}
            onChange={set('amount')}
          />
        </div>
        <div>
          <label className="label">Date *</label>
          <input type="date" className="input" required value={form.expense_date} onChange={set('expense_date')} />
        </div>
        <div>
          <label className="label">Category *</label>
          <select className="input" value={form.category} onChange={set('category')}>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {CATEGORY_LABELS[c]}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-end gap-2">
          <button type="submit" disabled={saving} className={`btn-primary btn-sm flex-1 ${saving ? 'opacity-70' : ''}`}>
            {saving ? 'Saving' : editId ? 'Update expense' : 'Add expense'}
          </button>
          {editId && (
            <button type="button" onClick={resetForm} className="btn-ghost btn-sm">
              Cancel
            </button>
          )}
        </div>
      </form>

      {msg.text && (
        <p className={`mt-3 text-sm ${msg.ok ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
          {msg.text}
        </p>
      )}

      {/* List */}
      <div className="mt-4 space-y-2">
        {loading ? (
          <div className="skeleton h-10 rounded-lg" />
        ) : !data || data.expenses.length === 0 ? (
          <p className="text-sm text-forest-500 dark:text-forest-400">No expenses recorded for this campaign yet.</p>
        ) : (
          data.expenses.map((exp) => (
            <div
              key={exp.expense_id}
              className="surface-muted flex flex-wrap items-center justify-between gap-3 rounded-xl p-3 text-sm"
            >
              <div className="min-w-0 flex-1">
                <p className="font-medium text-forest-900 dark:text-cream-100">{exp.description}</p>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <span className={`${CATEGORY_BADGE[exp.category] || 'badge-terra'} text-xs`}>
                    {CATEGORY_LABELS[exp.category] || exp.category}
                  </span>
                  <span className="text-xs text-forest-400">
                    {new Date(exp.expense_date).toLocaleDateString('en-IN')}
                    {exp.recorded_by_name && <> · by {exp.recorded_by_name}</>}
                  </span>
                </div>
              </div>
              <span className="font-semibold text-terra-700 dark:text-terra-300">{rs(exp.amount)}</span>
              <div className="flex gap-2">
                <button onClick={() => startEdit(exp)} className="btn-ghost btn-sm px-3 py-1.5 text-xs">
                  Edit
                </button>
                <button
                  onClick={() => remove(exp.expense_id)}
                  className="rounded-xl border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-100 dark:border-red-900 dark:bg-red-900/20 dark:text-red-400"
                >
                  Delete
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
