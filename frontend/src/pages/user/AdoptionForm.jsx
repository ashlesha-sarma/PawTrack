import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import API from '../../api/api';
import { useAuth } from '../../context/AuthContext';
import { ArrowLeftIcon, CheckCircleIcon, HeartIcon, ShieldCheckIcon, SyringeIcon } from '../../components/Icons';

export default function AdoptionForm() {
  const { id } = useParams();
  const nav = useNavigate();
  const { user } = useAuth();
  const [animal, setAnimal] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    fullname: '',
    email: '',
    phone: '',
    address: '',
    reason: '',
    experience: 'No',
  });

  useEffect(() => {
    if (!user) {
      nav('/login');
      return;
    }
    API.get(`/animals/${id}`)
      .then((r) => setAnimal(r.data))
      .finally(() => setLoading(false));
    setForm((f) => ({ ...f, fullname: user.name || '', email: user.email || '' }));
  }, [id, nav, user]);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await API.post('/adoptions', { animal_id: id, ...form });
      setSuccess(true);
      setTimeout(() => nav('/profile'), 2000);
    } catch (e) {
      setError(e.response?.data?.error || 'Unable to submit the request. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
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
          <h2 className="text-2xl text-forest-950 dark:text-cream-100">Application received</h2>
          <p className="mt-3 text-sm leading-7 text-forest-500 dark:text-forest-400">
            Your adoption request for <strong>{animal?.name}</strong> has been submitted for review. You will be redirected to your profile shortly.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-16 pt-8">
      <div className="page-container max-w-5xl">
        <div className="mb-8 flex flex-wrap items-center gap-2 text-sm text-forest-500 dark:text-forest-400">
          <Link to="/animals" className="hover:text-terra-600 dark:hover:text-terra-300">
            Animals
          </Link>
          <span>/</span>
          <Link to={`/animals/${id}`} className="hover:text-terra-600 dark:hover:text-terra-300">
            {animal?.name}
          </Link>
          <span>/</span>
          <span className="text-forest-800 dark:text-cream-100">Adoption form</span>
        </div>

        <div className="grid gap-8 md:grid-cols-[320px_1fr]">
          {animal && (
            <aside className="md:sticky md:top-24 md:self-start">
              <div className="card overflow-hidden">
                <img
                  src={animal.image_path}
                  alt={animal.name}
                  className="h-56 w-full object-cover"
                  onError={(e) => {
                    e.target.src = '/uploads/placeholder.png';
                  }}
                />
                <div className="space-y-4 p-5">
                  <div>
                    <h2 className="text-xl text-forest-950 dark:text-cream-100">{animal.name}</h2>
                    <p className="mt-1 text-sm capitalize text-forest-500 dark:text-forest-400">
                      {animal.breed || animal.species}
                    </p>
                  </div>

                  <div className="space-y-3 text-sm text-forest-600 dark:text-forest-300">
                    <div className="flex items-center gap-2">
                      <HeartIcon className="h-4 w-4 text-terra-500" />
                      <span>
                        {animal.age} year{animal.age !== 1 ? 's' : ''}, {animal.gender}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <ShieldCheckIcon className="h-4 w-4 text-terra-500" />
                      <span>{animal.health_status}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <SyringeIcon className="h-4 w-4 text-terra-500" />
                      <span>{animal.vaccination_status}</span>
                    </div>
                  </div>

                  <div className="rounded-xl border border-cream-200 bg-cream-50 p-4 text-sm leading-6 text-forest-600 dark:border-forest-800 dark:bg-forest-800/70 dark:text-forest-300">
                    Please complete the form carefully so the adoption team can review suitability and follow up if needed.
                  </div>
                </div>
              </div>
            </aside>
          )}

          <div className="card p-6 md:p-8">
            <div className="mb-6">
              <p className="section-kicker">Adoption Request</p>
              <h1 className="mt-2 text-3xl text-forest-950 dark:text-cream-100">Application form</h1>
              <p className="mt-3 text-sm leading-7 text-forest-500 dark:text-forest-400">
                Share accurate information about your living arrangement, prior experience, and ability to provide ongoing care for {animal?.name}.
              </p>
            </div>

            <form onSubmit={submit} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="label">Full name</label>
                  <input className="input" required value={form.fullname} onChange={set('fullname')} placeholder="Your full name" />
                </div>
                <div>
                  <label className="label">Email address</label>
                  <input
                    className="input"
                    type="email"
                    required
                    value={form.email}
                    onChange={set('email')}
                    placeholder="name@example.com"
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="label">Phone number</label>
                  <input className="input" required value={form.phone} onChange={set('phone')} placeholder="+91 00000 00000" />
                </div>
                <div>
                  <label className="label">Previous pet experience</label>
                  <select className="input" value={form.experience} onChange={set('experience')}>
                    <option value="Yes">Yes, I have cared for pets before</option>
                    <option value="No">No, this would be my first experience</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="label">Address or primary residence</label>
                <textarea
                  className="input resize-none"
                  rows={3}
                  required
                  value={form.address}
                  onChange={set('address')}
                  placeholder="Provide the location where the animal will stay."
                />
              </div>

              <div>
                <label className="label">Why are you applying to adopt {animal?.name}?</label>
                <textarea
                  className="input resize-none"
                  rows={5}
                  required
                  value={form.reason}
                  onChange={set('reason')}
                  placeholder="Describe your daily routine, living environment, and the care you plan to provide."
                />
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
                {submitting ? 'Submitting application' : `Submit application for ${animal?.name}`}
              </button>

              <p className="text-center text-sm text-forest-500 dark:text-forest-400">
                The adoption team generally responds within two to three working days.
              </p>
            </form>

            <Link to={`/animals/${id}`} className="btn-ghost mt-5 inline-flex">
              <ArrowLeftIcon className="h-4 w-4" />
              Return to Animal Profile
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
