import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import API from '../../api/api';
import { useAuth } from '../../context/AuthContext';
import { getImageUrl } from '../../utils/imageUrl';
import { ArrowLeftIcon, CameraIcon, CheckCircleIcon, MapPinIcon } from '../../components/Icons';

const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/gif'];

const emptyForm = {
  location: '',
  notes: '',
  species: 'dog',
  name: '',
  breed: '',
  gender: 'Unknown',
  description: '',
};

const animalLabel = (a) => a.name || `Unnamed ${a.species}`;

export default function ReportSighting() {
  const nav = useNavigate();
  const [params] = useSearchParams();
  const { user, loading: authLoading } = useAuth();

  const [animals, setAnimals] = useState([]);
  const [animalsLoading, setAnimalsLoading] = useState(true);
  const [mode, setMode] = useState('known'); // 'known' | 'new'
  const [animalId, setAnimalId] = useState(params.get('animal') || '');
  const [search, setSearch] = useState('');
  const [form, setForm] = useState(emptyForm);
  const [photo, setPhoto] = useState(null);
  const [preview, setPreview] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  // Same auth-race guard as AdoptionForm: wait for /auth/me before redirecting.
  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      nav('/login');
      return;
    }
    API.get('/animals')
      .then((r) => setAnimals(r.data || []))
      .catch(() => setAnimals([]))
      .finally(() => setAnimalsLoading(false));
  }, [authLoading, user, nav]);

  // Local preview of the chosen photo.
  useEffect(() => {
    if (!photo) {
      setPreview(null);
      return undefined;
    }
    const url = URL.createObjectURL(photo);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [photo]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return animals;
    return animals.filter((a) => `${a.name || ''} ${a.breed || ''} ${a.species || ''}`.toLowerCase().includes(q));
  }, [animals, search]);

  const selected = animals.find((a) => String(a.id) === String(animalId));

  const onPhotoChange = (e) => {
    const file = e.target.files && e.target.files[0];
    setError('');
    if (!file) {
      setPhoto(null);
      return;
    }
    if (!ALLOWED_TYPES.includes(file.type)) {
      setError('Please choose a JPEG, PNG, WebP, AVIF or GIF photo.');
      e.target.value = '';
      setPhoto(null);
      return;
    }
    if (file.size > MAX_PHOTO_BYTES) {
      setError('The photo must be 5 MB or smaller.');
      e.target.value = '';
      setPhoto(null);
      return;
    }
    setPhoto(file);
  };

  const resetAll = () => {
    setForm(emptyForm);
    setPhoto(null);
    setAnimalId('');
    setSearch('');
    setMode('known');
    setError('');
    setSuccess(false);
  };

  const submit = async (e) => {
    e.preventDefault();
    setError('');

    if (mode === 'known' && !animalId) {
      setError('Please choose the animal you saw, or switch to "New animal".');
      return;
    }
    if (!form.location.trim()) {
      setError('Please tell us where you saw the animal.');
      return;
    }

    const fd = new FormData();
    fd.append('location', form.location.trim());
    fd.append('notes', form.notes.trim());
    if (mode === 'known') {
      fd.append('animal_id', animalId);
    } else {
      fd.append('species', form.species);
      fd.append('name', form.name.trim());
      fd.append('breed', form.breed.trim());
      fd.append('gender', form.gender);
      fd.append('description', form.description.trim());
    }
    if (photo) fd.append('image', photo);

    setSubmitting(true);
    try {
      await API.post('/sightings', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      setSuccess(true);
    } catch (err) {
      setError(err.response?.data?.error || 'Unable to submit the report. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (authLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-terra-500 border-t-transparent" />
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="card max-w-md p-10 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300">
            <CheckCircleIcon className="h-6 w-6" />
          </div>
          <h2 className="text-2xl text-forest-950 dark:text-cream-100">Report submitted</h2>
          <p className="mt-3 text-sm leading-7 text-forest-500 dark:text-forest-400">
            Thank you for helping. A moderator will review your report and, once verified, arrange help for the animal.
            You can follow its status on your profile.
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Link to="/home/profile" className="btn-primary justify-center">
              View my reports
            </Link>
            <button type="button" onClick={resetAll} className="btn-ghost justify-center">
              Report another
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-16 pt-8">
      <div className="page-container max-w-3xl">
        <div className="mb-8">
          <p className="section-kicker">Stray Sighting</p>
          <h1 className="section-title mt-2">Report a sighting</h1>
          <p className="mt-3 text-sm leading-7 text-forest-500 dark:text-forest-400">
            Spotted a campus animal that may need help? Tell us where you saw it. A moderator will verify the report and
            arrange care or rescue.
          </p>
        </div>

        <form onSubmit={submit} className="card space-y-6 p-6 md:p-8">
          {/* Known / new toggle */}
          <div>
            <label className="label">Which animal did you see?</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setMode('known')}
                className={mode === 'known' ? 'btn-primary justify-center' : 'btn-ghost justify-center'}
              >
                Animal already listed
              </button>
              <button
                type="button"
                onClick={() => setMode('new')}
                className={mode === 'new' ? 'btn-primary justify-center' : 'btn-ghost justify-center'}
              >
                New animal
              </button>
            </div>
          </div>

          {mode === 'known' ? (
            <div className="space-y-3">
              <input
                className="input"
                placeholder="Search by name, breed or species"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              {selected && (
                <p className="text-sm text-terra-700 dark:text-terra-300">
                  Selected: <strong>{animalLabel(selected)}</strong>
                </p>
              )}
              <div className="max-h-64 space-y-2 overflow-y-auto rounded-xl border border-cream-300 p-2 dark:border-forest-700">
                {animalsLoading ? (
                  <div className="skeleton h-12 rounded-lg" />
                ) : filtered.length === 0 ? (
                  <p className="p-3 text-sm text-forest-500 dark:text-forest-400">
                    No matching animals. Try a different search or report a new animal.
                  </p>
                ) : (
                  filtered.map((a) => (
                    <button
                      type="button"
                      key={a.id}
                      onClick={() => setAnimalId(String(a.id))}
                      className={`flex w-full items-center gap-3 rounded-lg border p-2 text-left transition-colors ${
                        String(a.id) === String(animalId)
                          ? 'border-terra-500 bg-terra-50 dark:bg-terra-900/20'
                          : 'border-transparent hover:bg-cream-50 dark:hover:bg-forest-800'
                      }`}
                    >
                      <img
                        src={getImageUrl(a.image_path)}
                        alt=""
                        className="h-10 w-10 flex-shrink-0 rounded-lg object-cover"
                        onError={(e) => {
                          e.currentTarget.onerror = null;
                          e.currentTarget.src = '/placeholder.png';
                        }}
                      />
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium text-forest-900 dark:text-cream-100">
                          {animalLabel(a)}
                        </span>
                        <span className="block truncate text-xs capitalize text-forest-500 dark:text-forest-400">
                          {a.breed || a.species}
                        </span>
                      </span>
                    </button>
                  ))
                )}
              </div>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="label">Species *</label>
                <select className="input" value={form.species} onChange={set('species')}>
                  <option value="dog">Dog</option>
                  <option value="cat">Cat</option>
                  <option value="others">Other</option>
                </select>
              </div>
              <div>
                <label className="label">Gender</label>
                <select className="input" value={form.gender} onChange={set('gender')}>
                  <option value="Unknown">Not sure</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                </select>
              </div>
              <div>
                <label className="label">Name (if you know it)</label>
                <input className="input" maxLength={150} value={form.name} onChange={set('name')} placeholder="Optional" />
              </div>
              <div>
                <label className="label">Breed or look</label>
                <input className="input" maxLength={100} value={form.breed} onChange={set('breed')} placeholder="e.g. brown street dog" />
              </div>
              <div className="sm:col-span-2">
                <label className="label">Appearance and condition</label>
                <textarea
                  className="input resize-none"
                  rows={3}
                  maxLength={1000}
                  value={form.description}
                  onChange={set('description')}
                  placeholder="Colour, size, injuries, behaviour"
                />
              </div>
            </div>
          )}

          <div>
            <label className="label">
              <MapPinIcon className="mr-1 inline h-4 w-4 text-terra-500" />
              Where did you see it? *
            </label>
            <input
              className="input"
              required
              maxLength={255}
              value={form.location}
              onChange={set('location')}
              placeholder="e.g. Near the main library gate"
            />
          </div>

          <div>
            <label className="label">Notes</label>
            <textarea
              className="input resize-none"
              rows={4}
              maxLength={1000}
              value={form.notes}
              onChange={set('notes')}
              placeholder="What did you notice? Is the animal injured, hungry, or in danger?"
            />
          </div>

          <div>
            <label className="label">
              <CameraIcon className="mr-1 inline h-4 w-4 text-terra-500" />
              Photo (optional)
            </label>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/avif,image/gif"
              onChange={onPhotoChange}
              className="input cursor-pointer py-2 text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-terra-100 file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-terra-700 hover:file:bg-terra-200"
            />
            <p className="mt-1 text-xs text-forest-400">JPEG, PNG, WebP, AVIF or GIF, up to 5 MB.</p>
            {preview && (
              <img
                src={preview}
                alt="Selected preview"
                className="mt-3 h-40 w-40 rounded-xl border border-cream-300 object-cover dark:border-forest-700"
              />
            )}
          </div>

          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-900/20 dark:text-red-300">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className={`btn-primary w-full justify-center py-3 ${submitting ? 'opacity-70' : ''}`}
          >
            {submitting ? 'Submitting report' : 'Submit report'}
          </button>

          <Link to="/home/animals" className="btn-ghost inline-flex">
            <ArrowLeftIcon className="h-4 w-4" />
            Back to animals
          </Link>
        </form>
      </div>
    </div>
  );
}
