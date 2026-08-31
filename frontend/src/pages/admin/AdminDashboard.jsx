import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import API from '../../api/api';
import { SkeletonStat } from '../../components/Skeleton';
import {
  CheckCircleIcon,
  ClipboardIcon,
  HeartIcon,
  HomeIcon,
  PawIcon,
  StethoscopeIcon,
  SyringeIcon,
  UsersIcon,
} from '../../components/Icons';

function StatCard({ icon: Icon, label, value, sub, color, to }) {
  const inner = (
    <div className={`stat-card transition-transform duration-150 ${to ? 'hover:-translate-y-0.5 cursor-pointer' : ''}`}>
      <div className={`stat-icon ${color}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <p className="text-sm text-forest-500 dark:text-forest-400">{label}</p>
        <p className="text-2xl font-semibold text-forest-950 dark:text-cream-100">{value}</p>
        {sub && <p className="mt-0.5 text-xs text-forest-400">{sub}</p>}
      </div>
    </div>
  );

  return to ? <Link to={to}>{inner}</Link> : inner;
}

const QUICK = [
  { to: '/admin/manage-animals', icon: PawIcon, label: 'Manage animals', desc: 'Add, edit, and archive animal records.' },
  { to: '/admin/manage-drives', icon: HeartIcon, label: 'Manage drives', desc: 'Create and monitor donation campaigns.' },
  { to: '/admin/requests', icon: ClipboardIcon, label: 'Review requests', desc: 'Approve, reject, or update applications.' },
];

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [activity, setActivity] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([API.get('/admin/stats'), API.get('/admin/recent-activity')])
      .then(([s, a]) => {
        setStats(s.data);
        setActivity(a.data || []);
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl text-forest-950 dark:text-cream-100">Dashboard</h1>
        <p className="mt-1 text-sm text-forest-500 dark:text-forest-400">
          Overview of animal records, donation activity, applications, and recent community actions.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {loading ? (
          Array.from({ length: 10 }).map((_, i) => <SkeletonStat key={i} />)
        ) : (
          <>
            <StatCard icon={PawIcon} label="Total animals" value={stats?.total_animals} color="bg-terra-100 dark:bg-terra-900/30 text-terra-500" to="/admin/manage-animals" />
            <StatCard icon={CheckCircleIcon} label="Available" value={stats?.available_animals} color="bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600" to="/admin/manage-animals" />
            <StatCard icon={UsersIcon} label="Registered users" value={stats?.total_users} color="bg-blue-100 dark:bg-blue-900/30 text-blue-600" />
            <StatCard icon={HeartIcon} label="Total donated" value={`Rs. ${Number(stats?.total_donations || 0).toLocaleString()}`} color="bg-terra-50 dark:bg-terra-900/20 text-terra-600" to="/admin/manage-drives" />
            <StatCard icon={ClipboardIcon} label="Pending requests" value={stats?.pending_requests} color="bg-amber-100 dark:bg-amber-900/30 text-amber-600" to="/admin/requests" sub="Awaiting review" />
            <StatCard icon={CheckCircleIcon} label="Approved adoptions" value={stats?.approved_adoptions} color="bg-teal-100 dark:bg-teal-900/30 text-teal-600" to="/admin/requests" />
            <StatCard icon={StethoscopeIcon} label="Needs treatment" value={stats?.needs_treatment} color="bg-red-100 dark:bg-red-900/30 text-red-600" to="/admin/manage-animals" />
            <StatCard icon={HomeIcon} label="Active fosters" value={stats?.active_foster_placements} color="bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600" />
            <StatCard icon={SyringeIcon} label="Vaccinations due" value={stats?.vaccinations_due_count} color="bg-amber-50 dark:bg-amber-900/20 text-amber-700" sub="Due in 30 days or overdue" />
            <StatCard icon={HeartIcon} label="Total expenses" value={`Rs. ${Number(stats?.total_expenses || 0).toLocaleString()}`} color="bg-purple-100 dark:bg-purple-900/30 text-purple-600" to="/admin/manage-drives" />
          </>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="card p-7 border-terra-200 dark:border-forest-800 shadow-md">
          <div className="mb-6 flex items-center justify-between border-b border-terra-100 pb-3 dark:border-forest-800">
            <h2 className="text-xl font-bold text-forest-950 dark:text-cream-100">Quick actions</h2>
            <div className="h-1 w-12 rounded-full bg-terra-400" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            {QUICK.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className="rounded-xl border border-terra-100 bg-terra-50/30 p-4 shadow-sm transition-all duration-200 hover:border-terra-300 hover:bg-terra-50 hover:shadow-md dark:border-forest-700 dark:bg-forest-900 dark:hover:bg-forest-800"
                >
                  <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-terra-500 text-white shadow-sm">
                    <Icon className="h-4 w-4" />
                  </div>
                  <p className="text-sm font-semibold text-forest-900 dark:text-cream-100">{item.label}</p>
                  <p className="mt-1 text-xs text-terra-700 dark:text-forest-400 font-medium">{item.desc}</p>
                </Link>
              );
            })}
          </div>
        </div>

        <div className="card p-7 border-terra-200 dark:border-forest-800 shadow-md">
          <div className="mb-6 flex items-center justify-between border-b border-terra-100 pb-3 dark:border-forest-800">
            <h2 className="text-xl font-bold text-forest-950 dark:text-cream-100">Recent activity</h2>
            <div className="h-1 w-12 rounded-full bg-terra-400" />
          </div>
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="skeleton h-12 rounded-xl" />
              ))}
            </div>
          ) : activity.length === 0 ? (
            <p className="text-sm text-forest-500 dark:text-forest-400">No recent activity has been recorded.</p>
          ) : (
            <div className="space-y-3">
              {activity.map((item, index) => (
                <div key={index} className="surface-muted flex items-center gap-3 rounded-xl p-3.5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-terra-100 text-terra-700 dark:bg-terra-900/20 dark:text-terra-300">
                    {item.type === 'adoption' ? <PawIcon className="h-4 w-4" /> : <HeartIcon className="h-4 w-4" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-forest-900 dark:text-cream-100">
                      <span className="font-medium">{item.actor}</span>{' '}
                      {item.type === 'adoption' ? 'submitted an application for' : 'donated to'}{' '}
                      <span className="font-medium">{item.subject}</span>
                    </p>
                    <p className="text-xs text-forest-500 dark:text-forest-400">
                      {new Date(item.date).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
