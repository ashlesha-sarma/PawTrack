import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import API from '../../api/api';
import { useAuth } from '../../context/AuthContext';
import {
  ClipboardIcon,
  HeartIcon,
  LogoutIcon,
  PawIcon,
  SettingsIcon,
} from '../../components/Icons';

const STATUS_STYLE = {
  Pending: 'badge-amber',
  Approved: 'badge-orange',
  Rejected: 'badge-red',
};

export default function Profile() {
  const { user, logout } = useAuth();
  const nav = useNavigate();
  const [requests, setRequests] = useState([]);
  const [donations, setDonations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      nav('/login');
      return;
    }
    Promise.all([API.get('/adoptions/mine'), API.get('/donations/my-donations')])
      .then(([r1, r2]) => {
        setRequests(r1.data || []);
        setDonations(r2.data || []);
      })
      .finally(() => setLoading(false));
  }, [nav, user]);

  const handleLogout = async () => {
    await logout();
    nav('/');
  };

  if (!user) return null;

  return (
    <div className="min-h-screen pb-16 pt-8">
      <div className="page-container max-w-5xl">
        <div className="mb-8">
          <p className="section-kicker">Account Overview</p>
          <h1 className="section-title mt-2">My profile</h1>
        </div>

        <div className="grid gap-6 md:grid-cols-[320px_1fr]">
          <div className="space-y-5">
            <div className="card p-6 text-center">
              <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-2xl bg-terra-100 text-2xl font-semibold text-terra-700 dark:bg-terra-900/20 dark:text-terra-300">
                {user.name.charAt(0).toUpperCase()}
              </div>
              <h2 className="text-2xl text-forest-950 dark:text-cream-100">{user.name}</h2>
              <p className="mt-1 text-sm text-forest-500 dark:text-forest-400">{user.email}</p>
              <span className={`mt-4 inline-flex ${user.role === 'moderator' ? 'badge-terra' : 'badge-blue'}`}>
                {user.role === 'moderator' ? 'Administrator' : 'Student'}
              </span>

              <div className="mt-6 grid grid-cols-2 gap-3 border-t border-cream-200 pt-5 dark:border-forest-800">
                <div>
                  <p className="text-2xl font-semibold text-forest-950 dark:text-cream-100">{requests.length}</p>
                  <p className="mt-1 text-xs text-forest-500 dark:text-forest-400">Applications</p>
                </div>
                <div>
                  <p className="text-2xl font-semibold text-forest-950 dark:text-cream-100">{donations.length}</p>
                  <p className="mt-1 text-xs text-forest-500 dark:text-forest-400">Donations</p>
                </div>
              </div>
            </div>

            <div className="card p-3">
              <div className="space-y-1">
                {user.role === 'moderator' && (
                  <Link to="/admin" className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-forest-700 hover:bg-cream-50 dark:text-forest-300 dark:hover:bg-forest-800">
                    <SettingsIcon className="h-4 w-4" />
                    Admin Panel
                  </Link>
                )}
                <Link to="/home/animals" className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-forest-700 hover:bg-cream-50 dark:text-forest-300 dark:hover:bg-forest-800">
                  <PawIcon className="h-4 w-4" />
                  Animal Listings
                </Link>
                <Link to="/home/donations" className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-forest-700 hover:bg-cream-50 dark:text-forest-300 dark:hover:bg-forest-800">
                  <HeartIcon className="h-4 w-4" />
                  Donation Drives
                </Link>
                <button onClick={handleLogout} className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm text-red-600 hover:bg-red-50 dark:text-red-300 dark:hover:bg-red-900/20">
                  <LogoutIcon className="h-4 w-4" />
                  Sign Out
                </button>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="card p-5">
              <div className="mb-4 flex items-center gap-3">
                <div className="stat-icon">
                  <ClipboardIcon className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-xl text-forest-950 dark:text-cream-100">Adoption applications</h3>
                  <p className="text-sm text-forest-500 dark:text-forest-400">Track the status of your submitted requests.</p>
                </div>
              </div>

              {loading ? (
                <div className="space-y-3">
                  {[1, 2].map((i) => (
                    <div key={i} className="skeleton h-16 rounded-xl" />
                  ))}
                </div>
              ) : requests.length === 0 ? (
                <div className="rounded-xl border border-cream-200 bg-cream-50 p-8 text-center dark:border-forest-800 dark:bg-forest-800/70">
                  <p className="text-sm text-forest-500 dark:text-forest-400">No adoption applications have been submitted yet.</p>
                  <Link to="/home/animals" className="btn-primary btn-sm mt-4 inline-flex">
                    View Animals
                  </Link>
                </div>
              ) : (
                <div className="space-y-3">
                  {requests.map((request) => (
                    <div key={request.request_id} className="surface-muted flex items-center gap-4 rounded-xl p-3.5">
                      {request.image_path && (
                        <img
                          src={request.image_path}
                          alt={request.animal_name}
                          className="h-12 w-12 flex-shrink-0 rounded-xl object-cover"
                          onError={(e) => {
                            e.target.style.display = 'none';
                          }}
                        />
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-forest-900 dark:text-cream-100">{request.animal_name}</p>
                        <p className="truncate text-xs text-forest-500 dark:text-forest-400">
                          {request.reason?.substring(0, 70)}
                          {request.reason?.length > 70 ? '...' : ''}
                        </p>
                        <p className="mt-1 text-xs text-forest-400">{new Date(request.date).toLocaleDateString('en-IN')}</p>
                      </div>
                      <span className={`flex-shrink-0 ${STATUS_STYLE[request.status] || 'badge-amber'}`}>{request.status}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="card p-5">
              <div className="mb-4 flex items-center gap-3">
                <div className="stat-icon">
                  <HeartIcon className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-xl text-forest-950 dark:text-cream-100">Donation history</h3>
                  <p className="text-sm text-forest-500 dark:text-forest-400">A record of your financial support across active and completed campaigns.</p>
                </div>
              </div>

              {loading ? (
                <div className="space-y-3">
                  {[1, 2].map((i) => (
                    <div key={i} className="skeleton h-12 rounded-xl" />
                  ))}
                </div>
              ) : donations.length === 0 ? (
                <div className="rounded-xl border border-cream-200 bg-cream-50 p-8 text-center dark:border-forest-800 dark:bg-forest-800/70">
                  <p className="text-sm text-forest-500 dark:text-forest-400">No donations have been recorded on this account yet.</p>
                  <Link to="/home/donations" className="btn-primary btn-sm mt-4 inline-flex">
                    View Campaigns
                  </Link>
                </div>
              ) : (
                <div className="space-y-2">
                  {donations.map((donation, index) => (
                    <div key={index} className="surface-muted flex items-center justify-between rounded-xl p-3.5">
                      <div>
                        <p className="text-sm font-medium text-forest-900 dark:text-cream-100">{donation.title}</p>
                        <p className="mt-1 text-xs text-forest-500 dark:text-forest-400">
                          {new Date(donation.date).toLocaleDateString('en-IN')}
                        </p>
                      </div>
                      <span className="text-sm font-semibold text-terra-700 dark:text-terra-300">
                        Rs. {donation.amount?.toLocaleString()}
                      </span>
                    </div>
                  ))}
                  <p className="pt-2 text-right text-sm text-forest-500 dark:text-forest-400">
                    Total contributed:{' '}
                    <span className="font-semibold text-terra-700 dark:text-terra-300">
                      Rs. {donations.reduce((sum, donation) => sum + (donation.amount || 0), 0).toLocaleString()}
                    </span>
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
