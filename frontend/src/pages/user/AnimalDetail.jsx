import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import API from '../../api/api';
import { useAuth } from '../../context/AuthContext';
import {
  ArrowLeftIcon,
  CalendarIcon,
  CatIcon,
  DogIcon,
  GenderIcon,
  HomeIcon,
  MapPinIcon,
  PawIcon,
  ShieldCheckIcon,
  StethoscopeIcon,
  SyringeIcon,
} from '../../components/Icons';

function SpeciesIcon({ species }) {
  const normalized = species?.toLowerCase();
  if (normalized === 'dog') return <DogIcon className="h-4 w-4" />;
  if (normalized === 'cat') return <CatIcon className="h-4 w-4" />;
  return <PawIcon className="h-4 w-4" />;
}

function InfoRow({ icon: Icon, label, value, highlight }) {
  return (
    <div className="flex items-start gap-3 border-b border-cream-200 py-3 last:border-0 dark:border-forest-800">
      <div className="stat-icon h-9 w-9 rounded-lg">
        <Icon className="h-4 w-4" />
      </div>
      <div className="flex-1">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-forest-500 dark:text-forest-400">{label}</p>
        <p className={`mt-1 text-sm ${highlight ? 'text-terra-700 dark:text-terra-300' : 'text-forest-800 dark:text-cream-100'}`}>
          {value || 'Not provided'}
        </p>
      </div>
    </div>
  );
}

export default function AnimalDetail() {
  const { id } = useParams();
  const nav = useNavigate();
  const { user } = useAuth();
  const [animal, setAnimal] = useState(null);
  const [loading, setLoading] = useState(true);
  const [medicalRecords, setMedicalRecords] = useState([]);

  useEffect(() => {
    API.get(`/animals/${id}`)
      .then((r) => setAnimal(r.data))
      .catch(() => nav('/animals'))
      .finally(() => setLoading(false));
  }, [id, nav]);

  // Read-only medical history, fetched independently so a slow/failed
  // lookup never blocks the main animal profile from loading.
  useEffect(() => {
    API.get(`/medical/${id}`)
      .then((r) => setMedicalRecords(r.data || []))
      .catch(() => setMedicalRecords([]));
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen pt-20">
        <div className="page-container flex items-center justify-center py-20">
          <div className="flex flex-col items-center gap-4">
            <div className="h-12 w-12 animate-spin rounded-full border-4 border-terra-500 border-t-transparent" />
            <p className="text-sm text-forest-500 dark:text-forest-400">Loading animal profile</p>
          </div>
        </div>
      </div>
    );
  }

  if (!animal) {
    return (
      <div className="min-h-screen pt-20">
        <div className="page-container flex items-center justify-center py-20">
          <div className="card max-w-md p-8 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-terra-50 text-terra-600 dark:bg-terra-900/20 dark:text-terra-300">
              <PawIcon className="h-5 w-5" />
            </div>
            <h2 className="text-2xl text-forest-950 dark:text-cream-100">Profile unavailable</h2>
            <p className="mt-2 text-sm text-forest-500 dark:text-forest-400">
              This animal profile could not be found.
            </p>
            <Link to="/animals" className="btn-primary mt-6 inline-flex">
              <ArrowLeftIcon className="h-4 w-4" />
              Back to Animals
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const canAdopt = animal.up_for_adoption === 'Up for adoption';
  const statusColor =
    canAdopt ? 'badge-orange' : animal.up_for_adoption === 'Adopted' ? 'badge-blue' : 'badge-red';

  return (
    <div className="min-h-screen pb-16 pt-8">
      <div className="page-container">
        <div className="mb-8 flex flex-wrap items-center gap-2 text-sm text-forest-500 dark:text-forest-400">
          <Link to="/" className="hover:text-terra-600 dark:hover:text-terra-300">
            Home
          </Link>
          <span>/</span>
          <Link to="/animals" className="hover:text-terra-600 dark:hover:text-terra-300">
            Animals
          </Link>
          <span>/</span>
          <span className="text-forest-800 dark:text-cream-100">{animal.name}</span>
        </div>

        <div className="grid gap-8 lg:grid-cols-5">
          <div className="space-y-5 lg:col-span-3">
            <div className="overflow-hidden rounded-2xl border border-cream-300 bg-white dark:border-forest-800 dark:bg-forest-900">
              <img
                src={animal.image_path}
                alt={animal.name}
                className="h-80 w-full object-cover md:h-[460px]"
                onError={(e) => {
                  e.target.src = '/uploads/placeholder.png';
                }}
              />
              <div className="space-y-4 border-t border-cream-200 p-6 dark:border-forest-800">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <h1 className="text-3xl text-forest-950 dark:text-cream-100 md:text-4xl">{animal.name}</h1>
                    <p className="mt-2 text-sm capitalize text-forest-500 dark:text-forest-400">
                      {animal.breed || animal.species}
                    </p>
                  </div>
                  <span className={`${statusColor} self-start`}>{animal.up_for_adoption}</span>
                </div>

                <div className="flex flex-wrap gap-2">
                  <span className="badge badge-terra">
                    <SpeciesIcon species={animal.species} />
                    <span className="capitalize">{animal.species}</span>
                  </span>
                  <span className="badge badge-terra">
                    <CalendarIcon className="h-3.5 w-3.5" />
                    {animal.age} year{animal.age !== 1 ? 's' : ''} old
                  </span>
                  <span className="badge badge-terra">
                    <GenderIcon className="h-3.5 w-3.5" />
                    {animal.gender}
                  </span>
                  {animal.health_status === 'Healthy' && (
                    <span className="badge badge-orange">
                      <ShieldCheckIcon className="h-3.5 w-3.5" />
                      Healthy
                    </span>
                  )}
                  {animal.vaccination_status === 'Vaccinated' && (
                    <span className="badge badge-blue">
                      <SyringeIcon className="h-3.5 w-3.5" />
                      Vaccinated
                    </span>
                  )}
                  {animal.health_status === 'Needs treatment' && (
                    <span className="badge badge-amber">
                      <StethoscopeIcon className="h-3.5 w-3.5" />
                      Needs treatment
                    </span>
                  )}
                </div>
              </div>
            </div>

            {animal.description && (
              <div className="card p-6">
                <h2 className="text-xl text-forest-950 dark:text-cream-100">Profile summary</h2>
                <p className="mt-3 text-sm leading-7 text-forest-600 dark:text-forest-300">{animal.description}</p>
              </div>
            )}

            {medicalRecords.length > 0 && (
              <div className="card p-6">
                <h2 className="text-xl text-forest-950 dark:text-cream-100">Medical history</h2>
                <div className="mt-3 space-y-3">
                  {medicalRecords.map((m) => (
                    <div key={m.record_id} className="flex items-start gap-3 border-b border-cream-200 pb-3 last:border-0 last:pb-0 dark:border-forest-800">
                      <div className="stat-icon h-9 w-9 rounded-lg">
                        {m.record_type === 'vaccination' ? <SyringeIcon className="h-4 w-4" /> : <StethoscopeIcon className="h-4 w-4" />}
                      </div>
                      <div className="flex-1">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="text-sm font-medium capitalize text-forest-800 dark:text-cream-100">{m.record_type}</p>
                          <p className="text-xs text-forest-400">{new Date(m.record_date).toLocaleDateString('en-IN')}</p>
                        </div>
                        {m.condition_notes && (
                          <p className="mt-1 text-sm text-forest-600 dark:text-forest-300">{m.condition_notes}</p>
                        )}
                        {m.record_type === 'vaccination' && (m.vaccine_name || m.next_due_date) && (
                          <p className="mt-1 text-xs text-terra-700 dark:text-terra-300">
                            {m.vaccine_name && <>{m.vaccine_name}</>}
                            {m.vaccine_name && m.next_due_date && ' · '}
                            {m.next_due_date && <>Next due {new Date(m.next_due_date).toLocaleDateString('en-IN')}</>}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="space-y-5 lg:col-span-2">
            <div className="card p-6">
              <h2 className="text-xl text-forest-950 dark:text-cream-100">Care details</h2>
              <div className="mt-3">
                <InfoRow icon={PawIcon} label="Species" value={animal.species} />
                <InfoRow icon={PawIcon} label="Breed" value={animal.breed} />
                <InfoRow icon={CalendarIcon} label="Age" value={`${animal.age} year${animal.age !== 1 ? 's' : ''}`} />
                <InfoRow icon={GenderIcon} label="Gender" value={animal.gender} />
                <InfoRow icon={StethoscopeIcon} label="Health status" value={animal.health_status} highlight />
                <InfoRow icon={SyringeIcon} label="Vaccination" value={animal.vaccination_status} />
              </div>
            </div>

            <div className="card p-6">
              <h2 className="text-xl text-forest-950 dark:text-cream-100">Location</h2>
              <div className="mt-3">
                <InfoRow icon={MapPinIcon} label="Found at" value={animal.location_found} />
                <InfoRow icon={HomeIcon} label="Currently staying at" value={animal.current_location} />
              </div>
            </div>

            <div className="card p-6">
              {canAdopt ? (
                <>
                  <div className="rounded-xl border border-terra-200 bg-terra-50 p-4 dark:border-terra-900/50 dark:bg-terra-900/20">
                    <p className="text-sm font-medium text-terra-700 dark:text-terra-300">
                      This animal is currently available for adoption.
                    </p>
                  </div>
                  {user ? (
                    <Link to={`/adopt/${animal.id}`} className="btn-primary mt-4 w-full justify-center">
                      Continue to Adoption Form
                    </Link>
                  ) : (
                    <div className="mt-4 space-y-3">
                      <Link to="/" className="btn-primary w-full justify-center">
                        Sign In to Apply
                      </Link>
                      <p className="text-center text-sm text-forest-500 dark:text-forest-400">
                        New here?{' '}
                        <Link to="/register" className="font-medium text-terra-600 hover:text-terra-700 dark:text-terra-300">
                          Create an account
                        </Link>
                      </p>
                    </div>
                  )}
                </>
              ) : (
                <div
                  className={`rounded-xl border p-4 ${
                    animal.up_for_adoption === 'Adopted'
                      ? 'border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-900/20'
                      : 'border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-900/20'
                  }`}
                >
                  <p
                    className={`text-sm font-medium ${
                      animal.up_for_adoption === 'Adopted'
                        ? 'text-blue-700 dark:text-blue-300'
                        : 'text-red-700 dark:text-red-300'
                    }`}
                  >
                    {animal.up_for_adoption === 'Adopted'
                      ? 'This animal has already been placed in a home.'
                      : 'This animal is not currently available for adoption.'}
                  </p>
                </div>
              )}

              <Link to="/animals" className="btn-ghost mt-4 w-full justify-center">
                <ArrowLeftIcon className="h-4 w-4" />
                Back to Animal Listings
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
