import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import API from '../../api/api';
import { getImageUrl } from '../../utils/imageUrl';
import { MapPinIcon } from '../../components/Icons';

const FILTERS = ['All', 'Unverified'];

const STATUS_LABELS = {
  reported: 'Reported (hidden)',
  under_care: 'Under care',
  fostered: 'Fostered',
  available: 'Available',
  adopted: 'Adopted',
};

const fmt = (value) => {
  if (!value) return '';
  const d = new Date(String(value).replace(' ', 'T'));
  return Number.isNaN(d.getTime()) ? String(value) : d.toLocaleString('en-IN');
};

export default function Sightings() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('Unverified');
  const [updating, setUpdating] = useState(null);

  const fetchData = () => {
    setLoading(true);
    API.get('/sightings')
      .then((r) => setRows(r.data || []))
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchData();
  }, []);

  const act = async (id, action, body = {}) => {
    setUpdating(id);
    await API.patch(`/sightings/${id}/${action}`, body).catch(() => alert('Failed'));
    setUpdating(null);
    fetchData();
  };

  const filtered = rows.filter((s) => {
    if (filter === 'Unverified') return !s.verified;
    return true;
  });

  const counts = {
    All: rows.length,
    Unverified: rows.filter((s) => !s.verified).length,
  };

  return (
    <div className="max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl text-forest-950 dark:text-cream-100">Sighting reports</h1>
        <p className="mt-1 text-sm text-forest-500 dark:text-forest-400">
          {rows.length} total reports. Animals created from a report stay hidden from the public until you change their
          status in Manage animals.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((value) => (
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
          <p className="text-forest-400">No {filter !== 'All' ? filter.toLowerCase() : ''} sightings found.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((s) => {
            const name = s.animal_name || `Unnamed ${s.species}`;
            return (
              <div key={s.sighting_id} className="card p-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                  {s.photo_path ? (
                    <a href={getImageUrl(s.photo_path)} target="_blank" rel="noreferrer" className="flex-shrink-0">
                      <img
                        src={getImageUrl(s.photo_path)}
                        alt={`Sighting of ${name}`}
                        className="h-24 w-24 rounded-xl object-cover"
                        onError={(e) => {
                          e.currentTarget.onerror = null;
                          e.currentTarget.src = '/placeholder.png';
                        }}
                      />
                    </a>
                  ) : (
                    <div className="flex h-24 w-24 flex-shrink-0 items-center justify-center rounded-xl bg-cream-200 text-xs text-forest-400 dark:bg-forest-800">
                      No photo
                    </div>
                  )}

                  <div className="grid min-w-0 flex-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    <div>
                      <p className="mb-0.5 text-xs uppercase tracking-wider text-forest-400">Animal</p>
                      <Link
                        to={`/home/animals/${s.animal_id}`}
                        className="font-semibold text-forest-900 hover:text-terra-600 dark:text-cream-100"
                      >
                        {name}
                      </Link>
                      <p className="text-xs capitalize text-forest-400">
                        {s.species} · {STATUS_LABELS[s.animal_status] || s.animal_status}
                      </p>
                    </div>
                    <div>
                      <p className="mb-0.5 text-xs uppercase tracking-wider text-forest-400">Location</p>
                      <p className="flex items-start gap-1 text-sm text-forest-800 dark:text-cream-100">
                        <MapPinIcon className="mt-0.5 h-4 w-4 flex-shrink-0 text-terra-500" />
                        <span>{s.location}</span>
                      </p>
                      {s.notes && <p className="mt-1 text-sm text-forest-600 dark:text-forest-300">{s.notes}</p>}
                    </div>
                    <div>
                      <p className="mb-0.5 text-xs uppercase tracking-wider text-forest-400">Reported by</p>
                      <p className="text-sm font-medium text-forest-800 dark:text-cream-100">
                        {s.reported_by_name || 'Deleted user'}
                      </p>
                      <p className="truncate text-xs text-forest-400">{s.reported_by_email}</p>
                      <p className="mt-1 text-xs text-forest-400">{fmt(s.reported_at)}</p>
                    </div>
                  </div>

                  <div className="flex flex-row flex-wrap items-center gap-2 sm:flex-col sm:items-stretch">
                    {!s.verified && (
                      <button
                        onClick={() => act(s.sighting_id, 'verify')}
                        disabled={updating === s.sighting_id}
                        className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700 transition-colors hover:bg-emerald-100 disabled:opacity-50 dark:border-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-400"
                      >
                        Verify
                      </button>
                    )}
                    <Link
                      to="/admin/manage-animals"
                      className="rounded-xl border border-cream-300 bg-cream-50 px-3 py-1.5 text-center text-xs font-medium text-forest-600 hover:bg-cream-100 dark:border-forest-700 dark:bg-forest-800 dark:text-forest-300"
                    >
                      Manage animal
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
