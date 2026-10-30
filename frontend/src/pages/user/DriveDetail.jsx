import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import API from '../../api/api';
import { useAuth } from '../../context/AuthContext';
import { getImageUrl } from '../../utils/imageUrl';
import {
  AlertTriangleIcon,
  ArrowLeftIcon,
  BuildingIcon,
  CalendarIcon,
  CheckCircleIcon,
  ClockIcon,
  CopyIcon,
  ExternalLinkIcon,
  HeartIcon,
  LogoMark,
  ShareIcon,
  XCircleIcon,
  XIcon,
} from '../../components/Icons';

// ─── Confetti particle ────────────────────────────────────────────────────────
const CONFETTI_COLORS = ['#d95a2e', '#e8734a', '#eda070', '#334155', '#1e293b', '#ffd166', '#ef476f', '#e11d48'];

function ConfettiPiece({ x, color, size, duration, delay, shape }) {
  const style = {
    position: 'absolute',
    left: `${x}%`,
    top: -20,
    width: shape === 'circle' ? size : size * 0.8,
    height: shape === 'circle' ? size : size * 1.4,
    borderRadius: shape === 'circle' ? '50%' : shape === 'square' ? '2px' : '50% 0',
    backgroundColor: color,
    animation: `confetti-fall ${duration}s ease-in ${delay}s both`,
    transformOrigin: 'center',
    opacity: 0,
  };
  return <div style={style} />;
}

function Confetti({ active }) {
  const pieces = useRef(
    Array.from({ length: 60 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
      size: 6 + Math.random() * 8,
      duration: 1.8 + Math.random() * 1.4,
      delay: Math.random() * 0.6,
      shape: ['circle', 'square', 'ribbon'][Math.floor(Math.random() * 3)],
    }))
  ).current;

  if (!active) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-[9999] overflow-hidden">
      {pieces.map((p) => (
        <ConfettiPiece key={p.id} {...p} />
      ))}
    </div>
  );
}

// ─── Large animated progress bar ─────────────────────────────────────────────
function ProgressBar({ raised, goal, animate }) {
  const pct = Math.min(100, (raised / goal) * 100);
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (!animate) return;
    let start = null;
    const duration = 1100;
    const step = (ts) => {
      if (!start) start = ts;
      const progress = Math.min((ts - start) / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 3);
      setDisplay(ease * pct);
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [pct, animate]);

  return (
    <div className="space-y-2">
      <div className="progress-bar-lg">
        <div className="progress-fill-lg" style={{ width: `${display}%` }} />
      </div>
      <div className="flex items-center justify-between text-sm">
        <span className="font-semibold text-terra-600 dark:text-terra-300">
          ₹{Number(raised).toLocaleString('en-IN')} raised
        </span>
        <span className="text-forest-500 dark:text-forest-400">{pct.toFixed(1)}%</span>
      </div>
    </div>
  );
}

// ─── Preset amounts ───────────────────────────────────────────────────────────
const PRESET_AMOUNTS = [100, 250, 500, 1000, 2500, 5000];

const impactMsg = (amt) => {
  if (amt >= 5000) return { text: 'Can cover a major treatment procedure 🏥', color: 'terra' };
  if (amt >= 1000) return { text: 'Supports vaccination & care for multiple animals 💉', color: 'forest' };
  if (amt >= 500)  return { text: 'Contributes to food & recovery for one animal 🍲', color: 'forest' };
  return { text: 'Helps cover basic medicines & first-aid supplies 🩹', color: 'amber' };
};

// ─── Donation Modal ───────────────────────────────────────────────────────────
function DonationModal({ drive, user, onClose, onSuccess }) {
  const [amount, setAmount]   = useState('');
  const [step, setStep]       = useState('pick'); // pick | paying | success | error
  const [errorMsg, setErrorMsg] = useState('');
  const [name,  setName]      = useState(user?.name || '');
  const [email, setEmail]     = useState(user?.email || '');
  const inputRef = useRef(null);

  useEffect(() => { setTimeout(() => inputRef.current?.focus(), 120); }, []);
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  const handlePay = async () => {
    const amt = Number(amount);
    if (!amt || amt < 1) { setErrorMsg('Please enter a valid amount (minimum ₹1).'); return; }
    if (!user) { setErrorMsg('Please sign in before donating.'); return; }

    setErrorMsg('');
    setStep('paying');

    try {
      // Razorpay's create-order/verify-payment round trip has been removed —
      // donations are recorded directly. /donate inserts the row and
      // returns the freshly recomputed raised_amount/donor_count for this
      // drive (both are always computed live from SUM(donations.amount),
      // never stored), so onSuccess still gets the same shape it used to.
      const { data } = await API.post('/donations/donate', {
        drive_id: drive.id,
        amount: amt,
      });
      onSuccess(data, amt);
      setStep('success');
    } catch (e) {
      setErrorMsg(e.response?.data?.error || 'Something went wrong while recording the donation.');
      setStep('pick');
    }
  };

  const impact = amount && Number(amount) >= 100 ? impactMsg(Number(amount)) : null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4">
      {/* backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
        style={{ animation: 'fadeIn 0.2s ease' }}
      />

      {/* sheet */}
      <div
        className="relative w-full overflow-hidden rounded-t-3xl border border-cream-200 bg-white shadow-[0_-8px_40px_rgba(0,0,0,0.18)] sm:max-w-md sm:rounded-2xl dark:border-forest-700 dark:bg-forest-900"
        style={{ animation: 'slide-up-fade 0.3s ease both' }}
      >
        {/* drag handle (mobile) */}
        <div className="flex justify-center pt-3 sm:hidden">
          <div className="h-1 w-10 rounded-full bg-cream-300 dark:bg-forest-700" />
        </div>

        {/* Header */}
        <div className="flex items-start justify-between border-b border-cream-200 px-6 pb-4 pt-4 dark:border-forest-800">
          <div>
            <h2 className="text-xl font-semibold text-forest-950 dark:text-cream-100">
              {step === 'success' ? '🎉 Donation confirmed!' : step === 'error' ? 'Payment issue' : 'Support this campaign'}
            </h2>
            <p className="mt-0.5 text-sm text-forest-500 dark:text-forest-400 truncate max-w-xs">{drive.title}</p>
          </div>
          <button
            onClick={onClose}
            className="ml-4 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg text-forest-500 hover:bg-cream-100 hover:text-forest-900 transition-colors dark:hover:bg-forest-800 dark:text-forest-400"
          >
            <XIcon className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5">
          {/* ── pick / paying ── */}
          {(step === 'pick' || step === 'paying') && (
            <div className="space-y-4">
              <p className="text-sm text-forest-500 dark:text-forest-400">
                Choose a contribution amount or enter a custom value.
              </p>

              {/* Preset grid */}
              <div className="grid grid-cols-3 gap-2">
                {PRESET_AMOUNTS.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setAmount(String(preset))}
                    className={`rounded-xl border py-3 text-sm font-semibold transition-all duration-150 ${
                      amount === String(preset)
                        ? 'border-terra-500 bg-terra-500 text-white shadow-sm'
                        : 'border-cream-300 bg-cream-50 text-forest-700 hover:border-terra-300 hover:bg-terra-50 dark:border-forest-700 dark:bg-forest-800 dark:text-forest-200 dark:hover:border-terra-600 dark:hover:bg-forest-700'
                    }`}
                  >
                    ₹{preset >= 1000 ? `${preset / 1000}k` : preset}
                  </button>
                ))}
              </div>

              {/* Custom input */}
              <div className="relative">
                <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm font-medium text-forest-500">₹</span>
                <input
                  ref={inputRef}
                  type="number"
                  min="1"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="Custom amount"
                  className="input pl-8"
                />
              </div>

              {/* Guest fields */}
              {!user && (
                <div className="space-y-2">
                  <input value={name}  onChange={(e) => setName(e.target.value)}  placeholder="Your name"     className="input" />
                  <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder="Email address" className="input" />
                </div>
              )}

              {/* Error */}
              {errorMsg && (
                <div className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">
                  <XCircleIcon className="mt-0.5 h-4 w-4 flex-shrink-0" />
                  {errorMsg}
                </div>
              )}

              {/* Impact message */}
              {impact && (
                <div className="rounded-xl border border-terra-200 bg-terra-50 p-3 text-sm text-terra-700 dark:border-terra-800 dark:bg-terra-900/20 dark:text-terra-300">
                  {impact.text}
                </div>
              )}

              {/* Pay button */}
              <button
                onClick={handlePay}
                disabled={step === 'paying' || !amount}
                className="btn-donate w-full"
              >
                {step === 'paying' ? (
                  <>
                    <span className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                    Processing…
                  </>
                ) : (
                  <>
                    <HeartIcon className="h-4 w-4" />
                    {amount ? `Donate ₹${Number(amount).toLocaleString('en-IN')}` : 'Donate'}
                  </>
                )}
              </button>

              <p className="text-center text-xs text-forest-400 dark:text-forest-500">
                🔒 Secure checkout · Test mode
              </p>
            </div>
          )}

          {/* ── success ── */}
          {step === 'success' && (
            <div className="space-y-5 py-2 text-center" style={{ animation: 'pop-in 0.4s ease both' }}>
              <div className="relative mx-auto flex h-20 w-20 items-center justify-center">
                <div
                  className="absolute h-20 w-20 rounded-full bg-terra-400 opacity-30"
                  style={{ animation: 'pulse-ring 1.2s ease-out infinite' }}
                />
                <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-terra-500 text-white">
                  <CheckCircleIcon className="h-10 w-10" />
                </div>
              </div>
              <div>
                <h3 className="text-2xl font-semibold text-forest-950 dark:text-cream-100">Thank you! 🐾</h3>
                <p className="mt-2 text-sm leading-7 text-forest-500 dark:text-forest-400">
                  Your donation has been recorded and will directly support the care of campus animals.
                </p>
              </div>
              <button onClick={onClose} className="btn-donate w-full">
                Done
              </button>
            </div>
          )}

          {/* ── error ── */}
          {step === 'error' && (
            <div className="space-y-4 py-2 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-100 text-red-600 dark:bg-red-900/20 dark:text-red-300">
                <XCircleIcon className="h-8 w-8" />
              </div>
              <p className="text-sm leading-7 text-forest-600 dark:text-forest-300">{errorMsg || 'Payment could not be completed.'}</p>
              <div className="flex gap-3">
                <button onClick={() => setStep('pick')} className="btn-donate flex-1">Try Again</button>
                <button onClick={onClose} className="btn-ghost flex-1 justify-center">Cancel</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}



// ─── Toast ────────────────────────────────────────────────────────────────────
function Toast({ toast, onClose }) {
  if (!toast) return null;
  const isSuccess = toast.type === 'success';
  return (
    <div
      className={`fixed left-1/2 top-20 z-[9998] flex w-full max-w-sm -translate-x-1/2 items-center gap-3 rounded-2xl px-5 py-3.5 shadow-xl transition-all ${
        isSuccess ? 'bg-forest-800 text-white' : 'bg-red-600 text-white'
      }`}
      style={{ animation: 'slide-up-fade 0.3s ease both' }}
    >
      {isSuccess ? <CheckCircleIcon className="h-5 w-5 text-terra-300 flex-shrink-0" /> : <XCircleIcon className="h-5 w-5 flex-shrink-0" />}
      <p className="flex-1 text-sm font-medium">{toast.msg}</p>
      <button onClick={onClose} className="ml-1 opacity-70 hover:opacity-100">
        <XIcon className="h-4 w-4" />
      </button>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function DriveDetail() {
  const { id }  = useParams();
  const nav     = useNavigate();
  const { user } = useAuth();

  const [drive,       setDrive]       = useState(null);
  const [expenseSummary, setExpenseSummary] = useState(null); // { spent, remaining } — fetched separately, both computed server-side

  const [loading,      setLoading]    = useState(true);
  const [showModal,    setShowModal]  = useState(false);
  const [toast,        setToast]      = useState(null);
  const [confetti,     setConfetti]   = useState(false);
  const [pbVisible,    setPbVisible]  = useState(false);
  const pbRef = useRef(null);

  const fetchDrive = useCallback(() => {
    return API.get(`/donations/drives/${id}`)
      .then((res) => {
        setDrive(res.data);
      })
      .finally(() => setLoading(false));
  }, [id]);

  // Spending transparency: fetched separately from /api/expenses/:drive_id,
  // which returns { expenses, spent, remaining } — spent and remaining are
  // both computed at query time (spent = SUM(expenses.amount), remaining =
  // raised - spent), never stored. Fetched independently of fetchDrive so a
  // slow/failed expenses lookup never blocks the main campaign page.
  useEffect(() => {
    API.get(`/expenses/${id}`)
      .then((res) => setExpenseSummary({ spent: res.data.spent, remaining: res.data.remaining }))
      .catch(() => setExpenseSummary(null));
  }, [id]);

  useEffect(() => { fetchDrive(); }, [fetchDrive]);

  useEffect(() => {
    const obs = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) setPbVisible(true);
    }, { threshold: 0.3 });
    if (pbRef.current) obs.observe(pbRef.current);
    return () => obs.disconnect();
  }, [drive]);

  const showToast = useCallback((type, msg, duration = 4500) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), duration);
  }, []);

  const handleSuccess = useCallback(async (verifyData, donatedAmt) => {
    if (verifyData.raised_amount !== undefined) {
      setDrive((d) => ({
        ...d,
        raised_amount: verifyData.raised_amount,
        donor_count: verifyData.donor_count || (d.donor_count || 0) + 1,
      }));
    }
    // Confetti burst
    setConfetti(true);
    setTimeout(() => setConfetti(false), 2800);
    showToast('success', `You donated ₹${Number(donatedAmt).toLocaleString('en-IN')} — thank you! 🐾`);
    setTimeout(() => fetchDrive(), 1500);
  }, [user, fetchDrive, showToast]);

  // ── Loading ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center pt-20">
        <div className="flex flex-col items-center gap-4">
          <div className="relative h-14 w-14">
            <div className="absolute inset-0 rounded-full border-4 border-terra-200" />
            <div className="absolute inset-0 animate-spin rounded-full border-4 border-terra-500 border-t-transparent" />
          </div>
          <p className="text-sm text-forest-500 dark:text-forest-400">Loading campaign…</p>
        </div>
      </div>
    );
  }

  if (!drive) {
    return (
      <div className="min-h-screen flex items-center justify-center pt-20">
        <div className="card max-w-md p-10 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-red-600">
            <AlertTriangleIcon className="h-5 w-5" />
          </div>
          <h2 className="text-2xl text-forest-950 dark:text-cream-100">Campaign not found</h2>
          <p className="mt-2 text-sm text-forest-500 dark:text-forest-400">The requested campaign could not be located.</p>
          <Link to="/home/donations" className="btn-primary mt-6 inline-flex">
            <ArrowLeftIcon className="h-4 w-4" /> Back to Campaigns
          </Link>
        </div>
      </div>
    );
  }

  const pct      = Math.min(100, (drive.raised_amount / drive.target_amount) * 100);
  const daysLeft = drive.deadline
    ? Math.max(0, Math.ceil((new Date(drive.deadline) - Date.now()) / 86400000))
    : null;
  const isActive = !!drive.is_active;
  const remainingNeeded = Math.max(0, drive.target_amount - drive.raised_amount);

  return (
    <>
      <Confetti active={confetti} />
      <Toast toast={toast} onClose={() => setToast(null)} />

      <div className="min-h-screen pb-24 pt-6">
        <div className="page-container">
          {/* Breadcrumbs */}
          <nav className="mb-6 flex items-center gap-2 text-sm text-forest-500 dark:text-forest-400">
            <Link to="/" className="hover:text-terra-600 dark:hover:text-terra-300 transition-colors">Home</Link>
            <span>/</span>
            <Link to="/home/donations" className="hover:text-terra-600 dark:hover:text-terra-300 transition-colors">Donation Drives</Link>
            <span>/</span>
            <span className="truncate max-w-[200px] text-forest-800 dark:text-cream-200">{drive.title}</span>
          </nav>

          {/* ── Main grid ── */}
          <div className="grid items-start gap-8 lg:grid-cols-5">
            {/* ── Left: Campaign info (3/5) ── */}
            <div className="space-y-6 lg:col-span-3">
              {/* Hero card */}
              <div className="overflow-hidden rounded-2xl border border-cream-200 bg-white dark:border-forest-800 dark:bg-forest-900 shadow-card">
                {drive.photo ? (
                  <img
                    src={getImageUrl(drive.photo)}
                    alt={drive.title}
                    className="aspect-video w-full object-cover"
                    onError={(e) => {
                      e.currentTarget.onerror = null;
                      e.currentTarget.src = '/placeholder.png';
                    }}
                  />
                ) : (
                  <div
                    className="flex aspect-video items-center justify-center"
                    style={{ background: 'linear-gradient(135deg, #fdf4ef 0%, #fae4d3 60%, #fefdf9 100%)' }}
                  >
                    <HeartIcon className="h-16 w-16 text-terra-300" />
                  </div>
                )}

                <div className="space-y-4 border-t border-cream-200 p-6 dark:border-forest-800">
                  <div className="flex flex-wrap gap-2">
                    <span className={isActive ? 'badge-orange' : 'badge-red'}>
                      {isActive ? (
                        <><span className="h-1.5 w-1.5 rounded-full bg-terra-500 animate-pulse" />Active campaign</>
                      ) : 'Closed campaign'}
                    </span>
                    {daysLeft !== null && isActive && (
                      <span className={`badge ${daysLeft <= 7 ? 'badge-red' : 'badge-amber'}`}>
                        <ClockIcon className="h-3.5 w-3.5" />
                        {daysLeft === 0 ? 'Final day!' : `${daysLeft} days remaining`}
                      </span>
                    )}
                  </div>

                  <div>
                    <h1 className="text-3xl text-forest-950 dark:text-cream-100 md:text-4xl">{drive.title}</h1>
                    <div className="mt-3 flex flex-wrap items-center gap-4 text-sm text-forest-500 dark:text-forest-400">
                      <span className="inline-flex items-center gap-2">
                        <LogoMark className="h-4 w-4 text-terra-500" />
                        PawTrack
                      </span>
                      <span className="inline-flex items-center gap-2">
                        <BuildingIcon className="h-4 w-4 text-terra-500" />
                        Tezpur University
                      </span>
                      {drive.deadline && (
                        <span className="inline-flex items-center gap-2">
                          <CalendarIcon className="h-4 w-4 text-terra-500" />
                          Ends {new Date(drive.deadline).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Description */}
              <div className="card p-6">
                <h2 className="text-xl text-forest-950 dark:text-cream-100">Campaign story</h2>
                <p className="mt-3 whitespace-pre-line text-sm leading-7 text-forest-600 dark:text-forest-300">
                  {drive.description || 'Donations from this campaign support treatment, vaccination, recovery, food, and safe shelter for campus animals in need at Tezpur University.'}
                </p>
              </div>

              {expenseSummary && (
                <div className="card p-6">
                  <h2 className="text-xl text-forest-950 dark:text-cream-100">Transparency</h2>
                  <p className="mt-1 text-sm text-forest-500 dark:text-forest-400">
                    Where this campaign's funds stand right now.
                  </p>
                  <div className="mt-4 grid grid-cols-3 gap-3 text-center">
                    <div>
                      <p className="text-lg font-semibold text-forest-950 dark:text-cream-100">
                        ₹{Number(drive.raised_amount).toLocaleString('en-IN')}
                      </p>
                      <p className="text-xs text-forest-500 dark:text-forest-400">Raised</p>
                    </div>
                    <div>
                      <p className="text-lg font-semibold text-forest-950 dark:text-cream-100">
                        ₹{Number(expenseSummary.spent).toLocaleString('en-IN')}
                      </p>
                      <p className="text-xs text-forest-500 dark:text-forest-400">Spent</p>
                    </div>
                    <div>
                      <p className="text-lg font-semibold text-forest-950 dark:text-cream-100">
                        ₹{Number(expenseSummary.remaining).toLocaleString('en-IN')}
                      </p>
                      <p className="text-xs text-forest-500 dark:text-forest-400">Remaining</p>
                    </div>
                  </div>
                </div>
              )}


            </div>

            {/* ── Right: Sticky sidebar (2/5) ── */}
            <div className="lg:col-span-2">
              <div className="glass-card space-y-6 p-6 lg:sticky lg:top-24">
                {/* Raised amount */}
                <div>
                  <p className="text-xs uppercase tracking-widest text-forest-500 dark:text-forest-400">Raised so far</p>
                  <div className="mt-1 flex items-end gap-2">
                    <span className="text-4xl font-bold text-forest-950 dark:text-cream-100">
                      ₹{Number(drive.raised_amount).toLocaleString('en-IN')}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-forest-500 dark:text-forest-400">
                    of <span className="font-medium text-forest-700 dark:text-forest-300">₹{Number(drive.target_amount).toLocaleString('en-IN')}</span> goal
                  </p>
                </div>

                {/* Large progress bar */}
                <div ref={pbRef}>
                  <ProgressBar raised={drive.raised_amount} goal={drive.target_amount} animate={pbVisible} />
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 gap-3 border-y border-cream-200 py-4 dark:border-forest-700">
                  {[
                    { icon: HeartIcon,      value: `${pct.toFixed(0)}%`,      label: 'Funded' },
                    { icon: ClockIcon,      value: daysLeft != null ? (daysLeft === 0 ? 'Today' : `${daysLeft}d`) : 'Open', label: 'Left' },
                  ].map((item) => {
                    const Icon = item.icon;
                    return (
                      <div key={item.label} className="text-center">
                        <div className="mx-auto mb-1.5 flex h-9 w-9 items-center justify-center rounded-xl bg-terra-50 text-terra-600 dark:bg-terra-900/20 dark:text-terra-300">
                          <Icon className="h-4 w-4" />
                        </div>
                        <p className="text-lg font-bold text-forest-950 dark:text-cream-100">{item.value}</p>
                        <p className="text-xs text-forest-500 dark:text-forest-400">{item.label}</p>
                      </div>
                    );
                  })}
                </div>

                {/* Remaining pill */}
                {isActive && remainingNeeded > 0 && (
                  <div className="rounded-xl border border-cream-200 bg-cream-50 px-4 py-3 dark:border-forest-700 dark:bg-forest-800/50">
                    <p className="text-xs text-forest-500 dark:text-forest-400">Still needed</p>
                    <p className="text-lg font-bold text-forest-950 dark:text-cream-100">
                      ₹{remainingNeeded.toLocaleString('en-IN')}
                    </p>
                  </div>
                )}

                {/* CTA */}
                {isActive ? (
                  <>
                    <button
                      onClick={() => {
                        if (!user) { nav('/'); return; }
                        setShowModal(true);
                      }}
                      className="btn-donate w-full text-base py-4 glow-terra"
                    >
                      <HeartIcon className="h-5 w-5" />
                      Donate Now
                    </button>
                    {!user && (
                      <p className="text-center text-xs text-forest-500 dark:text-forest-400">
                        <Link to="/" className="font-medium text-terra-600 hover:underline dark:text-terra-300">Sign in</Link>
                        {' '}or{' '}
                        <Link to="/register" className="font-medium text-terra-600 hover:underline dark:text-terra-300">register</Link>
                        {' '}to contribute.
                      </p>
                    )}
                  </>
                ) : (
                  <div className="rounded-2xl border border-cream-200 bg-cream-50 p-4 text-center dark:border-forest-800 dark:bg-forest-800/60">
                    <p className="text-sm text-forest-600 dark:text-forest-300">This campaign is no longer accepting contributions.</p>
                    <Link to="/home/donations" className="mt-3 inline-flex text-sm font-medium text-terra-600 hover:text-terra-700 dark:text-terra-300">
                      View other campaigns →
                    </Link>
                  </div>
                )}

                {/* Share */}
                <div className="border-t border-cream-200 pt-4 dark:border-forest-700">
                  <p className="mb-3 text-sm font-medium text-forest-800 dark:text-cream-200">Share this campaign</p>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      {
                        icon: CopyIcon,
                        label: 'Copy link',
                        action: () => {
                          navigator.clipboard.writeText(window.location.href);
                          showToast('success', 'Campaign link copied!', 2500);
                        },
                      },
                      {
                        icon: ShareIcon,
                        label: 'WhatsApp',
                        action: () => window.open(`https://wa.me/?text=${encodeURIComponent('Support campus animals: ' + window.location.href)}`),
                      },
                      {
                        icon: ExternalLinkIcon,
                        label: 'Twitter',
                        action: () => window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent('Support ' + drive.title + ' on PawTrack: ' + window.location.href)}`),
                      },
                    ].map((item) => {
                      const Icon = item.icon;
                      return (
                        <button key={item.label} onClick={item.action} className="btn-ghost btn-sm justify-center text-xs px-2">
                          <Icon className="h-4 w-4" />
                          {item.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Trust note */}
                <p className="text-center text-xs text-forest-400 dark:text-forest-500">
                  🔒 Secure checkout · Test mode
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {showModal && (
        <DonationModal
          drive={drive}
          user={user}
          onClose={() => setShowModal(false)}
          onSuccess={handleSuccess}
        />
      )}
    </>
  );
}
