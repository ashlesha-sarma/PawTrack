import React, { useEffect, useState } from 'react';
import API from '../api/api';
import { SyringeIcon } from './Icons';

function statusOf(days) {
  if (days < 0) return { label: `Overdue by ${Math.abs(days)}d`, cls: 'badge-red' };
  if (days === 0) return { label: 'Due today', cls: 'badge-red' };
  if (days <= 7) return { label: `Due in ${days}d`, cls: 'badge-amber' };
  return { label: `Due in ${days}d`, cls: 'badge-blue' };
}

export default function VaccinationsDue() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    API.get('/medical/vaccinations/due')
      .then((r) => setRows(r.data || []))
      .catch(() => setFailed(true))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="card p-5">
      <div className="mb-4 flex items-center gap-3">
        <div className="stat-icon">
          <SyringeIcon className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-lg text-forest-950 dark:text-cream-100">Vaccinations due</h2>
          <p className="text-sm text-forest-500 dark:text-forest-400">
            Overdue or due within the next 30 days. Record the booster on the animal&apos;s Medical tab to clear an entry.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="skeleton h-16 rounded-xl" />
      ) : failed ? (
        <p className="text-sm text-red-600 dark:text-red-400">Could not load the vaccinations list.</p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-forest-500 dark:text-forest-400">No vaccinations are due. All animals are up to date.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-cream-200 dark:border-forest-800">
                {['Animal', 'Vaccine', 'Due date', 'Status', 'Last vet'].map((h) => (
                  <th key={h} className="pb-3 pr-4 text-left text-xs font-semibold uppercase tracking-wider text-forest-500 dark:text-forest-400">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-cream-200 dark:divide-forest-800">
              {rows.map((r) => {
                const s = statusOf(Number(r.days_until_due));
                return (
                  <tr key={r.record_id}>
                    <td className="py-3 pr-4 font-medium text-forest-900 dark:text-cream-100">{r.animal_name}</td>
                    <td className="py-3 pr-4 text-forest-600 dark:text-forest-300">{r.vaccine_name || '—'}</td>
                    <td className="py-3 pr-4 text-forest-600 dark:text-forest-300">
                      {new Date(r.next_due_date).toLocaleDateString('en-IN')}
                    </td>
                    <td className="py-3 pr-4"><span className={s.cls}>{s.label}</span></td>
                    <td className="py-3 text-forest-500 dark:text-forest-400">{r.vet_name || '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
