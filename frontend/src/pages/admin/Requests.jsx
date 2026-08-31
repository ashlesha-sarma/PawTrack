import React, { useEffect, useState } from 'react';
import API from '../../api/api';

const STATUS_STYLE = {
  Pending: 'badge-amber',
  Approved: 'badge-green',
  Rejected: 'badge-red',
};

export default function Requests() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('All');
  const [updating, setUpdating] = useState(null);

  const fetchData = () => {
    setLoading(true);
    API.get('/adoptions')
      .then((r) => setRequests(r.data || []))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchData();
  }, []);

  const updateStatus = async (id, status) => {
    setUpdating(id);
    await API.put(`/adoptions/${id}/status`, { status }).catch(() => alert('Failed'));
    fetchData();
    setUpdating(null);
  };

  const filtered = filter === 'All' ? requests : requests.filter((r) => r.status === filter);
  const counts = {
    All: requests.length,
    Pending: requests.filter((r) => r.status === 'Pending').length,
    Approved: requests.filter((r) => r.status === 'Approved').length,
    Rejected: requests.filter((r) => r.status === 'Rejected').length,
  };

  return (
    <div className="max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl text-forest-950 dark:text-cream-100">Adoption requests</h1>
        <p className="mt-1 text-sm text-forest-500 dark:text-forest-400">{requests.length} total applications</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {['All', 'Pending', 'Approved', 'Rejected'].map((value) => (
          <button
            key={value}
            onClick={() => setFilter(value)}
            className={`rounded-xl border px-4 py-2 text-sm font-medium transition-colors ${
              filter === value
                ? 'border-terra-500 bg-terra-500 text-white'
                : 'border-cream-300 bg-white text-forest-700 hover:border-terra-300 dark:border-forest-700 dark:bg-forest-800 dark:text-forest-300'
            }`}
          >
            {value} <span className="ml-1 opacity-70">({counts[value]})</span>
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="skeleton h-28 rounded-2xl" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="card py-16 text-center">
          <p className="text-forest-400">No {filter !== 'All' ? filter.toLowerCase() : ''} requests found.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((request) => (
            <div key={request.id} className="card p-5 transition-shadow duration-200 hover:shadow-card-hover">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                <div className="grid min-w-0 flex-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <div>
                    <p className="mb-0.5 text-xs uppercase tracking-wider text-forest-400">Animal</p>
                    <p className="font-semibold text-forest-900 dark:text-cream-100">{request.animal_name}</p>
                    <p className="text-xs capitalize text-forest-400">{request.species}</p>
                  </div>
                  <div>
                    <p className="mb-0.5 text-xs uppercase tracking-wider text-forest-400">Applicant</p>
                    <p className="text-sm font-medium text-forest-800 dark:text-cream-100">{request.user_name}</p>
                    <p className="truncate text-xs text-forest-400">{request.user_email}</p>
                  </div>
                  <div>
                    <p className="mb-0.5 text-xs uppercase tracking-wider text-forest-400">Reason</p>
                    <p className="line-clamp-2 text-sm text-forest-600 dark:text-forest-300">{request.reason}</p>
                  </div>
                  <div>
                    <p className="mb-0.5 text-xs uppercase tracking-wider text-forest-400">Details</p>
                    <p className="text-xs text-forest-500">Experience: {request.experience}</p>
                    <p className="mt-1 text-xs text-forest-400">{new Date(request.date).toLocaleDateString('en-IN')}</p>
                  </div>
                </div>

                <div className="flex flex-row items-center gap-2 sm:flex-col">
                  <span className={STATUS_STYLE[request.status] || 'badge-amber'}>{request.status}</span>
                  {request.status !== 'Approved' && (
                    <button
                      onClick={() => updateStatus(request.id, 'Approved')}
                      disabled={updating === request.id}
                      className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700 transition-colors hover:bg-emerald-100 disabled:opacity-50 dark:border-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-400"
                    >
                      Approve
                    </button>
                  )}
                  {request.status !== 'Rejected' && (
                    <button
                      onClick={() => updateStatus(request.id, 'Rejected')}
                      disabled={updating === request.id}
                      className="rounded-xl border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-600 transition-colors hover:bg-red-100 disabled:opacity-50 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400"
                    >
                      Reject
                    </button>
                  )}
                  {request.status !== 'Pending' && (
                    <button
                      onClick={() => updateStatus(request.id, 'Pending')}
                      disabled={updating === request.id}
                      className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-700 transition-colors hover:bg-amber-100 disabled:opacity-50 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-400"
                    >
                      Pending
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
