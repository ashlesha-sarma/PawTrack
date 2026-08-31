import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ClockIcon, HeartIcon } from './Icons';

function MiniProgressBar({ pct }) {
  const [display, setDisplay] = useState(0);
  const ref = useRef(null);
  const animated = useRef(false);

  useEffect(() => {
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !animated.current) {
          animated.current = true;
          let start = null;
          const duration = 900;
          const step = (ts) => {
            if (!start) start = ts;
            const progress = Math.min((ts - start) / duration, 1);
            const ease = 1 - Math.pow(1 - progress, 3);
            setDisplay(ease * pct);
            if (progress < 1) requestAnimationFrame(step);
          };
          requestAnimationFrame(step);
        }
      },
      { threshold: 0.5 }
    );
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, [pct]);

  return (
    <div ref={ref} className="progress-bar">
      <div className="progress-fill" style={{ width: `${display}%` }} />
    </div>
  );
}

export default function DonationCard({ drive }) {
  const pct = Math.min(100, Math.round((drive.raised_amount / drive.target_amount) * 100));
  const daysLeft = drive.deadline
    ? Math.max(0, Math.ceil((new Date(drive.deadline) - Date.now()) / 86400000))
    : null;

  return (
    <article
      className="group overflow-hidden rounded-2xl border border-cream-200 bg-white shadow-card transition-all duration-300 hover:-translate-y-1 hover:shadow-card-hover dark:border-forest-800 dark:bg-forest-900"
    >
      {/* Hero image */}
      <div className="relative h-48 overflow-hidden bg-cream-100 dark:bg-forest-800">
        {drive.photo ? (
          <img
            src={drive.photo}
            alt={drive.title}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            onError={(e) => { e.target.style.display = 'none'; }}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            {/* gradient placeholder */}
            <div className="absolute inset-0" style={{ background: 'linear-gradient(135deg, #fdf4ef 0%, #fae4d3 100%)' }} />
            <HeartIcon className="relative z-10 h-12 w-12 text-terra-400" />
          </div>
        )}

        {/* Badges */}
        <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
          {drive.is_active ? (
            <span className="flex items-center gap-1 rounded-full bg-terra-500 px-2.5 py-0.5 text-xs font-semibold text-white shadow-sm">
              <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse-soft" />
              Active
            </span>
          ) : (
            <span className="rounded-full bg-black/60 px-2.5 py-0.5 text-xs font-semibold text-white">
              Closed
            </span>
          )}
          {daysLeft !== null && drive.is_active && (
            <span className={`flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold text-white shadow-sm ${daysLeft <= 7 ? 'bg-red-500' : 'bg-amber-500'}`}>
              <ClockIcon className="h-3 w-3" />
              {daysLeft === 0 ? 'Final day' : `${daysLeft}d left`}
            </span>
          )}
        </div>

        {/* closed overlay */}
        {!drive.is_active && (
          <div className="absolute inset-0 bg-black/30 backdrop-blur-[1px]" />
        )}
      </div>

      {/* Content */}
      <div className="flex flex-col gap-4 p-5">
        <div>
          <h3 className="text-lg font-semibold leading-snug text-forest-950 group-hover:text-terra-600 transition-colors duration-200 dark:text-cream-100 dark:group-hover:text-terra-300">
            {drive.title}
          </h3>
          <p className="mt-1.5 line-clamp-2 text-sm leading-6 text-forest-500 dark:text-forest-400">
            {drive.description}
          </p>
        </div>

        {/* Progress section */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between text-sm">
            <span className="font-semibold text-terra-600 dark:text-terra-300">
              ₹{Number(drive.raised_amount).toLocaleString('en-IN')}
            </span>
            <span className="text-forest-500 dark:text-forest-400">
              of ₹{Number(drive.target_amount).toLocaleString('en-IN')}
            </span>
          </div>
          <MiniProgressBar pct={pct} />
          <div className="flex items-center text-xs text-forest-500 dark:text-forest-400">
            <span className="font-medium text-terra-600 dark:text-terra-300">{pct}% funded</span>
          </div>
        </div>

        {/* CTA */}
        {drive.is_active ? (
          <Link
            to={`/home/donations/${drive.id}`}
            className="btn-donate w-full"
          >
            <HeartIcon className="h-4 w-4" />
            Support This Campaign
          </Link>
        ) : (
          <button
            disabled
            className="inline-flex w-full cursor-not-allowed items-center justify-center rounded-xl border border-cream-200 bg-cream-50 py-3.5 text-sm font-medium text-forest-400 dark:border-forest-700 dark:bg-forest-800 dark:text-forest-500"
          >
            Campaign Closed
          </button>
        )}
      </div>
    </article>
  );
}
