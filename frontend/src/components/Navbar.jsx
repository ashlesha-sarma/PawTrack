import React, { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import {
  ChevronDownIcon,
  HomeIcon,
  LogoMark,
  LogoutIcon,
  MenuIcon,
  MoonIcon,
  SettingsIcon,
  SunIcon,
  UserIcon,
  XIcon,
} from './Icons';

export default function Navbar() {
  const { user, logout } = useAuth();
  const { dark, toggle } = useTheme();
  const nav = useNavigate();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [dropOpen, setDropOpen] = useState(false);
  const dropRef = useRef(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const handler = (e) => {
      if (dropRef.current && !dropRef.current.contains(e.target)) setDropOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleLogout = async () => {
    await logout();
    nav('/');
    setDropOpen(false);
  };

  const navLinks = [
    { to: '/home/animals', label: 'Animals' },
    { to: '/home/donations', label: 'Support' },
  ];

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-all duration-200 ${
        scrolled ? 'glass shadow-card' : 'bg-transparent'
      }`}
    >
      <div className="page-container">
        <div className="flex h-[4.5rem] items-center justify-between border-b border-transparent">
          <Link to="/home" className="flex items-center gap-3 group">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-terra-500 text-white">
              <LogoMark className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-base font-semibold text-forest-950 dark:text-cream-100">PawTrack</p>
              <p className="hidden text-xs text-forest-500 dark:text-forest-400 sm:block">
                Animal welfare and adoption portal
              </p>
            </div>
          </Link>

          <nav className="hidden items-center gap-7 md:flex">
            {navLinks.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                className={({ isActive }) =>
                  `nav-link border-b-2 pb-1 ${
                    isActive ? 'border-terra-500 text-terra-600 dark:text-terra-300' : 'border-transparent'
                  }`
                }
              >
                {link.label}
              </NavLink>
            ))}
          </nav>

          <div className="flex items-center gap-2.5">
            <button onClick={toggle} className="btn-icon" aria-label="Toggle color theme">
              {dark ? <SunIcon className="h-4 w-4" /> : <MoonIcon className="h-4 w-4" />}
            </button>

            {user ? (
              <div className="relative" ref={dropRef}>
                <button
                  onClick={() => setDropOpen((value) => !value)}
                  className="flex items-center gap-2 rounded-lg border border-cream-300 bg-white px-3 py-2 text-sm text-forest-800 hover:border-terra-300 hover:bg-terra-50 dark:border-forest-700 dark:bg-forest-900 dark:text-cream-100 dark:hover:bg-forest-800"
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-terra-100 text-sm font-semibold text-terra-700 dark:bg-terra-900/20 dark:text-terra-300">
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                  <span className="hidden max-w-[120px] truncate sm:block">{user.name}</span>
                  <ChevronDownIcon
                    className={`h-4 w-4 text-forest-500 transition-transform ${
                      dropOpen ? 'rotate-180' : ''
                    }`}
                  />
                </button>

                {dropOpen && (
                  <div className="absolute right-0 top-full z-50 mt-2 w-56 overflow-hidden rounded-xl border border-cream-300 bg-white shadow-card dark:border-forest-700 dark:bg-forest-900">
                    <Link
                      to="/home/profile"
                      onClick={() => setDropOpen(false)}
                      className="flex items-center gap-3 px-4 py-3 text-sm text-forest-700 hover:bg-cream-50 dark:text-forest-300 dark:hover:bg-forest-800"
                    >
                      <UserIcon className="h-4 w-4" />
                      My Profile
                    </Link>
                    {user.role === 'moderator' && (
                      <Link
                        to="/admin"
                        onClick={() => setDropOpen(false)}
                        className="flex items-center gap-3 px-4 py-3 text-sm text-forest-700 hover:bg-cream-50 dark:text-forest-300 dark:hover:bg-forest-800"
                      >
                        <SettingsIcon className="h-4 w-4" />
                        Admin Panel
                      </Link>
                    )}
                    <div className="border-t border-cream-200 dark:border-forest-800" />
                    <button
                      onClick={handleLogout}
                      className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm text-red-600 hover:bg-red-50 dark:text-red-300 dark:hover:bg-red-900/20"
                    >
                      <LogoutIcon className="h-4 w-4" />
                      Sign Out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="hidden items-center gap-2 md:flex">
                <Link to="/login" className="btn-ghost btn-sm">
                  Sign In
                </Link>
                <Link to="/register" className="btn-primary btn-sm">
                  Create Account
                </Link>
              </div>
            )}

            <button onClick={() => setMenuOpen((value) => !value)} className="btn-icon md:hidden" aria-label="Toggle menu">
              {menuOpen ? <XIcon className="h-4 w-4" /> : <MenuIcon className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {menuOpen && (
          <div className="card mb-3 mt-2 overflow-hidden md:hidden">
            <div className="space-y-1 p-3">
              {navLinks.map((link) => (
                <NavLink
                  key={link.to}
                  to={link.to}
                  onClick={() => setMenuOpen(false)}
                  className={({ isActive }) =>
                    `block rounded-lg px-3 py-2.5 text-sm font-medium ${
                      isActive
                        ? 'bg-terra-50 text-terra-700 dark:bg-terra-900/20 dark:text-terra-300'
                        : 'text-forest-700 hover:bg-cream-50 dark:text-forest-300 dark:hover:bg-forest-800'
                    }`
                  }
                >
                  {link.label}
                </NavLink>
              ))}

              {!user && (
                <div className="grid grid-cols-2 gap-2 pt-2">
                  <Link to="/login" onClick={() => setMenuOpen(false)} className="btn-ghost btn-sm justify-center">
                    Sign In
                  </Link>
                  <Link to="/register" onClick={() => setMenuOpen(false)} className="btn-primary btn-sm justify-center">
                    Create Account
                  </Link>
                </div>
              )}

              {user && (
                <Link
                  to="/home/profile"
                  onClick={() => setMenuOpen(false)}
                  className="mt-2 flex items-center gap-2 rounded-lg border border-cream-200 px-3 py-2.5 text-sm text-forest-700 dark:border-forest-800 dark:text-forest-300"
                >
                  <HomeIcon className="h-4 w-4" />
                  Account Overview
                </Link>
              )}
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
