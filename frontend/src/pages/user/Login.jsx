import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import API from '../../api/api';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { ArrowLeftIcon, MoonIcon, SunIcon, UserIcon } from '../../components/Icons';

export default function Login() {
  const { setUser } = useAuth();
  const { dark, toggle } = useTheme();
  const nav = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const r = await API.post('/auth/login', { email, password });
      setUser(r.data.user);
      nav(r.data.user.role === 'moderator' ? '/admin' : '/home');
    } catch (e) {
      setError(e.response?.data?.error || 'Sign in failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-hero-pattern px-4 py-10 dark:bg-forest-950">
      <button onClick={toggle} className="fixed right-4 top-4 btn-icon">
        {dark ? <SunIcon className="h-4 w-4" /> : <MoonIcon className="h-4 w-4" />}
      </button>

      <div className="mx-auto flex min-h-[calc(100vh-5rem)] w-full max-w-md items-center justify-center py-12">
        <div className="card w-full p-8 shadow-2xl">
          <div className="mb-10 text-center">
            <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-terra-500 text-white shadow-lg">
              <UserIcon className="h-6 w-6" />
            </div>
            <p className="section-kicker">Account Access</p>
            <h1 className="mt-2 text-3xl font-bold text-forest-950 dark:text-cream-100">Sign in</h1>
           
          </div>

          <form onSubmit={submit} className="space-y-5">
            <div>
              <label className="label">Email address</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="input"
                autoComplete="email"
              />
            </div>

            <div>
              <label className="label">Password</label>
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="input pr-16"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPw((value) => !value)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-medium text-forest-500 hover:text-forest-700 dark:text-forest-400 dark:hover:text-forest-200"
                >
                  {showPw ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>

            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-900/20 dark:text-red-300">
                {error}
              </div>
            )}

            <button type="submit" disabled={loading} className={`btn-primary mt-2 w-full justify-center py-4 text-base font-semibold shadow-lg transition-transform active:scale-[0.98] ${loading ? 'opacity-70' : ''}`}>
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <div className="mt-8 space-y-6">
            <p className="text-center text-sm text-forest-500 dark:text-forest-400">
              Need an account?{' '}
              <Link to="/register" className="font-semibold text-terra-600 hover:text-terra-700 dark:text-terra-300">
                Create one here
              </Link>
            </p>

            <div className="rounded-2xl border border-terra-100 bg-terra-50/30 p-5 text-sm text-forest-600 dark:border-forest-800 dark:bg-forest-800/70 dark:text-forest-300">
              <p className="font-bold text-forest-800 dark:text-cream-100">Demo access</p>
              <div className="mt-3 space-y-1.5 opacity-80">
                <p>User: <span className="font-medium">demo@student.test / Demo@123</span></p>
              </div>
            </div>

            <p className="text-center">
              <Link to="/home" className="inline-flex items-center gap-2 text-sm font-medium text-forest-500 hover:text-terra-600 transition-colors dark:text-forest-400 dark:hover:text-terra-300">
                <ArrowLeftIcon className="h-4 w-4" />
                Return to home
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
