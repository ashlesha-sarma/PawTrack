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

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    API.get('/admin/stats')
      .then((s) => {
        setStats(s.data);
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


    </div>
  );
}
