import React from 'react';
import { Link } from 'react-router-dom';
import {
  CatIcon,
  DogIcon,
  GenderIcon,
  MapPinIcon,
  PawIcon,
  ShieldCheckIcon,
  StethoscopeIcon,
  SyringeIcon,
} from './Icons';

const STATUS_STYLES = {
  'Up for adoption': 'status-adoptable',
  Adopted: 'status-adopted',
  'Cannot be adopted': 'status-unavailable',
};

function SpeciesIcon({ species }) {
  const normalized = species?.toLowerCase();
  if (normalized === 'dog') return <DogIcon className="h-4 w-4" />;
  if (normalized === 'cat') return <CatIcon className="h-4 w-4" />;
  return <PawIcon className="h-4 w-4" />;
}

export default function AnimalCard({ animal }) {
  const statusClass = STATUS_STYLES[animal.up_for_adoption] || 'badge-amber';
  const canAdopt = animal.up_for_adoption === 'Up for adoption';

  return (
    <article className="card-hover group overflow-hidden">
      <div className="relative h-56 overflow-hidden bg-cream-200 dark:bg-forest-800">
        <img
          src={animal.image_path}
          alt={animal.name}
          className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-[1.02]"
          onError={(e) => {
            e.target.src = '/uploads/placeholder.png';
          }}
        />

        <div className="absolute left-4 top-4 flex items-center gap-2 rounded-full border border-white/80 bg-white/90 px-3 py-1 text-xs font-medium text-forest-800">
          <SpeciesIcon species={animal.species} />
          <span className="capitalize">{animal.species || 'Animal'}</span>
        </div>

        <div className="absolute bottom-4 left-4">
          <span className={`${statusClass} shadow-sm`}>{animal.up_for_adoption}</span>
        </div>
      </div>

      <div className="flex flex-col gap-4 p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-xl text-forest-950 dark:text-cream-100">{animal.name}</h3>
            <p className="mt-1 text-sm text-forest-500 dark:text-forest-400 capitalize">
              {animal.breed || animal.species}
            </p>
          </div>
          <div className="flex items-center gap-1 text-sm text-forest-500 dark:text-forest-400">
            <GenderIcon className="h-4 w-4" />
            <span>
              {animal.age} year{animal.age !== 1 ? 's' : ''}, {animal.gender}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
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

        <div className="flex items-start gap-2 text-sm text-forest-500 dark:text-forest-400">
          <MapPinIcon className="mt-0.5 h-4 w-4 flex-shrink-0 text-terra-500" />
          <span className="line-clamp-2">{animal.current_location || animal.location_found || 'Location not available'}</span>
        </div>

        <div className="grid gap-2 pt-1 sm:grid-cols-2">
          <Link to={`/home/animals/${animal.id}`} className="btn-ghost btn-sm justify-center">
            View Details
          </Link>
          {canAdopt && (
            <Link to={`/home/adopt/${animal.id}`} className="btn-primary btn-sm justify-center">
              Apply to Adopt
            </Link>
          )}
        </div>
      </div>
    </article>
  );
}
