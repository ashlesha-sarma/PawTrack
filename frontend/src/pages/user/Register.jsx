import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import API from '../../api/api';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { ArrowLeftIcon, LogoMark, MoonIcon, SunIcon, UserIcon } from '../../components/Icons';

export default function Register() {
  const { setUser } = useAuth();
  const { dark, toggle } = useTheme();
  const nav = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (form.password !== form.confirm) {
      setError('Passwords do not match.');
      return;
    }
    if (form.password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    setLoading(true);
    try {
      const r = await API.post('/auth/register', {
        name: form.name,
        email: form.email,
        password: form.password,
      });
      setUser(r.data.user);
      nav('/home');
    } catch (e) {
      setError(e.response?.data?.error || 'Registration failed. Please try again.');
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
            <p className="section-kicker">New Account</p>
            <h1 className="mt-2 text-3xl font-bold text-forest-950 dark:text-cream-100">Create your account</h1>
          </div>

          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="label">Full name</label>
              <input required value={form.name} onChange={set('name')} placeholder="Your full name" className="input" />
            </div>

            <div>
              <label className="label">Email address</label>
              <input type="email" required value={form.email} onChange={set('email')} placeholder="name@example.com" className="input" />
            </div>

            <div>
              <label className="label">Password</label>
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'}
                  required
                  value={form.password}
                  onChange={set('password')}
                  placeholder="Minimum 6 characters"
                  className="input pr-16"
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

            <div>
              <label className="label">Confirm password</label>
              <input
                type="password"
                required
                value={form.confirm}
                onChange={set('confirm')}
                placeholder="Repeat your password"
                className={`input ${form.confirm && form.password !== form.confirm ? 'input-error' : ''}`}
              />
              {form.confirm && form.password !== form.confirm && (
                <p className="mt-1 text-xs text-red-600 dark:text-red-300">Passwords do not match.</p>
              )}
            </div>

            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-900/20 dark:text-red-300">
                {error}
              </div>
            )}

            <button type="submit" disabled={loading} className={`btn-primary mt-2 w-full justify-center py-4 text-base font-semibold shadow-lg transition-transform active:scale-[0.98] ${loading ? 'opacity-70' : ''}`}>
              {loading ? 'Creating account...' : 'Create Account'}
            </button>
          </form>

          <div className="mt-8 space-y-6">
            <p className="text-center text-sm text-forest-500 dark:text-forest-400">
              Already registered?{' '}
              <Link to="/login" className="font-semibold text-terra-600 hover:text-terra-700 dark:text-terra-300">
                Sign in here
              </Link>
            </p>

            <p className="text-center border-t border-cream-200 pt-6 dark:border-forest-800">
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
