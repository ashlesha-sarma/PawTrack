import React from 'react';
import { useNavigate } from 'react-router-dom';
import { LogoMark, SettingsIcon, UserIcon, ArrowRightIcon } from '../components/Icons';
import { useTheme } from '../context/ThemeContext';
import { SunIcon, MoonIcon } from '../components/Icons';

export default function Portal() {
  const navigate = useNavigate();
  const { dark, toggle } = useTheme();

  const RoleCard = ({ title, desc, icon: Icon, to, color, darkColor }) => (
    <button
      onClick={() => navigate(to)}
      className="group relative overflow-hidden rounded-3xl border border-cream-200 bg-white p-8 text-left transition-all duration-300 hover:-translate-y-2 hover:border-terra-300 hover:shadow-2xl dark:border-forest-800 dark:bg-forest-900 dark:hover:border-terra-800"
    >
      <div className={`mb-6 flex h-14 w-14 items-center justify-center rounded-2xl ${color} ${darkColor} shadow-lg transition-transform group-hover:scale-110`}>
        <Icon className="h-7 w-7" />
      </div>
      <div>
        <h3 className="text-2xl font-bold text-forest-950 dark:text-cream-100">{title}</h3>
        <p className="mt-3 text-sm leading-7 text-forest-500 dark:text-forest-400">
          {desc}
        </p>
      </div>
      <div className="mt-8 flex items-center gap-2 text-sm font-semibold text-terra-600 transition-colors group-hover:text-terra-700 dark:text-terra-400">
        Get Started <ArrowRightIcon className="h-4 w-4 transition-transform group-hover:translate-x-1" />
      </div>
      
      {/* Decorative gradient overlay */}
      <div className="absolute -right-12 -top-12 h-40 w-40 rounded-full bg-terra-500/5 blur-3xl transition-opacity group-hover:opacity-100 opacity-0" />
    </button>
  );

  return (
    <div className="relative min-h-screen items-center justify-center bg-hero-pattern px-6 dark:bg-forest-950">
      <button onClick={toggle} className="fixed right-6 top-6 btn-icon z-50">
        {dark ? <SunIcon className="h-4 w-4" /> : <MoonIcon className="h-4 w-4" />}
      </button>

      <div className="mx-auto flex min-h-screen w-full max-w-5xl flex-col items-center justify-center py-10 sm:py-20">
        <div className="mb-10 text-center sm:mb-14">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-[2rem] bg-terra-500 text-white shadow-terra-glow sm:mb-8 sm:h-20 sm:w-20 sm:rounded-[2.5rem]">
            <LogoMark className="h-8 w-8 sm:h-10 sm:w-10" />
          </div>
          <h1 className="text-5xl font-black tracking-tight text-forest-950 sm:text-6xl lg:text-8xl dark:text-cream-100">
            Paw<span className="text-terra-500">Track</span>
          </h1>
        </div>

        <div className="grid w-full gap-6 sm:grid-cols-2">
          <RoleCard
            title="Administrator"
            desc="Manage animal records, approve adoption requests, monitor donation drives, and oversee community content."
            icon={SettingsIcon}
            to="/admin/login"
            color="bg-terra-500 text-white"
            darkColor="dark:bg-terra-600"
          />
          <RoleCard
            title="User"
            desc="Browse animals, apply for adoption, contribute to donation drives, and stay updated with campus welfare."
            icon={UserIcon}
            to="/login"
            color="bg-terra-500 text-white"
            darkColor="dark:bg-terra-600"
          />
        </div>

        <div className="mt-16 text-sm text-forest-400 dark:text-forest-600">
           &copy; 2026 PawTrack Animal Welfare Initiative
        </div>
      </div>
    </div>
  );
}
