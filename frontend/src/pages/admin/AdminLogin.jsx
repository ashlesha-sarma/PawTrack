import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import API from '../../api/api';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { ArrowLeftIcon, MoonIcon, SettingsIcon, SunIcon } from '../../components/Icons';

export default function AdminLogin() {
  const { setUser } = useAuth();
  const { dark, toggle } = useTheme();
  const nav = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const r = await API.post('/auth/login', { email, password });
      if (r.data.user.role !== 'moderator') {
        setError('This account does not have administrative access.');
        return;
      }
      setUser(r.data.user);
      nav('/admin');
    } catch (e) {
      setError(e.response?.data?.error || 'Sign in failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-cream-50 p-4 dark:bg-forest-950 transition-colors">
      <button onClick={toggle} className="fixed right-4 top-4 btn-icon z-50">
        {dark ? <SunIcon className="h-4 w-4" /> : <MoonIcon className="h-4 w-4" />}
      </button>

      <div className="mx-auto flex min-h-screen w-full max-w-md items-center justify-center py-10">
        <div className="card w-full p-8 shadow-2xl">
          <div className="mb-10 text-center">
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-terra-500 text-white shadow-lg">
              <SettingsIcon className="h-8 w-8" />
            </div>
            <h1 className="text-3xl font-bold text-forest-950 dark:text-cream-100">Admin sign in</h1>
            <p className="mt-2 text-sm text-forest-500 dark:text-forest-400">Access the PawTrack administrative workspace.</p>
          </div>

          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="label">Admin email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@campuspaws.test"
                className="input"
              />
            </div>
            <div>
              <label className="label">Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                className="input"
              />
            </div>

            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-900/20 dark:text-red-300">
                {error}
              </div>
            )}

            <button type="submit" disabled={loading} className={`btn-primary w-full justify-center py-4 text-base font-semibold shadow-lg transition-transform active:scale-[0.98] ${loading ? 'opacity-70' : ''}`}>
              {loading ? 'Authenticating...' : 'Sign In'}
            </button>
          </form>

            <div className="mt-8 rounded-2xl border border-terra-100 bg-terra-50/30 p-5 text-sm text-forest-600 dark:border-forest-800 dark:bg-forest-800/70 dark:text-forest-300">
              <p className="font-bold text-forest-800 dark:text-cream-100">Demo access</p>
              <div className="mt-3 space-y-1.5 opacity-80">
                <p>Admin: <span className="font-medium">admin@campuspaws.test / Admin@123</span></p>
              </div>
            </div>

            <p className="mt-8 text-center border-t border-cream-200 pt-6 dark:border-forest-800">
              <Link to="/" className="inline-flex items-center gap-2 text-sm font-medium text-forest-500 hover:text-terra-600 transition-colors dark:text-forest-400 dark:hover:text-terra-300">
                <ArrowLeftIcon className="h-4 w-4" />
                Return to public site
              </Link>
            </p>
        </div>
      </div>
    </div>
  );
}
