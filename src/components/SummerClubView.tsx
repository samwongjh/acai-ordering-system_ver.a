import { useEffect, useState, type FormEvent } from 'react';
import { Award, Clock, LogOut, MapPin, RotateCcw, Sparkles, UserCheck } from 'lucide-react';
import type { MemberAccount, Order } from '../types.ts';

interface SummerClubViewProps {
  member: MemberAccount | null;
  authToken: string | null;
  onAuthSuccess: (member: MemberAccount, token: string) => void;
  onLogout: () => void;
  onTrackOrder: (order: Order) => void;
  onReorder: (order: Order) => void;
}

export function SummerClubView({
  member,
  authToken,
  onAuthSuccess,
  onLogout,
  onTrackOrder,
  onReorder,
}: SummerClubViewProps) {
  const [authTab, setAuthTab] = useState<'login' | 'register'>('login');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [orders, setOrders] = useState<Order[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);

  useEffect(() => {
    if (!member || !authToken) {
      setOrders([]);
      return;
    }
    let cancelled = false;
    setLoadingOrders(true);
    fetch('/api/orders/member/history', {
      headers: { Authorization: `Bearer ${authToken}` },
    })
      .then((res) => (res.ok ? res.json() : { orders: [] }))
      .then((data) => {
        if (!cancelled) setOrders(data.orders || []);
      })
      .catch(() => {
        if (!cancelled) setOrders([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingOrders(false);
      });

    return () => {
      cancelled = true;
    };
  }, [member, authToken]);

  const handleDemoLogin = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ demo: true }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Login failed');
      onAuthSuccess(data.member, data.token);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to sign in');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const url = authTab === 'login' ? '/api/auth/login' : '/api/auth/register';
      const body =
        authTab === 'login'
          ? { identifier, password }
          : { name, email, phone, password };
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Authentication error');
      onAuthSuccess(data.member, data.token);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to authenticate');
    } finally {
      setLoading(false);
    }
  };

  if (!member) {
    return (
      <div className="max-w-lg mx-auto px-4 py-8 sm:py-12">
        <div className="bg-white rounded-2xl border border-[#1C1523]/10 p-6 sm:p-8 space-y-6">
          <div>
            <p className="text-xs font-semibold text-[#5B2378]">Summer Club Membership</p>
            <h1 className="mt-1 font-display text-2xl font-bold text-[#1C1523]">
              Earn 10 pts for every S$1 spent
            </h1>
            <p className="mt-1.5 text-sm text-[#665E6E]">
              Sign in to redeem Summer Points (100 pts = S$1.00 off), save Punggol Coast delivery addresses, and reorder favorites in one tap.
            </p>
          </div>

          <button
            type="button"
            disabled={loading}
            onClick={handleDemoLogin}
            className="w-full h-12 rounded-xl bg-[#5B2378]/10 hover:bg-[#5B2378]/15 border border-[#5B2378]/25 text-sm font-semibold text-[#5B2378] flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            <Sparkles className="w-4 h-4" />
            <span>Continue as Tessa Tan (Demo Member · 420 pts)</span>
          </button>

          <div className="relative flex items-center justify-center">
            <span className="border-t border-[#1C1523]/10 w-full" />
            <span className="bg-white px-3 text-xs text-[#665E6E] whitespace-nowrap">
              or use your account
            </span>
            <span className="border-t border-[#1C1523]/10 w-full" />
          </div>

          <div className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-[#FAF9F7] border border-[#1C1523]/8">
            <button
              type="button"
              onClick={() => {
                setAuthTab('login');
                setError('');
              }}
              className={`h-10 rounded-lg text-xs font-semibold cursor-pointer ${
                authTab === 'login' ? 'bg-white text-[#1C1523] shadow-sm' : 'text-[#665E6E]'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setAuthTab('register');
                setError('');
              }}
              className={`h-10 rounded-lg text-xs font-semibold cursor-pointer ${
                authTab === 'register' ? 'bg-white text-[#1C1523] shadow-sm' : 'text-[#665E6E]'
              }`}
            >
              Create Account
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            {authTab === 'register' && (
              <>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Full Name"
                  className="w-full h-11 px-3.5 rounded-xl border border-[#1C1523]/12 text-sm focus:outline-none focus:border-[#5B2378]"
                />
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Singapore Mobile (+65 9XXX XXXX)"
                  className="w-full h-11 px-3.5 rounded-xl border border-[#1C1523]/12 text-sm focus:outline-none focus:border-[#5B2378]"
                />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Email Address"
                  className="w-full h-11 px-3.5 rounded-xl border border-[#1C1523]/12 text-sm focus:outline-none focus:border-[#5B2378]"
                />
              </>
            )}
            {authTab === 'login' && (
              <input
                type="text"
                required
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="Email or Mobile Number"
                className="w-full h-11 px-3.5 rounded-xl border border-[#1C1523]/12 text-sm focus:outline-none focus:border-[#5B2378]"
              />
            )}
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password (min 6 chars)"
              className="w-full h-11 px-3.5 rounded-xl border border-[#1C1523]/12 text-sm focus:outline-none focus:border-[#5B2378]"
            />

            {error && <p className="text-xs font-medium text-rose-600">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full h-12 rounded-xl bg-[#1C1523] hover:bg-[#5B2378] text-white text-sm font-semibold transition-colors cursor-pointer disabled:opacity-60"
            >
              {loading
                ? 'Authenticating...'
                : authTab === 'login'
                ? 'Sign In'
                : 'Join & Receive 150 Bonus Points'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  const nextTierTarget = member.points >= 1000 ? 1000 : member.points >= 400 ? 1000 : 400;
  const progressPct = Math.min(100, Math.round((member.points / nextTierTarget) * 100));

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
      {/* Member Loyalty Card */}
      <div className="bg-[#1C1523] text-white rounded-2xl p-6 sm:p-7 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs text-white/75">
            <UserCheck className="w-4 h-4 text-[#F59E0B]" />
            <span>{member.tier}</span>
            <span aria-hidden="true">·</span>
            <span>{member.phone}</span>
          </div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold">{member.name}</h1>
          <p className="text-xs text-white/70">{member.email}</p>

          <div className="pt-2 max-w-xs">
            <div className="flex justify-between text-[11px] text-white/75 mb-1 tabular-nums">
              <span>{member.points} pts earned</span>
              <span>
                {member.points >= 1000
                  ? 'Top Tier Unlocked'
                  : `${nextTierTarget - member.points} pts to next tier`}
              </span>
            </div>
            <div className="h-1.5 rounded-full bg-white/15 overflow-hidden">
              <div
                className="h-full bg-[#F59E0B] rounded-full transition-all"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>
        </div>

        <div className="flex sm:flex-col items-center sm:items-end justify-between gap-3">
          <div className="sm:text-right">
            <p className="text-xs text-white/75 flex items-center sm:justify-end gap-1">
              <Award className="w-3.5 h-3.5 text-[#F59E0B]" />
              Available Balance
            </p>
            <p className="font-mono text-3xl font-bold tabular-nums">
              {member.points} <span className="text-sm font-normal text-white/75">pts</span>
            </p>
            <p className="text-[11px] text-white/70 tabular-nums">
              Worth S${(Math.floor(member.points / 100)).toFixed(2)} at checkout
            </p>
          </div>

          <button
            type="button"
            onClick={onLogout}
            className="min-h-[40px] px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-semibold text-white inline-flex items-center gap-1.5 cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>

      {/* Saved Addresses */}
      <div className="bg-white rounded-2xl border border-[#1C1523]/8 p-5">
        <h2 className="font-display text-base font-bold text-[#1C1523] mb-3 flex items-center gap-2">
          <MapPin className="w-4 h-4 text-[#5B2378]" />
          <span>Saved Punggol & Delivery Addresses</span>
        </h2>
        {member.savedAddresses.length === 0 ? (
          <p className="text-xs text-[#665E6E]">
            Your next delivery address will automatically save here for faster checkout.
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {member.savedAddresses.map((addr) => (
              <div
                key={addr.id}
                className="p-3.5 rounded-xl bg-[#FAF9F7] border border-[#1C1523]/8 text-xs space-y-1"
              >
                <p className="font-bold text-[#1C1523]">{addr.label}</p>
                <p className="text-[#665E6E]">
                  {addr.street} {addr.unit}
                </p>
                <p className="font-mono text-[#665E6E]">Singapore {addr.postalCode}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Order History */}
      <div className="bg-white rounded-2xl border border-[#1C1523]/8 p-5">
        <h2 className="font-display text-base font-bold text-[#1C1523] mb-3 flex items-center gap-2">
          <Clock className="w-4 h-4 text-[#5B2378]" />
          <span>Order History</span>
        </h2>

        {loadingOrders ? (
          <p className="text-xs text-[#665E6E] py-4">Loading your past orders...</p>
        ) : orders.length === 0 ? (
          <p className="text-xs text-[#665E6E] py-4">
            No orders placed yet. Your Punggol Coast orders will appear here.
          </p>
        ) : (
          <div className="divide-y divide-[#1C1523]/8">
            {orders.map((order) => (
              <div
                key={order.id}
                className="py-3.5 first:pt-1 last:pb-1 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2 text-xs">
                    <span className="font-mono font-bold text-[#1C1523]">
                      #{order.queueNumber}
                    </span>
                    <span className="text-[#665E6E]">·</span>
                    <span className="text-[#665E6E]">{order.id}</span>
                    <span className="text-[#665E6E]">·</span>
                    <span className="font-medium text-[#5B2378]">
                      {order.estimatedTimeLabel}
                    </span>
                  </div>
                  <p className="text-sm font-semibold text-[#1C1523]">
                    {order.items.map((i) => `${i.quantity}x ${i.name}`).join(', ')}
                  </p>
                  <p className="text-xs text-[#665E6E] tabular-nums">
                    Total S${order.total.toFixed(2)} · Earned +{order.pointsEarned} pts
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => onTrackOrder(order)}
                    className="min-h-[38px] px-3.5 rounded-xl border border-[#1C1523]/12 hover:border-[#1C1523]/30 text-xs font-semibold text-[#1C1523] cursor-pointer"
                  >
                    View Tracker
                  </button>
                  <button
                    type="button"
                    onClick={() => onReorder(order)}
                    className="min-h-[38px] px-3.5 rounded-xl bg-[#1C1523] hover:bg-[#5B2378] text-white text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Reorder</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
