import { useState, type FormEvent } from 'react';
import {
  ArrowLeft,
  Check,
  CreditCard,
  Gift,
  Minus,
  Plus,
  QrCode,
  ShoppingBag,
  Smartphone,
  Tag,
  Trash2,
  UserCheck,
  Wallet,
  X,
} from 'lucide-react';
import type {
  CartItem,
  CustomerCheckoutInfo,
  FulfillmentMode,
  MemberAccount,
  MenuItem,
  Order,
  PaymentMethod,
} from '../types.ts';
import { OUTLET_INFO } from '../data/menuData.ts';
import { FoodImage } from './FoodImage.tsx';

type CheckoutStep = 'basket' | 'identity' | 'payment';

interface CartCheckoutPanelProps {
  items: CartItem[];
  fulfillmentMode: FulfillmentMode;
  onChangeFulfillment: (mode: FulfillmentMode) => void;
  onUpdateQuantity: (cartItemId: string, delta: number) => void;
  onRemoveItem: (cartItemId: string) => void;
  onClearCart: () => void;
  upsellItems: MenuItem[];
  onQuickAddUpsell: (item: MenuItem) => void;
  member: MemberAccount | null;
  authToken: string | null;
  onAuthSuccess: (member: MemberAccount, token: string) => void;
  onOrderCreated: (order: Order, updatedMember: MemberAccount | null) => void;
  onCloseMobile?: () => void;
}

export function CartCheckoutPanel({
  items,
  fulfillmentMode,
  onChangeFulfillment,
  onUpdateQuantity,
  onRemoveItem,
  upsellItems,
  onQuickAddUpsell,
  member,
  authToken,
  onAuthSuccess,
  onOrderCreated,
  onCloseMobile,
}: CartCheckoutPanelProps) {
  const [step, setStep] = useState<CheckoutStep>('basket');
  const [promoInput, setPromoInput] = useState('');
  const [appliedPromo, setAppliedPromo] = useState<string | null>(null);
  const [promoError, setPromoError] = useState('');
  const [utensilsIncluded, setUtensilsIncluded] = useState(true);
  const [redeemPoints, setRedeemPoints] = useState(false);

  // Account vs Guest Mode in Step 2
  const [checkoutIdentityMode, setCheckoutIdentityMode] = useState<'member' | 'guest'>(
    member ? 'member' : 'guest'
  );

  // Inline Member Login / Register state
  const [authTab, setAuthTab] = useState<'login' | 'register'>('login');
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState('');

  // Guest / Delivery contact fields
  const [contactName, setContactName] = useState(member?.name || '');
  const [contactPhone, setContactPhone] = useState(member?.phone || '');
  const [contactEmail, setContactEmail] = useState(member?.email || '');
  const [pickupWindow, setPickupWindow] = useState('ASAP (~10 mins)');
  const [street, setStreet] = useState(member?.savedAddresses[0]?.street || '');
  const [unit, setUnit] = useState(member?.savedAddresses[0]?.unit || '');
  const [postalCode, setPostalCode] = useState(member?.savedAddresses[0]?.postalCode || '');
  const [dropoffNote, setDropoffNote] = useState(member?.savedAddresses[0]?.notes || '');
  const [formError, setFormError] = useState('');

  // Step 3 Payment
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('paynow');
  const [placingOrder, setPlacingOrder] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const subtotal = Number(items.reduce((sum, i) => sum + i.lineTotal, 0).toFixed(2));
  const deliveryFee =
    fulfillmentMode === 'delivery' && items.length > 0
      ? subtotal >= OUTLET_INFO.freeDeliveryThreshold
        ? 0
        : OUTLET_INFO.deliveryFee
      : 0;

  let promoDiscount = 0;
  if (appliedPromo === 'PUNGGOL10') {
    promoDiscount = Number((subtotal * 0.1).toFixed(2));
  } else if (appliedPromo === 'SUMMER5' && subtotal >= 25) {
    promoDiscount = 5.0;
  }

  let pointsDiscount = 0;
  let redeemablePoints = 0;
  if (member && redeemPoints && member.points >= 100) {
    const maxHundreds = Math.floor(member.points / 100) * 100;
    const maxAffordable = Math.floor(Math.max(0, subtotal - promoDiscount)) * 100;
    redeemablePoints = Math.min(maxHundreds, maxAffordable);
    pointsDiscount = Number((redeemablePoints / 100).toFixed(2));
  }

  const grandTotal = Number(
    Math.max(0, subtotal - promoDiscount - pointsDiscount + deliveryFee).toFixed(2)
  );
  const totalCount = items.reduce((sum, i) => sum + i.quantity, 0);

  const handleApplyPromo = (e: FormEvent) => {
    e.preventDefault();
    const code = promoInput.trim().toUpperCase();
    setPromoError('');
    if (!code) return;
    if (code === 'PUNGGOL10') {
      setAppliedPromo('PUNGGOL10');
      setPromoInput('');
    } else if (code === 'SUMMER5') {
      if (subtotal < 25) {
        setPromoError('SUMMER5 requires a minimum subtotal of S$25.00.');
        return;
      }
      setAppliedPromo('SUMMER5');
      setPromoInput('');
    } else {
      setPromoError('Invalid code. Try PUNGGOL10 or SUMMER5.');
    }
  };

  const syncMemberFields = (m: MemberAccount) => {
    setContactName(m.name);
    setContactPhone(m.phone);
    setContactEmail(m.email);
    if (m.savedAddresses[0]) {
      setStreet(m.savedAddresses[0].street);
      setUnit(m.savedAddresses[0].unit);
      setPostalCode(m.savedAddresses[0].postalCode);
      setDropoffNote(m.savedAddresses[0].notes || '');
    }
    setCheckoutIdentityMode('member');
  };

  const handleDemoMemberLogin = async () => {
    setAuthLoading(true);
    setAuthError('');
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ demo: true }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Demo sign-in failed');
      onAuthSuccess(data.member, data.token);
      syncMemberFields(data.member);
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : 'Unable to sign in');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleMemberAuthSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError('');
    try {
      const endpoint = authTab === 'login' ? '/api/auth/login' : '/api/auth/register';
      const payload =
        authTab === 'login'
          ? { identifier: loginIdentifier, password: loginPassword }
          : { name: regName, email: regEmail, phone: regPhone, password: regPassword };
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Authentication failed');
      onAuthSuccess(data.member, data.token);
      syncMemberFields(data.member);
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : 'Authentication error');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleContinueToPayment = () => {
    setFormError('');
    const effectiveName = (member && checkoutIdentityMode === 'member' ? member.name : contactName).trim();
    const effectivePhone = (member && checkoutIdentityMode === 'member' ? member.phone : contactPhone).trim();

    if (!effectiveName) {
      setFormError('Please enter your name for the order.');
      return;
    }
    if (!effectivePhone || effectivePhone.replace(/\D/g, '').length < 8) {
      setFormError('Please enter a valid Singapore mobile number (e.g. +65 9123 4567).');
      return;
    }
    if (fulfillmentMode === 'delivery') {
      if (!street.trim() || !postalCode.trim()) {
        setFormError('Please provide your delivery street address and 6-digit postal code.');
        return;
      }
    }
    setStep('payment');
  };

  const handlePlaceOrder = async () => {
    setPlacingOrder(true);
    setSubmitError('');

    const useMember = Boolean(member && checkoutIdentityMode === 'member');
    const customer: CustomerCheckoutInfo = {
      isGuest: !useMember,
      memberId: useMember ? member?.id : undefined,
      name: (useMember ? member!.name : contactName).trim(),
      phone: (useMember ? member!.phone : contactPhone).trim(),
      email: (useMember ? member!.email : contactEmail).trim() || 'guest@summeracai.sg',
      pickupWindow: fulfillmentMode === 'pickup' ? pickupWindow : undefined,
      deliveryAddress:
        fulfillmentMode === 'delivery'
          ? {
              street: street.trim(),
              unit: unit.trim(),
              postalCode: postalCode.trim(),
              dropoffNote: dropoffNote.trim(),
            }
          : undefined,
    };

    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (useMember && authToken) {
        headers.Authorization = `Bearer ${authToken}`;
      }
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          fulfillmentMode,
          items,
          customer,
          paymentMethod,
          utensilsIncluded,
          promoCode: appliedPromo,
          redeemPoints: useMember && redeemPoints,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not place order');
      setStep('basket');
      setAppliedPromo(null);
      setRedeemPoints(false);
      onOrderCreated(data.order, data.updatedMember || null);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Checkout failed. Please try again.');
    } finally {
      setPlacingOrder(false);
    }
  };

  const availableUpsells = upsellItems.filter(
    (u) => !items.some((cartItem) => cartItem.menuItemId === u.id)
  );

  return (
    <div className="bg-white rounded-2xl border border-[#1C1523]/10 flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3.5 border-b border-[#1C1523]/8 flex items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          {step !== 'basket' && (
            <button
              type="button"
              onClick={() => setStep(step === 'payment' ? 'identity' : 'basket')}
              aria-label="Go back"
              className="w-9 h-9 -ml-1.5 rounded-xl flex items-center justify-center text-[#1C1523] hover:bg-[#F3EFEA] cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          )}
          <div>
            <h2 className="font-display text-base font-bold text-[#1C1523]">
              {step === 'basket' && 'Your Basket'}
              {step === 'identity' && 'Member or Guest'}
              {step === 'payment' && 'Confirm & Pay'}
            </h2>
            <p className="text-xs text-[#665E6E] truncate">
              {fulfillmentMode === 'pickup' ? 'Self Pick-Up · #01-12' : 'Island Delivery · Punggol Coast'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-[#665E6E] tabular-nums">
            Step {step === 'basket' ? '1' : step === 'identity' ? '2' : '3'} / 3
          </span>
          {onCloseMobile && (
            <button
              type="button"
              onClick={onCloseMobile}
              aria-label="Close basket"
              className="w-9 h-9 rounded-xl flex items-center justify-center text-[#1C1523] hover:bg-[#F3EFEA] cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* Empty State */}
      {items.length === 0 ? (
        <div className="p-8 text-center flex-1 flex flex-col items-center justify-center">
          <div className="w-12 h-12 rounded-2xl bg-[#F3EFEA] flex items-center justify-center text-[#5B2378] mb-3">
            <ShoppingBag className="w-6 h-6" />
          </div>
          <p className="font-display text-base font-bold text-[#1C1523]">Your basket is empty</p>
          <p className="mt-1 text-xs text-[#665E6E] max-w-[230px]">
            Tap any signature açaí bowl or Thirst Trap beverage to build your order.
          </p>
        </div>
      ) : (
        <>
          {/* Body */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {step === 'basket' && (
              <>
                {/* Fulfillment Quick Switch inside basket */}
                <div className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-[#FAF9F7] border border-[#1C1523]/8">
                  <button
                    type="button"
                    onClick={() => onChangeFulfillment('pickup')}
                    className={`h-9 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                      fulfillmentMode === 'pickup'
                        ? 'bg-white text-[#1C1523] shadow-sm'
                        : 'text-[#665E6E]'
                    }`}
                  >
                    Pick-Up (Free)
                  </button>
                  <button
                    type="button"
                    onClick={() => onChangeFulfillment('delivery')}
                    className={`h-9 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                      fulfillmentMode === 'delivery'
                        ? 'bg-white text-[#1C1523] shadow-sm'
                        : 'text-[#665E6E]'
                    }`}
                  >
                    Delivery (S$3.50)
                  </button>
                </div>

                {/* Items List */}
                <div className="divide-y divide-[#1C1523]/8">
                  {items.map((item) => (
                    <div key={item.cartItemId} className="py-3 first:pt-1 last:pb-1 flex gap-3">
                      <FoodImage
                        src={item.image}
                        alt={item.name}
                        className="w-14 h-14 rounded-xl object-cover shrink-0 bg-[#F3EFEA]"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="text-sm font-semibold text-[#1C1523] truncate">
                            {item.name}
                          </h3>
                          <span className="font-mono text-xs font-semibold text-[#1C1523] tabular-nums shrink-0">
                            S${item.lineTotal.toFixed(2)}
                          </span>
                        </div>

                        {item.selectedModifiers.length > 0 && (
                          <p className="mt-0.5 text-xs text-[#665E6E] line-clamp-2">
                            {item.selectedModifiers.map((m) => m.optionName).join(' · ')}
                          </p>
                        )}
                        {item.specialInstructions && (
                          <p className="mt-0.5 text-xs italic text-[#5B2378]">
                            Note: {item.specialInstructions}
                          </p>
                        )}

                        <div className="mt-2 flex items-center justify-between">
                          <div className="inline-flex items-center border border-[#1C1523]/12 rounded-lg h-8 bg-[#FAF9F7]">
                            <button
                              type="button"
                              onClick={() => onUpdateQuantity(item.cartItemId, -1)}
                              aria-label={`Decrease ${item.name} quantity`}
                              className="w-8 h-full flex items-center justify-center text-[#1C1523] hover:bg-[#EAE3DA] rounded-l-lg cursor-pointer"
                            >
                              {item.quantity === 1 ? (
                                <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                              ) : (
                                <Minus className="w-3.5 h-3.5" />
                              )}
                            </button>
                            <span className="w-7 text-center font-mono text-xs font-semibold tabular-nums">
                              {item.quantity}
                            </span>
                            <button
                              type="button"
                              onClick={() => onUpdateQuantity(item.cartItemId, 1)}
                              aria-label={`Increase ${item.name} quantity`}
                              className="w-8 h-full flex items-center justify-center text-[#1C1523] hover:bg-[#EAE3DA] rounded-r-lg cursor-pointer"
                            >
                              <Plus className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          <button
                            type="button"
                            onClick={() => onRemoveItem(item.cartItemId)}
                            className="text-xs text-[#665E6E] hover:text-rose-600 cursor-pointer"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Qlub-Style Pair With Drink Upsell */}
                {availableUpsells.length > 0 && (
                  <div className="pt-3 border-t border-[#1C1523]/8">
                    <p className="text-xs font-semibold text-[#1C1523] mb-2">
                      Pair with a Thirst Trap drink
                    </p>
                    <div className="space-y-2">
                      {availableUpsells.slice(0, 2).map((up) => (
                        <div
                          key={up.id}
                          className="flex items-center justify-between gap-2.5 p-2 rounded-xl bg-[#FAF9F7] border border-[#1C1523]/8"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <FoodImage
                              src={up.image}
                              alt={up.name}
                              className="w-10 h-10 rounded-lg object-cover shrink-0"
                            />
                            <div className="min-w-0">
                              <p className="text-xs font-semibold text-[#1C1523] truncate">
                                {up.name}
                              </p>
                              <p className="font-mono text-[11px] text-[#665E6E] tabular-nums">
                                S${up.basePrice.toFixed(2)}
                              </p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => onQuickAddUpsell(up)}
                            className="min-h-[36px] px-3 rounded-lg bg-white border border-[#1C1523]/12 text-xs font-semibold text-[#1C1523] hover:border-[#5B2378] hover:text-[#5B2378] transition-colors shrink-0 cursor-pointer"
                          >
                            + Add
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Promo Code */}
                <form onSubmit={handleApplyPromo} className="pt-3 border-t border-[#1C1523]/8">
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <Tag className="w-3.5 h-3.5 text-[#665E6E] absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={promoInput}
                        onChange={(e) => setPromoInput(e.target.value)}
                        placeholder="Promo code (e.g. PUNGGOL10)"
                        className="w-full h-10 pl-8 pr-3 rounded-xl border border-[#1C1523]/12 text-xs text-[#1C1523] placeholder:text-[#665E6E]/70 focus:outline-none focus:border-[#5B2378]"
                      />
                    </div>
                    <button
                      type="submit"
                      className="h-10 px-3.5 rounded-xl bg-[#F3EFEA] hover:bg-[#EAE3DA] text-xs font-semibold text-[#1C1523] cursor-pointer shrink-0"
                    >
                      Apply
                    </button>
                  </div>
                  {promoError && <p className="mt-1.5 text-xs text-rose-600">{promoError}</p>}
                  {appliedPromo && (
                    <div className="mt-1.5 flex items-center justify-between text-xs text-emerald-700 font-medium">
                      <span>Code {appliedPromo} applied</span>
                      <button
                        type="button"
                        onClick={() => setAppliedPromo(null)}
                        className="underline cursor-pointer"
                      >
                        Remove
                      </button>
                    </div>
                  )}
                </form>

                {/* Utensils Toggle */}
                <label className="flex items-center justify-between gap-3 pt-2 cursor-pointer">
                  <span className="text-xs text-[#665E6E]">Include wooden spoon & napkins</span>
                  <input
                    type="checkbox"
                    checked={utensilsIncluded}
                    onChange={(e) => setUtensilsIncluded(e.target.checked)}
                    className="w-4 h-4 accent-[#5B2378] rounded"
                  />
                </label>
              </>
            )}

            {step === 'identity' && (
              <div className="space-y-4">
                {/* Member Login vs Guest Checkout Segmented Switch */}
                <div className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-[#FAF9F7] border border-[#1C1523]/8">
                  <button
                    type="button"
                    onClick={() => setCheckoutIdentityMode('member')}
                    className={`min-h-[40px] px-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                      checkoutIdentityMode === 'member'
                        ? 'bg-white text-[#1C1523] shadow-sm'
                        : 'text-[#665E6E]'
                    }`}
                  >
                    Summer Club Member
                  </button>
                  <button
                    type="button"
                    onClick={() => setCheckoutIdentityMode('guest')}
                    className={`min-h-[40px] px-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                      checkoutIdentityMode === 'guest'
                        ? 'bg-white text-[#1C1523] shadow-sm'
                        : 'text-[#665E6E]'
                    }`}
                  >
                    Guest Checkout
                  </button>
                </div>

                {checkoutIdentityMode === 'member' && !member && (
                  <div className="rounded-xl border border-[#1C1523]/10 bg-[#FAF9F7] p-3.5 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 text-xs font-semibold">
                        <button
                          type="button"
                          onClick={() => setAuthTab('login')}
                          className={`pb-0.5 border-b-2 cursor-pointer ${
                            authTab === 'login'
                              ? 'border-[#5B2378] text-[#1C1523]'
                              : 'border-transparent text-[#665E6E]'
                          }`}
                        >
                          Sign In
                        </button>
                        <button
                          type="button"
                          onClick={() => setAuthTab('register')}
                          className={`pb-0.5 border-b-2 cursor-pointer ${
                            authTab === 'register'
                              ? 'border-[#5B2378] text-[#1C1523]'
                              : 'border-transparent text-[#665E6E]'
                          }`}
                        >
                          Join (+150 pts)
                        </button>
                      </div>

                      <button
                        type="button"
                        disabled={authLoading}
                        onClick={handleDemoMemberLogin}
                        className="text-xs font-semibold text-[#5B2378] hover:underline cursor-pointer"
                      >
                        1-Tap Demo Member
                      </button>
                    </div>

                    <form onSubmit={handleMemberAuthSubmit} className="space-y-2.5">
                      {authTab === 'register' && (
                        <>
                          <input
                            type="text"
                            required
                            value={regName}
                            onChange={(e) => setRegName(e.target.value)}
                            placeholder="Full Name"
                            className="w-full h-10 px-3 rounded-xl bg-white border border-[#1C1523]/12 text-xs focus:outline-none focus:border-[#5B2378]"
                          />
                          <input
                            type="tel"
                            required
                            value={regPhone}
                            onChange={(e) => setRegPhone(e.target.value)}
                            placeholder="SG Mobile (+65 9XXX XXXX)"
                            className="w-full h-10 px-3 rounded-xl bg-white border border-[#1C1523]/12 text-xs focus:outline-none focus:border-[#5B2378]"
                          />
                          <input
                            type="email"
                            required
                            value={regEmail}
                            onChange={(e) => setRegEmail(e.target.value)}
                            placeholder="Email address"
                            className="w-full h-10 px-3 rounded-xl bg-white border border-[#1C1523]/12 text-xs focus:outline-none focus:border-[#5B2378]"
                          />
                          <input
                            type="password"
                            required
                            minLength={6}
                            value={regPassword}
                            onChange={(e) => setRegPassword(e.target.value)}
                            placeholder="Password (min 6 characters)"
                            className="w-full h-10 px-3 rounded-xl bg-white border border-[#1C1523]/12 text-xs focus:outline-none focus:border-[#5B2378]"
                          />
                        </>
                      )}

                      {authTab === 'login' && (
                        <>
                          <input
                            type="text"
                            required
                            value={loginIdentifier}
                            onChange={(e) => setLoginIdentifier(e.target.value)}
                            placeholder="Email or SG Mobile"
                            className="w-full h-10 px-3 rounded-xl bg-white border border-[#1C1523]/12 text-xs focus:outline-none focus:border-[#5B2378]"
                          />
                          <input
                            type="password"
                            required
                            value={loginPassword}
                            onChange={(e) => setLoginPassword(e.target.value)}
                            placeholder="Password"
                            className="w-full h-10 px-3 rounded-xl bg-white border border-[#1C1523]/12 text-xs focus:outline-none focus:border-[#5B2378]"
                          />
                        </>
                      )}

                      {authError && <p className="text-xs text-rose-600">{authError}</p>}

                      <button
                        type="submit"
                        disabled={authLoading}
                        className="w-full h-10 rounded-xl bg-[#1C1523] text-white text-xs font-semibold hover:bg-[#5B2378] transition-colors cursor-pointer disabled:opacity-60"
                      >
                        {authLoading
                          ? 'Please wait...'
                          : authTab === 'login'
                          ? 'Sign In to Summer Club'
                          : 'Create Account & Earn 150 pts'}
                      </button>
                    </form>
                  </div>
                )}

                {checkoutIdentityMode === 'member' && member && (
                  <div className="rounded-xl border border-[#5B2378]/25 bg-[#5B2378]/5 p-3.5 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <UserCheck className="w-4 h-4 text-[#5B2378]" />
                        <div>
                          <p className="text-xs font-bold text-[#1C1523]">{member.name}</p>
                          <p className="text-[11px] text-[#665E6E]">
                            {member.tier} · {member.phone}
                          </p>
                        </div>
                      </div>
                      <span className="font-mono text-xs font-bold text-[#5B2378] tabular-nums">
                        {member.points} pts
                      </span>
                    </div>

                    {member.points >= 100 && (
                      <label className="flex items-center justify-between gap-2 pt-2 border-t border-[#5B2378]/15 cursor-pointer">
                        <span className="text-xs font-medium text-[#1C1523] flex items-center gap-1.5">
                          <Gift className="w-3.5 h-3.5 text-[#5B2378]" />
                          Redeem {Math.floor(member.points / 100) * 100} pts (-S$
                          {(Math.floor(member.points / 100)).toFixed(2)})
                        </span>
                        <input
                          type="checkbox"
                          checked={redeemPoints}
                          onChange={(e) => setRedeemPoints(e.target.checked)}
                          className="w-4 h-4 accent-[#5B2378]"
                        />
                      </label>
                    )}
                  </div>
                )}

                {/* Contact Info for Guest (or editable if guest) */}
                {(checkoutIdentityMode === 'guest' || member) && (
                  <div className="space-y-2.5">
                    {checkoutIdentityMode === 'guest' && (
                      <>
                        <p className="text-xs font-semibold text-[#1C1523]">Guest Contact Details</p>
                        <input
                          type="text"
                          value={contactName}
                          onChange={(e) => setContactName(e.target.value)}
                          placeholder="Full Name *"
                          className="w-full h-10 px-3 rounded-xl border border-[#1C1523]/12 text-xs focus:outline-none focus:border-[#5B2378]"
                        />
                        <div className="grid grid-cols-2 gap-2">
                          <input
                            type="tel"
                            value={contactPhone}
                            onChange={(e) => setContactPhone(e.target.value)}
                            placeholder="Mobile (+65...) *"
                            className="w-full h-10 px-3 rounded-xl border border-[#1C1523]/12 text-xs focus:outline-none focus:border-[#5B2378]"
                          />
                          <input
                            type="email"
                            value={contactEmail}
                            onChange={(e) => setContactEmail(e.target.value)}
                            placeholder="Email (receipt)"
                            className="w-full h-10 px-3 rounded-xl border border-[#1C1523]/12 text-xs focus:outline-none focus:border-[#5B2378]"
                          />
                        </div>
                      </>
                    )}

                    {/* Fulfillment specifics */}
                    {fulfillmentMode === 'pickup' ? (
                      <div className="pt-1">
                        <label className="block text-xs font-semibold text-[#1C1523] mb-1.5">
                          Pick-Up Window · Punggol Coast #01-12
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                          {['ASAP (~10 mins)', 'In 20 mins', 'In 30 mins', 'In 45 mins'].map((slot) => (
                            <button
                              key={slot}
                              type="button"
                              onClick={() => setPickupWindow(slot)}
                              className={`h-9 px-2.5 rounded-xl border text-xs font-medium cursor-pointer transition-colors ${
                                pickupWindow === slot
                                  ? 'border-[#5B2378] bg-[#5B2378]/8 text-[#5B2378] font-semibold'
                                  : 'border-[#1C1523]/10 text-[#665E6E]'
                              }`}
                            >
                              {slot}
                            </button>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="pt-1 space-y-2">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-semibold text-[#1C1523]">
                            Delivery Address (Singapore)
                          </label>
                          {member && member.savedAddresses.length > 0 && (
                            <button
                              type="button"
                              onClick={() => {
                                const addr = member.savedAddresses[0];
                                setStreet(addr.street);
                                setUnit(addr.unit);
                                setPostalCode(addr.postalCode);
                                setDropoffNote(addr.notes || '');
                              }}
                              className="text-[11px] font-semibold text-[#5B2378] hover:underline cursor-pointer"
                            >
                              Use Saved Address
                            </button>
                          )}
                        </div>
                        <input
                          type="text"
                          value={street}
                          onChange={(e) => setStreet(e.target.value)}
                          placeholder="Block & Street Name (e.g. 418A Northshore Dr) *"
                          className="w-full h-10 px-3 rounded-xl border border-[#1C1523]/12 text-xs focus:outline-none focus:border-[#5B2378]"
                        />
                        <div className="grid grid-cols-2 gap-2">
                          <input
                            type="text"
                            value={unit}
                            onChange={(e) => setUnit(e.target.value)}
                            placeholder="Unit (#08-124)"
                            className="w-full h-10 px-3 rounded-xl border border-[#1C1523]/12 text-xs focus:outline-none focus:border-[#5B2378]"
                          />
                          <input
                            type="text"
                            value={postalCode}
                            onChange={(e) => setPostalCode(e.target.value)}
                            placeholder="Postal Code (821418) *"
                            className="w-full h-10 px-3 rounded-xl border border-[#1C1523]/12 text-xs focus:outline-none focus:border-[#5B2378]"
                          />
                        </div>
                        <input
                          type="text"
                          value={dropoffNote}
                          onChange={(e) => setDropoffNote(e.target.value)}
                          placeholder="Rider instructions (e.g. Leave at door)"
                          className="w-full h-10 px-3 rounded-xl border border-[#1C1523]/12 text-xs focus:outline-none focus:border-[#5B2378]"
                        />
                      </div>
                    )}
                  </div>
                )}

                {formError && <p className="text-xs font-medium text-rose-600">{formError}</p>}
              </div>
            )}

            {step === 'payment' && (
              <div className="space-y-4">
                <div>
                  <p className="text-xs font-semibold text-[#1C1523] mb-2">
                    Select Qlub Express Payment Method
                  </p>
                  <div className="space-y-2">
                    {[
                      {
                        id: 'paynow' as const,
                        label: 'PayNow QR',
                        sub: 'Instant SG bank app scan · Zero fees',
                        icon: QrCode,
                      },
                      {
                        id: 'applepay' as const,
                        label: 'Apple Pay / Express Wallet',
                        sub: '1-tap biometric confirmation',
                        icon: Smartphone,
                      },
                      {
                        id: 'card' as const,
                        label: 'Credit or Debit Card',
                        sub: 'Visa / Mastercard / Amex',
                        icon: CreditCard,
                      },
                      {
                        id: 'grabpay' as const,
                        label: 'GrabPay Wallet',
                        sub: 'Pay directly via Grab balance',
                        icon: Wallet,
                      },
                    ].map((method) => {
                      const Icon = method.icon;
                      const selected = paymentMethod === method.id;
                      return (
                        <button
                          key={method.id}
                          type="button"
                          onClick={() => setPaymentMethod(method.id)}
                          className={`w-full min-h-[54px] px-3.5 py-2.5 rounded-xl border flex items-center justify-between gap-3 text-left transition-colors cursor-pointer ${
                            selected
                              ? 'border-[#5B2378] bg-[#5B2378]/5'
                              : 'border-[#1C1523]/10 hover:border-[#1C1523]/25'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-lg bg-[#F3EFEA] flex items-center justify-center text-[#5B2378]">
                              <Icon className="w-4 h-4" />
                            </div>
                            <div>
                              <p className="text-xs font-bold text-[#1C1523]">{method.label}</p>
                              <p className="text-[11px] text-[#665E6E]">{method.sub}</p>
                            </div>
                          </div>
                          <span
                            className={`w-5 h-5 rounded-full border flex items-center justify-center ${
                              selected
                                ? 'bg-[#5B2378] border-[#5B2378] text-white'
                                : 'border-[#1C1523]/25'
                            }`}
                          >
                            {selected && <Check className="w-3 h-3" />}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Order Recap */}
                <div className="rounded-xl bg-[#FAF9F7] border border-[#1C1523]/8 p-3.5 space-y-1.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-[#665E6E]">Ordering as</span>
                    <span className="font-semibold text-[#1C1523]">
                      {member && checkoutIdentityMode === 'member'
                        ? `${member.name} (Member)`
                        : `${contactName} (Guest)`}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#665E6E]">Fulfillment</span>
                    <span className="font-semibold text-[#1C1523]">
                      {fulfillmentMode === 'pickup'
                        ? `Pick-Up · ${pickupWindow}`
                        : `Delivery · ${postalCode}`}
                    </span>
                  </div>
                  {member && checkoutIdentityMode === 'member' && (
                    <div className="flex justify-between text-[#5B2378]">
                      <span>Summer Points to earn</span>
                      <span className="font-mono font-semibold tabular-nums">
                        +{Math.round(grandTotal * 10)} pts
                      </span>
                    </div>
                  )}
                </div>

                {submitError && <p className="text-xs font-medium text-rose-600">{submitError}</p>}
              </div>
            )}
          </div>

          {/* Sticky Summary & Action Footer */}
          <div className="p-4 border-t border-[#1C1523]/10 bg-white space-y-3 shrink-0">
            <div className="space-y-1 text-xs">
              <div className="flex justify-between text-[#665E6E]">
                <span>Subtotal ({totalCount} items)</span>
                <span className="font-mono tabular-nums">S${subtotal.toFixed(2)}</span>
              </div>
              {promoDiscount > 0 && (
                <div className="flex justify-between text-emerald-700">
                  <span>Promo ({appliedPromo})</span>
                  <span className="font-mono tabular-nums">-S${promoDiscount.toFixed(2)}</span>
                </div>
              )}
              {pointsDiscount > 0 && (
                <div className="flex justify-between text-[#5B2378]">
                  <span>Points Redeemed ({redeemablePoints} pts)</span>
                  <span className="font-mono tabular-nums">-S${pointsDiscount.toFixed(2)}</span>
                </div>
              )}
              {fulfillmentMode === 'delivery' && (
                <div className="flex justify-between text-[#665E6E]">
                  <span>Delivery Fee</span>
                  <span className="font-mono tabular-nums">
                    {deliveryFee === 0 ? 'FREE' : `S$${deliveryFee.toFixed(2)}`}
                  </span>
                </div>
              )}
              <div className="flex justify-between text-sm font-bold text-[#1C1523] pt-1.5 border-t border-[#1C1523]/8">
                <span>Total (incl. 9% GST)</span>
                <span className="font-mono tabular-nums">S${grandTotal.toFixed(2)}</span>
              </div>
            </div>

            {step === 'basket' && (
              <button
                type="button"
                onClick={() => setStep('identity')}
                className="w-full h-12 rounded-xl bg-[#1C1523] hover:bg-[#5B2378] text-white font-semibold text-sm flex items-center justify-between px-4 transition-colors cursor-pointer"
              >
                <span>Proceed to Checkout</span>
                <span className="font-mono tabular-nums">S${grandTotal.toFixed(2)}</span>
              </button>
            )}

            {step === 'identity' && (
              <button
                type="button"
                onClick={handleContinueToPayment}
                className="w-full h-12 rounded-xl bg-[#1C1523] hover:bg-[#5B2378] text-white font-semibold text-sm flex items-center justify-center transition-colors cursor-pointer"
              >
                Continue to Payment
              </button>
            )}

            {step === 'payment' && (
              <button
                type="button"
                disabled={placingOrder}
                onClick={handlePlaceOrder}
                className="w-full h-12 rounded-xl bg-[#5B2378] hover:bg-[#491B61] text-white font-semibold text-sm flex items-center justify-between px-4 transition-colors cursor-pointer disabled:opacity-60"
              >
                <span>{placingOrder ? 'Sending to Kitchen...' : 'Place Order Now'}</span>
                <span className="font-mono tabular-nums">S${grandTotal.toFixed(2)}</span>
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
