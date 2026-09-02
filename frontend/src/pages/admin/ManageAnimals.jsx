import React, { useEffect, useState } from 'react';
import API from '../../api/api';
import { SearchIcon } from '../../components/Icons';

const emptyForm = {
  name: '',
  species: 'dog',
  breed: '',
  age: '',
  gender: 'Male',
  current_status: 'reported',
  description: '',
  existing_image_path: '',
};

const STATUS_LABELS = {
  reported: 'Reported',
  under_care: 'Under Care',
  fostered: 'Fostered',
  available: 'Available',
  adopted: 'Adopted',
};

// ─── Per-animal history panel (sightings / medical / foster) ──────────────
// Added as a small collapsible section inside the existing table row — no
// changes to the table structure itself, no new page, no layout redesign.
// Reuses the same `input`/`label`/`btn-primary`/`badge-*` classes already
// used throughout this file's Add/Edit form.

const HISTORY_TABS = [
  { key: 'sightings', label: 'Sightings' },
  { key: 'medical', label: 'Medical' },
  { key: 'foster', label: 'Foster' },
];

function AnimalHistoryPanel({ animalId }) {
  const [tab, setTab] = useState('sightings');

  return (
    <div className="border-t border-cream-200 p-5 dark:border-forest-800">
      <div className="mb-4 flex gap-2">
        {HISTORY_TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={tab === t.key ? 'btn-primary btn-sm' : 'btn-ghost btn-sm'}
          >
            {t.label}
          </button>
        ))}
      </div>
      {tab === 'sightings' && <SightingsTab animalId={animalId} />}
      {tab === 'medical' && <MedicalTab animalId={animalId} />}
      {tab === 'foster' && <FosterTab animalId={animalId} />}
    </div>
  );
}

function SightingsTab({ animalId }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ location: '', notes: '' });
  const [msg, setMsg] = useState('');

  const fetchRows = () => {
    setLoading(true);
    API.get(`/sightings/${animalId}`)
      .then((r) => setRows(r.data || []))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchRows(); }, [animalId]);

  const submit = async (e) => {
    e.preventDefault();
    if (!form.location) { setMsg('Location is required.'); return; }
    try {
      await API.post('/sightings', { animal_id: animalId, ...form });
      setForm({ location: '', notes: '' });
      setMsg('');
      fetchRows();
    } catch {
      setMsg('Could not save sighting.');
    }
  };

  return (
    <div className="space-y-4">
      <form onSubmit={submit} className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <input
          className="input"
          placeholder="Location"
          value={form.location}
          onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
        />
        <input
          className="input sm:col-span-1"
          placeholder="Notes (optional)"
          value={form.notes}
          onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
        />
        <button type="submit" className="btn-primary btn-sm">Log sighting</button>
      </form>
      {msg && <p className="text-xs text-red-600 dark:text-red-400">{msg}</p>}

      {loading ? (
        <div className="skeleton h-10 rounded-lg" />
      ) : rows.length === 0 ? (
        <p className="text-sm text-forest-500 dark:text-forest-400">No sightings logged yet.</p>
      ) : (
        <div className="space-y-2">
          {rows.map((s) => (
            <div key={s.sighting_id} className="surface-muted rounded-xl p-3 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-medium text-forest-900 dark:text-cream-100">{s.location}</span>
                <span className={s.verified ? 'badge-green' : 'badge-amber'}>
                  {s.verified ? 'Verified' : 'Unverified'}
                </span>
              </div>
              {s.notes && <p className="mt-1 text-forest-600 dark:text-forest-300">{s.notes}</p>}
              <p className="mt-1 text-xs text-forest-400">
                Reported by {s.reported_by_name || 'Unknown'} · {new Date(s.reported_at).toLocaleDateString('en-IN')}
                {s.assigned_to_name && <> · Assigned to {s.assigned_to_name}</>}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function MedicalTab({ animalId }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    record_type: 'checkup',
    condition_notes: '',
    vet_name: '',
    record_date: '',
    vaccine_name: '',
    next_due_date: '',
  });
  const [msg, setMsg] = useState('');

  const fetchRows = () => {
    setLoading(true);
    API.get(`/medical/${animalId}`)
      .then((r) => setRows(r.data || []))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchRows(); }, [animalId]);

  const submit = async (e) => {
    e.preventDefault();
    if (!form.record_date) { setMsg('Record date is required.'); return; }
    try {
      await API.post('/medical', { animal_id: animalId, ...form });
      setForm({ record_type: 'checkup', condition_notes: '', vet_name: '', record_date: '', vaccine_name: '', next_due_date: '' });
      setMsg('');
      fetchRows();
    } catch {
      setMsg('Could not save medical record.');
    }
  };

  const isVaccination = form.record_type === 'vaccination';

  return (
    <div className="space-y-4">
      <form onSubmit={submit} className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <select
          className="input"
          value={form.record_type}
          onChange={(e) => setForm((f) => ({ ...f, record_type: e.target.value }))}
        >
          <option value="checkup">Checkup</option>
          <option value="treatment">Treatment</option>
          <option value="vaccination">Vaccination</option>
        </select>
        <input
          type="date"
          className="input"
          value={form.record_date}
          onChange={(e) => setForm((f) => ({ ...f, record_date: e.target.value }))}
        />
        <input
          className="input"
          placeholder="Vet name"
          value={form.vet_name}
          onChange={(e) => setForm((f) => ({ ...f, vet_name: e.target.value }))}
        />
        <input
          className="input lg:col-span-1"
          placeholder="Notes"
          value={form.condition_notes}
          onChange={(e) => setForm((f) => ({ ...f, condition_notes: e.target.value }))}
        />
        {isVaccination && (
          <>
            <input
              className="input"
              placeholder="Vaccine name"
              value={form.vaccine_name}
              onChange={(e) => setForm((f) => ({ ...f, vaccine_name: e.target.value }))}
            />
            <input
              type="date"
              className="input"
              placeholder="Next due date"
              value={form.next_due_date}
              onChange={(e) => setForm((f) => ({ ...f, next_due_date: e.target.value }))}
            />
          </>
        )}
        <button type="submit" className="btn-primary btn-sm">Add record</button>
      </form>
      {msg && <p className="text-xs text-red-600 dark:text-red-400">{msg}</p>}

      {loading ? (
        <div className="skeleton h-10 rounded-lg" />
      ) : rows.length === 0 ? (
        <p className="text-sm text-forest-500 dark:text-forest-400">No medical records yet.</p>
      ) : (
        <div className="space-y-2">
          {rows.map((m) => (
            <div key={m.record_id} className="surface-muted rounded-xl p-3 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="badge-blue capitalize">{m.record_type}</span>
                <span className="text-xs text-forest-400">{new Date(m.record_date).toLocaleDateString('en-IN')}</span>
              </div>
              {m.condition_notes && <p className="mt-1 text-forest-600 dark:text-forest-300">{m.condition_notes}</p>}
              {m.vet_name && <p className="mt-1 text-xs text-forest-400">Vet: {m.vet_name}</p>}
              {m.record_type === 'vaccination' && (m.vaccine_name || m.next_due_date) && (
                <p className="mt-1 text-xs text-terra-700 dark:text-terra-300">
                  {m.vaccine_name && <>Vaccine: {m.vaccine_name}</>}
                  {m.vaccine_name && m.next_due_date && ' · '}
                  {m.next_due_date && <>Next due: {new Date(m.next_due_date).toLocaleDateString('en-IN')}</>}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function FosterTab({ animalId }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ foster_user_id: '', start_date: '' });
  const [msg, setMsg] = useState('');

  const fetchRows = () => {
    setLoading(true);
    API.get(`/foster/${animalId}`)
      .then((r) => setRows(r.data || []))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchRows(); }, [animalId]);

  const submit = async (e) => {
    e.preventDefault();
    if (!form.foster_user_id || !form.start_date) { setMsg('Foster user ID and start date are required.'); return; }
    try {
      await API.post('/foster', { animal_id: animalId, ...form });
      setForm({ foster_user_id: '', start_date: '' });
      setMsg('');
      fetchRows();
    } catch (err) {
      setMsg(err.response?.data?.error || 'Could not save placement.');
    }
  };

  const complete = async (placementId) => {
    try {
      await API.patch(`/foster/${placementId}/complete`, {});
      fetchRows();
    } catch {
      setMsg('Could not complete placement.');
    }
  };

  return (
    <div className="space-y-4">
      <form onSubmit={submit} className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <input
          className="input"
          placeholder="Foster user ID"
          value={form.foster_user_id}
          onChange={(e) => setForm((f) => ({ ...f, foster_user_id: e.target.value }))}
        />
        <input
          type="date"
          className="input"
          value={form.start_date}
          onChange={(e) => setForm((f) => ({ ...f, start_date: e.target.value }))}
        />
        <button type="submit" className="btn-primary btn-sm">Start placement</button>
      </form>
      {msg && <p className="text-xs text-red-600 dark:text-red-400">{msg}</p>}

      {loading ? (
        <div className="skeleton h-10 rounded-lg" />
      ) : rows.length === 0 ? (
        <p className="text-sm text-forest-500 dark:text-forest-400">No foster placements yet.</p>
      ) : (
        <div className="space-y-2">
          {rows.map((f) => (
            <div key={f.placement_id} className="surface-muted flex flex-wrap items-center justify-between gap-2 rounded-xl p-3 text-sm">
              <div>
                <span className="font-medium text-forest-900 dark:text-cream-100">{f.foster_user_name || `User #${f.foster_user_id}`}</span>
                <p className="text-xs text-forest-400">
                  {new Date(f.start_date).toLocaleDateString('en-IN')}
                  {f.end_date && <> – {new Date(f.end_date).toLocaleDateString('en-IN')}</>}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={
                    f.status === 'active' ? 'badge-green' : f.status === 'completed' ? 'badge-blue' : 'badge-red'
                  }
                >
                  {f.status}
                </span>
                {f.status === 'active' && (
                  <button onClick={() => complete(f.placement_id)} className="btn-ghost btn-sm px-2 py-1 text-xs">
                    Complete
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function ManageAnimals() {
  const [animals, setAnimals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(emptyForm);
  const [image, setImage] = useState(null);
  const [editId, setEditId] = useState(null);
  const [msg, setMsg] = useState({ text: '', ok: true });
  const [submitting, setSubmitting] = useState(false);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [expandedId, setExpandedId] = useState(null);

  const toggleExpanded = (id) => setExpandedId((current) => (current === id ? null : id));

  const fetchAnimals = () => {
    setLoading(true);
    API.get('/animals')
      .then((r) => setAnimals(r.data || []))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchAnimals();
  }, []);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const reset = () => {
    setForm(emptyForm);
    setImage(null);
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
    if (image) fd.append('image', image);
    try {
      if (editId) {
        await API.put(`/animals/${editId}`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
        setMsg({ text: 'Animal updated successfully.', ok: true });
      } else {
        await API.post('/animals', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
        setMsg({ text: 'Animal added successfully.', ok: true });
      }
      reset();
      fetchAnimals();
    } catch {
      setMsg({ text: 'Error saving animal.', ok: false });
    } finally {
      setSubmitting(false);
    }
  };

  const startEdit = (animal) => {
    setForm({
      name: animal.name,
      species: animal.species,
      breed: animal.breed || '',
      age: animal.age || '',
      gender: animal.gender || 'Male',
      current_status: animal.current_status || 'reported',
      description: animal.description || '',
      existing_image_path: animal.image_path || '',
    });
    setImage(null);
    setEditId(animal.id);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const del = async (id) => {
    if (!confirm('Delete this animal record?')) return;
    await API.delete(`/animals/${id}`)
      .then(() => fetchAnimals())
      .catch(() => alert('Failed'));
  };

  const filtered = animals.filter(
    (animal) =>
      !search || `${animal.name} ${animal.breed} ${animal.species}`.toLowerCase().includes(search.toLowerCase())
  );

  const Field = ({ label, k, type = 'text', options, required = true, span = false }) => (
    <div className={span ? 'md:col-span-2' : ''}>
      <label className="label">{label}</label>
      {options ? (
        <select className="input" value={form[k]} onChange={set(k)}>
          {options.map((option) => (
            <option key={option} value={option}>{STATUS_LABELS[option] || option}</option>
          ))}
        </select>
      ) : type === 'textarea' ? (
        <textarea className="input resize-none" rows={3} value={form[k]} onChange={set(k)} />
      ) : (
        <input type={type} className="input" value={form[k]} onChange={set(k)} required={required} />
      )}
    </div>
  );

  return (
    <div className="max-w-6xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl text-forest-950 dark:text-cream-100">Manage animals</h1>
          <p className="mt-0.5 text-sm text-forest-500 dark:text-forest-400">{animals.length} animal records</p>
        </div>
        <button onClick={() => setShowForm((value) => !value)} className="btn-primary btn-sm">
          {showForm ? 'Close Form' : 'Add Animal'}
        </button>
      </div>

      {showForm && (
        <div className="card p-6">
          <h2 className="mb-5 text-lg text-forest-950 dark:text-cream-100">{editId ? 'Edit animal' : 'Add a new animal'}</h2>
          <form onSubmit={submit} className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Field label="Name *" k="name" />
            <Field label="Species" k="species" options={['dog', 'cat', 'others']} />
            <Field label="Breed" k="breed" />
            <Field label="Age (years)" k="age" type="number" />
            <Field label="Gender" k="gender" options={['Male', 'Female']} />
            <Field
              label="Status"
              k="current_status"
              options={['reported', 'under_care', 'fostered', 'available', 'adopted']}
              span
            />

            <div className="md:col-span-2">
              <label className="label">Description or personality notes</label>
              <textarea
                className="input resize-none"
                rows={3}
                value={form.description}
                onChange={set('description')}
                placeholder="Brief notes on temperament, history, or care requirements."
              />
            </div>

            <div className="md:col-span-2">
              <label className="label">Animal photo</label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setImage(e.target.files[0])}
                className="input cursor-pointer py-2 text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-terra-100 file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-terra-700 hover:file:bg-terra-200"
              />
              {form.existing_image_path && <p className="mt-1 text-xs text-forest-400">Current: {form.existing_image_path}</p>}
            </div>

            {msg.text && (
              <div
                className={`md:col-span-2 rounded-xl border p-3 text-sm ${
                  msg.ok
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-400'
                    : 'border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400'
                }`}
              >
                {msg.text}
              </div>
            )}

            <div className="md:col-span-2 flex gap-3">
              <button type="submit" disabled={submitting} className={`btn-primary flex-1 ${submitting ? 'opacity-70' : ''}`}>
                {submitting ? 'Saving' : editId ? 'Update Animal' : 'Add Animal'}
              </button>
              <button type="button" onClick={reset} className="btn-ghost px-6">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="card p-5">
        <div className="mb-4 flex items-center gap-3">
          <div className="relative max-w-xs flex-1">
            <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-forest-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search animals"
              className="input py-2 pl-9 text-sm"
            />
          </div>
          <span className="text-sm text-forest-400">{filtered.length} records</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-cream-200 dark:border-forest-800">
                {['Photo', 'Name', 'Species', 'Breed', 'Age', 'Status', ''].map((heading) => (
                  <th
                    key={heading}
                    className="pb-3 pr-4 text-left text-xs font-semibold uppercase tracking-wider text-forest-500 dark:text-forest-400"
                  >
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-cream-200 dark:divide-forest-800">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    <td colSpan={8} className="py-3">
                      <div className="skeleton h-8 rounded-lg" />
                    </td>
                  </tr>
                ))
              ) : (
                filtered.map((animal) => (
                  <React.Fragment key={animal.id}>
                  <tr className="transition-colors hover:bg-cream-50 dark:hover:bg-forest-800/50">
                    <td className="py-3 pr-4">
                      <img
                        src={animal.image_path}
                        alt={animal.name}
                        className="h-10 w-10 rounded-xl object-cover"
                        onError={(e) => {
                          e.target.src = '/uploads/placeholder.png';
                        }}
                      />
                    </td>
                    <td className="py-3 pr-4 font-medium text-forest-900 dark:text-cream-100">{animal.name}</td>
                    <td className="py-3 pr-4 capitalize text-forest-500">{animal.species}</td>
                    <td className="py-3 pr-4 text-forest-500">{animal.breed}</td>
                    <td className="py-3 pr-4 text-forest-500">{animal.age}y</td>
                    <td className="py-3 pr-4">
                      <span
                        className={`${
                          animal.current_status === 'available'
                            ? 'badge-green'
                            : animal.current_status === 'adopted'
                              ? 'badge-blue'
                              : animal.current_status === 'under_care'
                                ? 'badge-amber'
                                : 'badge-red'
                        }`}
                      >
                        {STATUS_LABELS[animal.current_status] || animal.current_status}
                      </span>
                    </td>
                    <td className="py-3">
                      <div className="flex gap-2">
                        <button onClick={() => startEdit(animal)} className="btn-ghost btn-sm px-3 py-1.5">
                          Edit
                        </button>
                        <button
                          onClick={() => toggleExpanded(animal.id)}
                          className="rounded-lg border border-cream-300 bg-cream-50 px-3 py-1.5 text-xs font-medium text-forest-600 hover:bg-cream-100 dark:border-forest-700 dark:bg-forest-800 dark:text-forest-300"
                        >
                          {expandedId === animal.id ? 'Hide history' : 'History'}
                        </button>
                        <button
                          onClick={() => del(animal.id)}
                          className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-100 dark:border-red-900 dark:bg-red-900/20 dark:text-red-400"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                  {expandedId === animal.id && (
                    <tr>
                      <td colSpan={7} className="bg-cream-50/60 p-0 dark:bg-forest-900/40">
                        <AnimalHistoryPanel animalId={animal.id} />
                      </td>
                    </tr>
                  )}
                  </React.Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
