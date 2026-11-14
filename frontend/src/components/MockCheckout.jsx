import React, { useState } from 'react';
import API from '../api/api';

// Simulated Razorpay-style checkout popup. No real money moves.
// Test values: card 4111 1111 1111 1111 = success, 4000 0000 0000 0002 = failure
//              UPI  success@razorpay = success,    failure@razorpay = failure
export default function MockCheckout({ order, drive, user, onPaid, onCancel }) {
  const [tab, setTab] = useState('upi');
  const [upi, setUpi] = useState('success@razorpay');
  const [card, setCard] = useState({ number: '4111 1111 1111 1111', expiry: '12/30', cvv: '123' });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const pay = async () => {
    setErr('');
    setBusy(true);
    const willFail =
      tab === 'upi'
        ? upi.toLowerCase().startsWith('failure')
        : card.number.replace(/\s/g, '') === '4000000000000002';
    try {
      await new Promise((r) => setTimeout(r, 1500)); // fake processing delay
      const { data } = await API.post('/donations/mock-gateway/pay', {
        order_id: order.order_id,
        outcome: willFail ? 'failure' : 'success',
      });
      await onPaid(data);
    } catch (e) {
      setErr(e.response?.data?.error || 'Payment failed. Please try again.');
      setBusy(false);
    }
  };

  const tabCls = (t) =>
    `flex-1 rounded-lg py-2 text-sm font-medium ${
      tab === t ? 'bg-[#3395ff] text-white' : 'bg-slate-100 text-slate-700'
    }`;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-sm overflow-hidden rounded-xl bg-white shadow-2xl">
        <div className="bg-[#072654] p-5 text-white">
          <p className="text-xs opacity-70">PawTrack · Test Mode</p>
          <p className="mt-1 truncate text-sm">{drive.title}</p>
          <p className="mt-2 text-2xl font-semibold">₹{Number(order.amount).toLocaleString('en-IN')}</p>
          <p className="text-xs opacity-70">{user?.email}</p>
        </div>

        <div className="space-y-4 p-5 text-slate-800">
          <div className="flex gap-2">
            <button type="button" className={tabCls('upi')} onClick={() => setTab('upi')}>UPI</button>
            <button type="button" className={tabCls('card')} onClick={() => setTab('card')}>Card</button>
          </div>

          {tab === 'upi' ? (
            <input
              className="w-full rounded-lg border p-3 text-sm"
              value={upi}
              onChange={(e) => setUpi(e.target.value)}
              placeholder="name@upi"
            />
          ) : (
            <div className="space-y-2">
              <input
                className="w-full rounded-lg border p-3 text-sm"
                value={card.number}
                onChange={(e) => setCard({ ...card, number: e.target.value })}
                placeholder="Card number"
              />
              <div className="flex gap-2">
                <input
                  className="w-1/2 rounded-lg border p-3 text-sm"
                  value={card.expiry}
                  onChange={(e) => setCard({ ...card, expiry: e.target.value })}
                  placeholder="MM/YY"
                />
                <input
                  className="w-1/2 rounded-lg border p-3 text-sm"
                  value={card.cvv}
                  onChange={(e) => setCard({ ...card, cvv: e.target.value })}
                  placeholder="CVV"
                />
              </div>
            </div>
          )}

          {err && <p className="rounded-lg bg-red-50 p-2 text-sm text-red-700">{err}</p>}

          <button
            type="button"
            onClick={pay}
            disabled={busy}
            className="w-full rounded-lg bg-[#3395ff] py-3 font-semibold text-white disabled:opacity-60"
          >
            {busy ? 'Processing…' : `Pay ₹${Number(order.amount).toLocaleString('en-IN')}`}
          </button>
          <button type="button" onClick={onCancel} disabled={busy} className="w-full text-sm text-slate-500">
            Cancel
          </button>
          <p className="text-center text-[11px] text-slate-400">
            Simulated payment. No real money is charged.
          </p>
        </div>
      </div>
    </div>
  );
}
