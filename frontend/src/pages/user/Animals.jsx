import React, { useEffect, useMemo, useState } from 'react';
import API from '../../api/api';
import AnimalCard from '../../components/AnimalCard';
import { SkeletonCard } from '../../components/Skeleton';
import { FilterIcon, SearchIcon } from '../../components/Icons';

const SPECIES = ['All', 'Dog', 'Cat'];
const STATUSES = ['All', 'Up for adoption', 'Adopted', 'Cannot be adopted'];
const HEALTH = ['All', 'Healthy', 'Needs treatment'];
const GENDERS = ['All', 'Male', 'Female'];
const VACCINATED = ['All', 'Vaccinated', 'Not vaccinated'];

function FilterChip({ label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
        active
          ? 'border-terra-500 bg-terra-500 text-white'
          : 'border-cream-300 bg-white text-forest-700 hover:border-terra-300 hover:bg-terra-50 dark:border-forest-700 dark:bg-forest-900 dark:text-forest-300 dark:hover:bg-forest-800'
      }`}
    >
      {label}
    </button>
  );
}

function FilterSection({ title, options, value, onChange }) {
  return (
    <div className="mb-6">
      <p className="mb-2.5 text-xs font-semibold uppercase tracking-[0.14em] text-forest-500 dark:text-forest-400">
        {title}
      </p>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => (
          <FilterChip key={option} label={option} active={value === option} onClick={() => onChange(option)} />
        ))}
      </div>
    </div>
  );
}

export default function Animals() {
  const [animals, setAnimals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [species, setSpecies] = useState('All');
  const [status, setStatus] = useState('All');
  const [health, setHealth] = useState('All');
  const [gender, setGender] = useState('All');
  const [vaccinated, setVaccinated] = useState('All');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    API.get('/animals')
      .then((r) => setAnimals(r.data || []))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const lq = q.trim().toLowerCase();
    return animals.filter((a) => {
      if (species !== 'All' && a.species?.toLowerCase() !== species.toLowerCase()) return false;
      if (status !== 'All' && a.up_for_adoption !== status) return false;
      if (health !== 'All' && a.health_status !== health) return false;
      if (gender !== 'All' && a.gender !== gender) return false;
      if (vaccinated !== 'All' && a.vaccination_status !== vaccinated) return false;
      if (lq) {
        const hay = `${a.name} ${a.breed} ${a.location_found} ${a.current_location} ${a.description}`.toLowerCase();
        if (!hay.includes(lq)) return false;
      }
      return true;
    });
  }, [animals, q, species, status, health, gender, vaccinated]);

  const hasFilters =
    species !== 'All' || status !== 'All' || health !== 'All' || gender !== 'All' || vaccinated !== 'All' || q;

  const resetFilters = () => {
    setSpecies('All');
    setStatus('All');
    setHealth('All');
    setGender('All');
    setVaccinated('All');
    setQ('');
  };

  const Filters = () => (
    <div>
      <div className="mb-5 flex items-center justify-between">
        <h3 className="text-lg text-forest-950 dark:text-cream-100">Refine results</h3>
        {hasFilters && (
          <button onClick={resetFilters} className="text-sm font-medium text-terra-600 hover:text-terra-700 dark:text-terra-300">
            Reset
          </button>
        )}
      </div>
      <FilterSection title="Species" options={SPECIES} value={species} onChange={setSpecies} />
      <FilterSection title="Adoption status" options={STATUSES} value={status} onChange={setStatus} />
      <FilterSection title="Health" options={HEALTH} value={health} onChange={setHealth} />
      <FilterSection title="Gender" options={GENDERS} value={gender} onChange={setGender} />
      <FilterSection title="Vaccination" options={VACCINATED} value={vaccinated} onChange={setVaccinated} />
    </div>
  );

  const availableCount = animals.filter((a) => a.up_for_adoption === 'Up for adoption').length;

  return (
    <div className="min-h-screen pb-16 pt-8">
      <div className="page-container">
        <div className="mb-8 max-w-2xl">
          <p className="section-kicker">Adoption Directory</p>
          <h1 className="section-title mt-2">Animals currently in care</h1>
          <p className="mt-3 text-sm leading-7 text-forest-500 dark:text-forest-400">
            Browse animal profiles, review their care details, and apply when you are ready to provide a safe and responsible home.
          </p>
        </div>

        <div className="mb-8 grid gap-4 md:grid-cols-3">
          <div className="card p-5">
            <p className="text-sm text-forest-500 dark:text-forest-400">Total profiles</p>
            <p className="mt-2 text-3xl font-semibold text-forest-950 dark:text-cream-100">{animals.length}</p>
          </div>
          <div className="card p-5">
            <p className="text-sm text-forest-500 dark:text-forest-400">Available for adoption</p>
            <p className="mt-2 text-3xl font-semibold text-forest-950 dark:text-cream-100">{availableCount}</p>
          </div>
          <div className="card p-5">
            <p className="text-sm text-forest-500 dark:text-forest-400">Current results</p>
            <p className="mt-2 text-3xl font-semibold text-forest-950 dark:text-cream-100">
              {loading ? '-' : filtered.length}
            </p>
          </div>
        </div>

        <div className="flex gap-8">
          <aside className="hidden w-72 flex-shrink-0 lg:block">
            <div className="card sticky top-24 p-5">
              <Filters />
            </div>
          </aside>

          <div className="min-w-0 flex-1">
            <div className="mb-6 flex flex-col gap-3 sm:flex-row">
              <div className="relative flex-1">
                <SearchIcon className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-forest-400" />
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Search by name, breed, or location"
                  className="input pl-10"
                />
              </div>
              <button onClick={() => setSidebarOpen(true)} className="btn-ghost lg:hidden">
                <FilterIcon className="h-4 w-4" />
                Filters
              </button>
            </div>

            <div className="mb-4 flex items-center justify-between gap-3">
              <p className="text-sm text-forest-500 dark:text-forest-400">
                {loading ? 'Loading animal profiles' : `${filtered.length} result${filtered.length !== 1 ? 's' : ''}`}
              </p>
            </div>

            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)
              ) : filtered.length === 0 ? (
                <div className="card col-span-full p-10 text-center">
                  <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-terra-50 text-terra-600 dark:bg-terra-900/20 dark:text-terra-300">
                    <SearchIcon className="h-5 w-5" />
                  </div>
                  <h3 className="text-xl text-forest-950 dark:text-cream-100">No matching profiles</h3>
                  <p className="mt-2 text-sm text-forest-500 dark:text-forest-400">
                    Adjust the filters or broaden your search to view more animals.
                  </p>
                  {hasFilters && (
                    <button onClick={resetFilters} className="btn-ghost btn-sm mt-4">
                      Clear Filters
                    </button>
                  )}
                </div>
              ) : (
                filtered.map((animal) => <AnimalCard key={animal.id} animal={animal} />)
              )}
            </div>
          </div>
        </div>
      </div>

      {sidebarOpen && (
        <>
          <div className="fixed inset-0 z-40 bg-black/40" onClick={() => setSidebarOpen(false)} />
          <div className="fixed bottom-0 left-0 right-0 z-50 max-h-[82vh] overflow-y-auto rounded-t-3xl border border-cream-200 bg-white p-6 dark:border-forest-800 dark:bg-forest-900">
            <div className="mx-auto mb-6 h-1.5 w-12 rounded-full bg-cream-300 dark:bg-forest-700" />
            <Filters />
            <button onClick={() => setSidebarOpen(false)} className="btn-primary mt-4 w-full justify-center">
              Show {filtered.length} Result{filtered.length !== 1 ? 's' : ''}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
