import React, { useState } from 'react';
import { Navigate, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import {
  ArrowLeftIcon,
  ClipboardIcon,
  HeartIcon,
  LogoMark,
  MenuIcon,
  MoonIcon,
  PawIcon,
  SettingsIcon,
  SunIcon,
  XIcon,
} from './Icons';

const navItems = [
  { to: '/admin/dashboard', icon: SettingsIcon, label: 'Dashboard' },
  { to: '/admin/manage-animals', icon: PawIcon, label: 'Animals' },
  { to: '/admin/manage-drives', icon: HeartIcon, label: 'Donations' },
  { to: '/admin/requests', icon: ClipboardIcon, label: 'Requests' },
];

export default function AdminLayout() {
  const { user, loading, logout } = useAuth();
  const { dark, toggle } = useTheme();
  const nav = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (loading) return null;
  if (!user) return <Navigate to="/admin/login" replace />;
  if (user.role !== 'moderator') return <Navigate to="/" replace />;

  const handleLogout = async () => {
    await logout();
    nav('/admin/login');
  };

  const Sidebar = ({ mobile = false }) => (
    <aside
      className={`${
        mobile ? 'fixed inset-y-0 left-0 z-50 w-72' : 'hidden lg:flex w-72'
      } flex-shrink-0 flex-col border-r border-terra-200 bg-terra-50/30 dark:border-forest-800 dark:bg-forest-950`}
    >
      <div className="border-b border-terra-200 p-6 dark:border-forest-800">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-terra-500 text-white shadow-sm">
            <LogoMark className="h-5 w-5" />
          </div>
          <div>
            <p className="text-base font-semibold text-forest-950 dark:text-cream-100">PawTrack</p>
            <p className="text-xs text-terra-600 dark:text-forest-400 font-medium">Administration</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 space-y-1 p-4">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? 'border border-terra-500/20 bg-terra-500/10 text-terra-700 shadow-sm dark:border-terra-500/30 dark:bg-terra-500/15 dark:text-terra-300'
                    : 'text-forest-600 hover:bg-terra-100 hover:text-terra-700 dark:text-forest-400 dark:hover:bg-forest-800 dark:hover:text-cream-100'
                }`
              }
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </NavLink>
          );
        })}
      </nav>

      <div className="border-t border-terra-200 p-4 dark:border-forest-800">
        <div className="mb-3 flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-terra-500 text-sm font-semibold text-white shadow-sm">
            {user.name.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-forest-950 dark:text-cream-100">{user.name}</p>
            <p className="truncate text-xs text-terra-600 dark:text-forest-400 font-medium">{user.email}</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="w-full rounded-xl border border-red-200 px-3 py-2.5 text-left text-sm font-medium text-red-600 hover:bg-red-50 transition-colors dark:border-red-900/40 dark:text-red-300 dark:hover:bg-red-900/20"
        >
          Sign Out
        </button>
      </div>
    </aside>
  );

  return (
    <div className="min-h-screen flex bg-cream-100 dark:bg-forest-950">
      <Sidebar />

      {sidebarOpen && (
        <>
          <div className="fixed inset-0 z-40 bg-black/40 lg:hidden" onClick={() => setSidebarOpen(false)} />
          <Sidebar mobile />
        </>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="glass sticky top-0 z-30 flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-4">
            <button onClick={() => setSidebarOpen(true)} className="btn-icon lg:hidden">
              <MenuIcon className="h-4 w-4" />
            </button>
            <div>
              <h1 className="text-xl text-forest-950 dark:text-cream-100">Admin panel</h1>
              <p className="text-sm text-forest-500 dark:text-forest-400">Operational overview and content management</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={toggle} className="btn-icon" aria-label="Toggle color theme">
              {dark ? <SunIcon className="h-4 w-4" /> : <MoonIcon className="h-4 w-4" />}
            </button>
            <NavLink to="/" className="btn-ghost btn-sm">
              <ArrowLeftIcon className="h-4 w-4" />
              Public Site
            </NavLink>
            <button onClick={() => setSidebarOpen(false)} className="btn-icon lg:hidden">
              <XIcon className="h-4 w-4" />
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
