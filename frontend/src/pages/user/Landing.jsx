import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import API from '../../api/api';
import AnimalCard from '../../components/AnimalCard';
import { SkeletonCard } from '../../components/Skeleton';
import {
  ArrowRightIcon,
  CheckCircleIcon,
  ClipboardIcon,
  HeartIcon,
  HomeIcon,
  PawIcon,
  SearchIcon,
  ShieldCheckIcon,
} from '../../components/Icons';

function useCountUp(target, duration = 1500, start = false) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!start || !target) return;
    const steps = 40;
    const inc = target / steps;
    let current = 0;
    const timer = setInterval(() => {
      current = Math.min(current + inc, target);
      setCount(Math.round(current));
      if (current >= target) clearInterval(timer);
    }, duration / steps);
    return () => clearInterval(timer);
  }, [target, duration, start]);

  return count;
}

function StatCard({ icon: Icon, label, value, started, suffix = '+' }) {
  const count = useCountUp(value, 1200, started);

  return (
    <div className="card p-5">
      <div className="stat-icon mb-4">
        <Icon className="h-5 w-5" />
      </div>
      <p className="text-3xl font-semibold text-forest-950 dark:text-cream-100">
        {count}
        {suffix}
      </p>
      <p className="mt-1 text-sm text-forest-500 dark:text-forest-400">{label}</p>
    </div>
  );
}

const STEPS = [
  {
    icon: SearchIcon,
    title: 'Review available animals',
    desc: 'Read each profile carefully, including health notes, temperament, and current location.',
  },
  {
    icon: ClipboardIcon,
    title: 'Submit an adoption request',
    desc: 'Complete the application form so the team can understand your home environment and readiness.',
  },
  {
    icon: ShieldCheckIcon,
    title: 'Application review',
    desc: 'Requests are reviewed to match each animal with a safe, suitable, and responsible home.',
  },
  {
    icon: HomeIcon,
    title: 'Prepare for placement',
    desc: 'Once approved, the team coordinates next steps for care guidance and transition support.',
  },
];

export default function Landing() {
  const [featured, setFeatured] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statsVisible, setStatsVisible] = useState(false);
  const statsRef = useRef(null);

  useEffect(() => {
    API.get('/animals')
      .then((r) => {
        const adoptable = (r.data || [])
          .filter((a) => a.up_for_adoption === 'Up for adoption')
          .slice(0, 3);
        setFeatured(adoptable);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const obs = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) setStatsVisible(true);
    }, { threshold: 0.3 });

    if (statsRef.current) obs.observe(statsRef.current);
    return () => obs.disconnect();
  }, []);

  return (
    <div className="overflow-x-hidden">
      <section className="bg-hero-pattern border-b border-cream-200 pt-20 dark:border-forest-800 dark:bg-forest-950">
        <div className="page-container py-16 md:py-20">
          <div className="grid items-center gap-12 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="max-w-2xl space-y-6">
              <p className="section-kicker">University Animal Welfare Initiative</p>
              <h1 className="max-w-3xl text-4xl leading-tight text-forest-950 dark:text-cream-100 md:text-5xl lg:text-6xl">
                Responsible adoption and support for campus animals.
              </h1>
              <p className="max-w-xl text-lg leading-8 text-forest-600 dark:text-forest-300">
                PawTrack helps students and animal caregivers connect through adoption, treatment support, and community-led welfare initiatives.
              </p>

              <div className="flex flex-wrap gap-3">
                <Link to="/home/animals" className="btn-primary">
                  View Animals
                </Link>
                <Link to="/home/donations" className="btn-ghost">
                  Support Care Efforts
                </Link>
              </div>


            </div>

            <div className="space-y-4">
              <div className="card overflow-hidden">
                <img
                  src="/uploads/milo.jpg"
                  alt="Animal waiting for adoption"
                  className="h-[320px] w-full object-cover"
                  onError={(e) => {
                    e.target.src = '/uploads/placeholder.png';
                  }}
                />
                <div className="border-t border-cream-200 p-5 dark:border-forest-800">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-medium text-forest-950 dark:text-cream-100">Adoption and welfare support</p>
                      <p className="mt-1 text-sm leading-6 text-forest-500 dark:text-forest-400">
                        Browse animals, review campaign needs, and stay informed about welfare updates on campus.
                      </p>
                    </div>
                    <div className="stat-icon">
                      <PawIcon className="h-5 w-5" />
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="card p-5">
                  <p className="text-sm font-medium text-forest-950 dark:text-cream-100">Adoption process</p>
                  <p className="mt-2 text-sm leading-6 text-forest-500 dark:text-forest-400">
                    Clear application steps designed to help each placement remain safe and sustainable.
                  </p>
                </div>
                <div className="card p-5">
                  <p className="text-sm font-medium text-forest-950 dark:text-cream-100">Welfare funding</p>
                  <p className="mt-2 text-sm leading-6 text-forest-500 dark:text-forest-400">
                    Donation drives help cover treatment, vaccination, recovery, and day-to-day care.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section ref={statsRef} className="py-16">
        <div className="page-container">
          <div className="mb-8 flex items-end justify-between gap-6">
            <div>
              <p className="section-kicker">Current Impact</p>
              <h2 className="section-title mt-2">A growing campus support network</h2>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <StatCard icon={PawIcon} label="Animals supported" value={42} started={statsVisible} />
            <StatCard icon={HomeIcon} label="Completed adoptions" value={15} started={statsVisible} />
            <StatCard icon={HeartIcon} label="Volunteer contributors" value={30} started={statsVisible} />
            <StatCard icon={CheckCircleIcon} label="Funding raised in thousands" value={60} started={statsVisible} suffix="" />
          </div>
        </div>
      </section>

      <section className="border-y border-cream-200 bg-white py-20 dark:border-forest-800 dark:bg-forest-950">
        <div className="page-container">
          <div className="mb-10 max-w-2xl">
            <p className="section-kicker">Adoption Process</p>
            <h2 className="section-title mt-2">How the process works</h2>
          </div>

          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
            {STEPS.map((step, index) => {
              const Icon = step.icon;
              return (
                <div key={step.title} className="card p-5">
                  <div className="mb-4 flex items-center justify-between">
                    <div className="stat-icon">
                      <Icon className="h-5 w-5" />
                    </div>
                    <span className="text-sm text-forest-400 dark:text-forest-500">0{index + 1}</span>
                  </div>
                  <h3 className="text-lg text-forest-950 dark:text-cream-100">{step.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-forest-500 dark:text-forest-400">{step.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="py-20">
        <div className="page-container">
          <div className="mb-10 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="section-kicker">Available for Adoption</p>
              <h2 className="section-title mt-2">Featured animal profiles</h2>
              <p className="mt-3 text-sm leading-7 text-forest-500 dark:text-forest-400">
                Review a few recent profiles below or browse the full directory for more details.
              </p>
            </div>
            <Link to="/home/animals" className="btn-ghost btn-sm">
              View All Animals
              <ArrowRightIcon className="h-4 w-4" />
            </Link>
          </div>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {loading
              ? Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} />)
              : featured.map((animal) => <AnimalCard key={animal.id} animal={animal} />)}
          </div>
        </div>
      </section>

      <section className="pb-20">
        <div className="page-container">
          <div className="card grid gap-8 p-8 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
            <div>
              <p className="section-kicker">Support Beyond Adoption</p>
              <h2 className="section-title mt-2">Not ready to adopt yet?</h2>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-forest-500 dark:text-forest-400">
                You can still contribute through verified donation drives and by sharing welfare updates with the campus community.
              </p>
            </div>
            <div className="flex flex-wrap gap-3 lg:justify-end">
              <Link to="/home/donations" className="btn-primary">
                View Donation Drives
              </Link>
              <Link to="/home/explore" className="btn-ghost">
                Read Community Updates
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
