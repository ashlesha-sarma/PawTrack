import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import API from '../../api/api';

const empty = { title: '', description: '', target_amount: '', deadline: '', existing_photo: '' };

function ProgressMini({ raised, goal }) {
  const pct = Math.min(100, Math.round((raised / goal) * 100));
  return (
    <div>
      <div className="mb-1 flex justify-between text-xs text-forest-500 dark:text-forest-400">
        <span className="font-semibold text-terra-600 dark:text-terra-400">Rs. {Number(raised).toLocaleString('en-IN')}</span>
        <span>{pct}%</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-cream-200 dark:bg-forest-800">
        <div className="h-full rounded-full bg-terra-500" style={{ width: `${pct}%` }} />
      </div>
      <p className="mt-0.5 text-right text-xs text-forest-400">of Rs. {Number(goal).toLocaleString('en-IN')}</p>
    </div>
  );
}

export default function ManageDrives() {
  const [drives, setDrives] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(empty);
  const [photo, setPhoto] = useState(null);
  const [editId, setEditId] = useState(null);
  const [msg, setMsg] = useState({ text: '', ok: true });
  const [submitting, setSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [recentByDrive, setRecentByDrive] = useState({});

  const fetchAll = useCallback(() => {
    setLoading(true);
    API.get('/donations/drives')
      .then((r) => {
        const rows = r.data || [];
        setDrives(rows);
        rows.forEach((drive) => {
          API.get(`/donations/drives/${drive.id}/recent`)
            .then((r2) => setRecentByDrive((prev) => ({ ...prev, [drive.id]: r2.data || [] })))
            .catch(() => {});
        });
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const reset = () => {
    setForm(empty);
    setPhoto(null);
    setEditId(null);
    setShowForm(false);
    setMsg({ text: '', ok: true });
  };

  const submit = async (e) => {
    e.preventDefault();
    setMsg({ text: '', ok: true });
    setSubmitting(true);
    const fd = new FormData();
    Object.entries(form).forEach(([k, v]) => fd.append(k, v));
    if (photo) fd.append('photo', photo);
    try {
      if (editId) {
        await API.put(`/donations/drives/${editId}`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
        setMsg({ text: 'Campaign updated successfully.', ok: true });
      } else {
        await API.post('/donations/drives', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
        setMsg({ text: 'Campaign created successfully.', ok: true });
      }
      reset();
      fetchAll();
    } catch {
      setMsg({ text: 'Error saving campaign.', ok: false });
    } finally {
      setSubmitting(false);
    }
  };

  const startEdit = (drive) => {
    setForm({
      title: drive.title,
      description: drive.description || '',
      target_amount: drive.target_amount,
      deadline: drive.deadline?.split('T')[0] || '',
      existing_photo: drive.photo || '',
    });
    setPhoto(null);
    setEditId(drive.id);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const closeDrive = async (id) => {
    await API.patch(`/donations/drives/${id}/close`);
    fetchAll();
  };

  const reopenDrive = async (id) => {
    await API.patch(`/donations/drives/${id}/reopen`);
    fetchAll();
  };

  const totalRaised = drives.reduce((sum, drive) => sum + (drive.raised_amount || 0), 0);
  const totalGoal = drives.reduce((sum, drive) => sum + (drive.target_amount || 0), 0);
  const totalDonors = drives.reduce((sum, drive) => sum + (drive.donor_count || 0), 0);
  const activeDrives = drives.filter((drive) => drive.is_active).length;

  return (
    <div className="max-w-6xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl text-forest-950 dark:text-cream-100">Donation drives</h1>
          <p className="mt-0.5 text-sm text-forest-500 dark:text-forest-400">
            {drives.length} campaigns total | {activeDrives} active
          </p>
        </div>
        <button onClick={() => setShowForm((value) => !value)} className="btn-primary btn-sm">
          {showForm ? 'Close' : 'New Campaign'}
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          { icon: 'Rs', label: 'Total raised', value: `Rs. ${totalRaised.toLocaleString('en-IN')}`, color: 'bg-terra-100 dark:bg-terra-900/30 text-terra-500' },
          { icon: 'TG', label: 'Total goal', value: `Rs. ${totalGoal.toLocaleString('en-IN')}`, color: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600' },
          { icon: 'DN', label: 'Total donors', value: totalDonors, color: 'bg-terra-100 dark:bg-terra-900/20 text-terra-600' },
          { icon: 'PC', label: 'Overall funded', value: `${totalGoal > 0 ? Math.round((totalRaised / totalGoal) * 100) : 0}%`, color: 'bg-amber-100 dark:bg-amber-900/30 text-amber-600' },
        ].map((stat) => (
          <div key={stat.label} className="stat-card">
            <div className={`stat-icon text-xs font-semibold ${stat.color}`}>{stat.icon}</div>
            <div>
              <p className="text-xs text-forest-500 dark:text-forest-400">{stat.label}</p>
              <p className="text-xl font-semibold text-forest-950 dark:text-cream-100">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      {showForm && (
        <div className="card p-6">
          <h2 className="mb-5 text-lg text-forest-950 dark:text-cream-100">{editId ? 'Edit campaign' : 'Create new campaign'}</h2>
          <form onSubmit={submit} className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="md:col-span-2">
              <label className="label">Campaign title *</label>
              <input className="input" required value={form.title} onChange={set('title')} placeholder="Emergency veterinary support fund" />
            </div>
            <div className="md:col-span-2">
              <label className="label">Description</label>
              <textarea
                className="input resize-none"
                rows={4}
                value={form.description}
                onChange={set('description')}
                placeholder="Explain why this campaign matters and how the funds will be used."
              />
            </div>
            <div>
              <label className="label">Goal amount (Rs.) *</label>
              <input type="number" className="input" required min="1" value={form.target_amount} onChange={set('target_amount')} placeholder="50000" />
            </div>
            <div>
              <label className="label">Deadline</label>
              <input type="date" className="input" value={form.deadline} onChange={set('deadline')} />
            </div>
            <div className="md:col-span-2">
              <label className="label">Cover photo</label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setPhoto(e.target.files[0])}
                className="input cursor-pointer py-2 text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-terra-100 file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-terra-700 hover:file:bg-terra-200"
              />
              {form.existing_photo && <p className="mt-1 text-xs text-forest-400">Current: {form.existing_photo}</p>}
            </div>

            {msg.text && (
              <div
                className={`md:col-span-2 rounded-xl border p-3 text-sm ${
                  msg.ok
                    ? 'border-terra-200 bg-terra-50 text-terra-700 dark:border-terra-800 dark:bg-terra-900/20 dark:text-terra-400'
                    : 'border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400'
                }`}
              >
                {msg.text}
              </div>
            )}

            <div className="md:col-span-2 flex gap-3">
              <button type="submit" disabled={submitting} className={`btn-primary flex-1 ${submitting ? 'opacity-70' : ''}`}>
                {submitting ? 'Saving' : editId ? 'Update Campaign' : 'Launch Campaign'}
              </button>
              <button type="button" onClick={reset} className="btn-ghost px-6">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="skeleton h-72 rounded-2xl" />
          ))}
        </div>
      ) : (
        <div className="space-y-5">
          {drives.map((drive) => {
            const recent = recentByDrive[drive.id] || [];
            const daysLeft = drive.deadline
              ? Math.max(0, Math.ceil((new Date(drive.deadline) - Date.now()) / 86400000))
              : null;

            return (
              <div key={drive.id} className={`card p-5 ${!drive.is_active ? 'opacity-75' : ''}`}>
                <div className="grid gap-5 md:grid-cols-3">
                  <div className="flex gap-4 md:col-span-1">
                    <div className="h-20 w-20 flex-shrink-0 overflow-hidden rounded-2xl bg-cream-200 dark:bg-forest-800">
                      {drive.photo ? (
                        <img
                          src={drive.photo}
                          alt={drive.title}
                          className="h-full w-full object-cover"
                          onError={(e) => {
                            e.target.style.display = 'none';
                          }}
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-sm font-medium text-terra-600">No image</div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="mb-0.5 flex flex-wrap items-center gap-2">
                        <span className={drive.is_active ? 'badge-orange text-xs' : 'badge-red text-xs'}>
                          {drive.is_active ? 'Active' : 'Closed'}
                        </span>
                        {daysLeft !== null && drive.is_active && (
                          <span className={daysLeft <= 7 ? 'badge-red text-xs' : 'badge-amber text-xs'}>
                            {daysLeft === 0 ? 'Final day' : `${daysLeft}d`}
                          </span>
                        )}
                      </div>
                      <h3 className="leading-tight text-forest-950 dark:text-cream-100">{drive.title}</h3>
                      <p className="mt-0.5 text-xs text-forest-400">{drive.donor_count || 0} donors</p>
                    </div>
                  </div>

                  <div className="flex flex-col justify-center md:col-span-1">
                    <ProgressMini raised={drive.raised_amount} goal={drive.target_amount} />
                  </div>

                  <div className="space-y-3 md:col-span-1">
                    {recent.length > 0 && (
                      <div>
                        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-forest-400">Recent donors</p>
                        <div className="space-y-1.5">
                          {recent.slice(0, 3).map((donor, i) => (
                            <div key={i} className="flex items-center justify-between text-xs">
                              <span className="max-w-[100px] truncate text-forest-700 dark:text-forest-300">{donor.donor_name}</span>
                              <span className="font-semibold text-terra-600 dark:text-terra-400">Rs. {donor.amount?.toLocaleString('en-IN')}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="flex flex-wrap gap-2">
                      <Link to={`/donations/${drive.id}`} target="_blank" className="btn-ghost btn-sm px-3 py-1.5 text-xs">
                        View
                      </Link>
                      <button onClick={() => startEdit(drive)} className="btn-ghost btn-sm px-3 py-1.5 text-xs">
                        Edit
                      </button>
                      {drive.is_active ? (
                        <button
                          onClick={() => closeDrive(drive.id)}
                          className="rounded-xl border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-100 dark:border-red-900 dark:bg-red-900/20 dark:text-red-400"
                        >
                          Close
                        </button>
                      ) : (
                        <button
                          onClick={() => reopenDrive(drive.id)}
                          className="rounded-xl border border-terra-200 bg-terra-50 px-3 py-1.5 text-xs font-medium text-terra-700 hover:bg-terra-100 dark:border-terra-800 dark:bg-terra-900/20 dark:text-terra-400"
                        >
                          Reopen
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

          {drives.length === 0 && (
            <div className="card py-16 text-center">
              <p className="text-forest-400">No campaigns yet. Create the first one to begin fundraising.</p>
              <button onClick={() => setShowForm(true)} className="btn-primary btn-sm mt-4">
                New Campaign
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
