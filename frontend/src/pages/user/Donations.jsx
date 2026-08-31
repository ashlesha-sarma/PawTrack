import React, { useEffect, useState } from 'react';
import API from '../../api/api';
import DonationCard from '../../components/DonationCard';
import { SkeletonCard } from '../../components/Skeleton';
import { CheckCircleIcon, HeartIcon } from '../../components/Icons';

function AnimatedNumber({ value, prefix = '', suffix = '' }) {
  const [displayed, setDisplayed] = useState(0);

  useEffect(() => {
    if (!value) return;
    let start = null;
    const duration = 1200;
    const from = 0;
    const to = value;
    const step = (ts) => {
      if (!start) start = ts;
      const progress = Math.min((ts - start) / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 4);
      setDisplayed(Math.round(from + (to - from) * ease));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [value]);

  return (
    <span>
      {prefix}{displayed.toLocaleString('en-IN')}{suffix}
    </span>
  );
}

export default function Donations() {
  const [drives, setDrives] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    API.get('/donations/drives')
      .then((r) => setDrives(r.data || []))
      .finally(() => setLoading(false));
  }, []);

  const active = drives.filter((d) => d.is_active);
  const closed = drives.filter((d) => !d.is_active);
  const totalRaised  = drives.reduce((sum, d) => sum + (d.raised_amount  || 0), 0);
  const totalGoal    = drives.reduce((sum, d) => sum + (d.target_amount  || 0), 0);
  const totalDonors  = drives.reduce((sum, d) => sum + (d.donor_count    || 0), 0);
  const pctFunded    = totalGoal > 0 ? Math.round((totalRaised / totalGoal) * 100) : 0;

  return (
    <div className="min-h-screen pb-20">
      {/* ── Hero / header ─────────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden pt-14 pb-10 donation-hero-gradient">
        {/* decorative blobs */}
        <div
          className="pointer-events-none absolute -top-24 -right-24 h-96 w-96 rounded-full opacity-40"
          style={{ background: 'radial-gradient(circle, #eda070 0%, transparent 70%)' }}
        />
        <div
          className="pointer-events-none absolute bottom-0 -left-16 h-64 w-64 rounded-full opacity-30"
          style={{ background: 'radial-gradient(circle, #d95a2e 0%, transparent 70%)' }}
        />

        <div className="page-container relative z-10">
          <p className="section-kicker">Welfare Funding</p>
          <h1 className="section-title mt-2 max-w-xl">
            Support campus animals in need
          </h1>
          <p className="mt-3 max-w-lg text-sm leading-7 text-forest-600 dark:text-forest-300">
            Contributions fund veterinary care, vaccination, food, recovery, and temporary shelter
            for stray and campus animals at Tezpur University.
          </p>

          {/* Summary stats */}
          {!loading && drives.length > 0 && (
            <div
              className="mt-8 grid gap-4 sm:grid-cols-2 max-w-xl"
              style={{ animation: 'slide-up-fade 0.6s ease both' }}
            >
              {[
                {
                  icon: HeartIcon,
                  label: 'Total raised',
                  value: <AnimatedNumber value={totalRaised} prefix="₹" />,
                  color: 'text-terra-600',
                  bg: 'bg-terra-50',
                  border: 'border-terra-200',
                },

                {
                  icon: CheckCircleIcon,
                  label: 'Overall funded',
                  value: <AnimatedNumber value={pctFunded} suffix="%" />,
                  color: 'text-terra-700',
                  bg: 'bg-terra-50',
                  border: 'border-terra-200',
                },
              ].map((stat) => {
                const Icon = stat.icon;
                return (
                  <div
                    key={stat.label}
                    className={`glass-card flex items-center gap-4 p-4 ${stat.bg} ${stat.border} bg-opacity-60`}
                  >
                    <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl ${stat.bg} ${stat.color}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-xs text-forest-500">{stat.label}</p>
                      <p className={`mt-0.5 text-xl font-bold ${stat.color}`}>{stat.value}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Campaign lists ─────────────────────────────────────────────────────── */}
      <div className="page-container pt-10">
        {/* Active */}
        {(loading || active.length > 0) && (
          <section className="mb-14">
            <div className="mb-6 flex items-center gap-3">
              <span className="relative flex h-3 w-3">
                <span className="absolute inline-flex h-full w-full rounded-full bg-terra-400 opacity-75 animate-ping" />
                <span className="relative inline-flex h-3 w-3 rounded-full bg-terra-500" />
              </span>
              <h2 className="text-2xl text-forest-950 dark:text-cream-100">Active campaigns</h2>
              {!loading && (
                <span className="ml-1 rounded-full bg-terra-100 px-2.5 py-0.5 text-xs font-semibold text-terra-700 dark:bg-terra-900/30 dark:text-terra-300">
                  {active.length}
                </span>
              )}
            </div>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {loading
                ? Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} />)
                : active.map((drive) => <DonationCard key={drive.id} drive={drive} />)
              }
            </div>
          </section>
        )}

        {/* Closed */}
        {!loading && closed.length > 0 && (
          <section>
            <div className="mb-6 flex items-center gap-3">
              <div className="h-3 w-3 rounded-full bg-forest-300 dark:bg-forest-600" />
              <h2 className="text-2xl text-forest-950 dark:text-cream-100">Completed campaigns</h2>
              <span className="ml-1 rounded-full bg-cream-200 px-2.5 py-0.5 text-xs font-semibold text-forest-500 dark:bg-forest-800 dark:text-forest-400">
                {closed.length}
              </span>
            </div>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {closed.map((drive) => <DonationCard key={drive.id} drive={drive} />)}
            </div>
          </section>
        )}

        {/* Empty state */}
        {!loading && drives.length === 0 && (
          <div className="glass-card py-20 text-center mx-auto max-w-md">
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-terra-50 text-terra-500">
              <HeartIcon className="h-8 w-8" />
            </div>
            <h3 className="text-2xl text-forest-950 dark:text-cream-100">No donation drives yet</h3>
            <p className="mx-auto mt-2 max-w-xs text-sm text-forest-500 dark:text-forest-400">
              Campaigns will appear here when new support requirements are published.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
