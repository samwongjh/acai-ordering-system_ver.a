import type {
  CartItem,
  CustomerCheckoutInfo,
  FulfillmentMode,
  MemberAccount,
  Order,
  OrderStatusStage,
  OrderTimelineStep,
  PaymentMethod,
} from '../types.ts';
import {
  member as ptMember,
  signIn as ptSignIn,
  signOut as ptSignOut,
  signUp as ptSignUp,
} from '../pt.ts';

interface StoredMember extends MemberAccount {
  password: string;
}

interface LocalStoreData {
  members: StoredMember[];
  activeMemberId: string | null;
  orders: Order[];
  nextQueueSeq: number;
}

const STORE_KEY = 'bellybelly_local_store_v1';

function formatSgTime(date: Date): string {
  return date.toLocaleTimeString('en-SG', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: 'Asia/Singapore',
  });
}

function addMinutesLabel(baseDate: Date, mins: number): string {
  return formatSgTime(new Date(baseDate.getTime() + mins * 60_000));
}

export function computeBellyTier(points: number): MemberAccount['tier'] {
  if (points >= 1000) return 'Belly Legend';
  if (points >= 400) return 'Belly Warrior';
  return 'Belly Recruit';
}

function sanitizeMember(m: StoredMember): MemberAccount {
  const { password: _ignored, ...safe } = m;
  return {
    ...safe,
    tier: computeBellyTier(safe.points),
  };
}

function createInitialTimeline(mode: FulfillmentMode, nowStr: string): OrderTimelineStep[] {
  if (mode === 'pickup') {
    return [
      {
        stage: 'confirmed',
        title: 'Order Confirmed',
        subtitle: 'Sent to BellyBelly Good kitchen',
        timestamp: nowStr,
        completed: true,
        active: false,
      },
      {
        stage: 'preparing',
        title: 'Blending Your Açaí',
        subtitle: 'Scooping fresh organic sorbet & prepping toppings',
        timestamp: null,
        completed: false,
        active: true,
      },
      {
        stage: 'packing',
        title: 'Quality & Toppings Check',
        subtitle: 'Drizzling sauces & sealing chilled cup',
        timestamp: null,
        completed: false,
        active: false,
      },
      {
        stage: 'ready_or_enroute',
        title: 'Ready at Pick-Up Counter',
        subtitle: 'Show your queue code at #01-01 express counter',
        timestamp: null,
        completed: false,
        active: false,
      },
      {
        stage: 'completed',
        title: 'Order Collected',
        subtitle: 'Enjoy your BellyBelly Good bowl',
        timestamp: null,
        completed: false,
        active: false,
      },
    ];
  }

  return [
    {
      stage: 'confirmed',
      title: 'Order Confirmed',
      subtitle: 'Accepted by BellyBelly Good Kitchen',
      timestamp: nowStr,
      completed: true,
      active: false,
    },
    {
      stage: 'preparing',
      title: 'Blending Your Açaí',
      subtitle: 'Fresh fruit slicing & sorbet scooping',
      timestamp: null,
      completed: false,
      active: true,
    },
    {
      stage: 'packing',
      title: 'Insulated Packing',
      subtitle: 'Chilled thermal bag & tamper-seal applied',
      timestamp: null,
      completed: false,
      active: false,
    },
    {
      stage: 'ready_or_enroute',
      title: 'Rider En Route',
      subtitle: 'Courier heading from 28 Keong Saik Rd toward your block',
      timestamp: null,
      completed: false,
      active: false,
    },
    {
      stage: 'completed',
      title: 'Delivered',
      subtitle: 'Dropped off safely at your address',
      timestamp: null,
      completed: false,
      active: false,
    },
  ];
}

function createSeedData(): LocalStoreData {
  const demoMemberId = 'mem_tessa_01';
  const pastOrderDate = new Date(Date.now() - 86_400_000 * 2);
  const pastTimeStr = formatSgTime(pastOrderDate);

  const samplePastOrder: Order = {
    id: 'ORD-8421',
    queueNumber: 'A-391',
    fulfillmentMode: 'pickup',
    outletName: 'BellyBelly Good',
    outletAddress: '28 Keong Saik Road, #01-01, Singapore 089135',
    items: [
      {
        cartItemId: 'seed_item_1',
        menuItemId: 'basic-bitch',
        name: 'Basic Bitch (Classic)',
        image: '/src/assets/images/bowl_basic_classic_1795157413194.jpg',
        unitBasePrice: 10.5,
        selectedModifiers: [
          {
            groupId: 'size',
            groupTitle: 'Bowl Size',
            optionId: 'regular',
            optionName: 'Regular (12oz)',
            priceDelta: 0,
          },
          {
            groupId: 'drizzle',
            groupTitle: 'Complimentary Drizzle Sauce',
            optionId: 'cookie-butter',
            optionName: 'Speculoos Cookie Butter',
            priceDelta: 0,
          },
        ],
        specialInstructions: '',
        quantity: 1,
        lineTotal: 10.5,
      },
      {
        cartItemId: 'seed_item_2',
        menuItemId: 'thirst-strawberry-matcha',
        name: 'Ice Strawberry Matcha',
        image: '/src/assets/images/drink_strawberry_matcha_1795157412857.jpg',
        unitBasePrice: 8.5,
        selectedModifiers: [
          {
            groupId: 'milk',
            groupTitle: 'Milk Selection',
            optionId: 'oatside',
            optionName: 'Oatside Barista Oat Milk',
            priceDelta: 1.0,
          },
          {
            groupId: 'ice-level',
            groupTitle: 'Ice & Sweetness',
            optionId: 'less-ice',
            optionName: 'Less Ice · Less Sweet',
            priceDelta: 0,
          },
        ],
        specialInstructions: '',
        quantity: 1,
        lineTotal: 9.5,
      },
    ],
    customer: {
      isGuest: false,
      memberId: demoMemberId,
      name: 'Tessa Tan',
      phone: '+65 9123 4567',
      email: 'tessa.tan@bellytribe.sg',
      pickupWindow: 'ASAP',
    },
    paymentMethod: 'paynow',
    utensilsIncluded: true,
    promoCode: null,
    pointsRedeemed: 0,
    pointsEarned: 200,
    subtotal: 20.0,
    promoDiscount: 0,
    pointsDiscount: 0,
    deliveryFee: 0,
    total: 20.0,
    status: 'completed',
    etaMinutes: 0,
    estimatedTimeLabel: 'Collected',
    timeline: createInitialTimeline('pickup', pastTimeStr).map((step) => ({
      ...step,
      completed: true,
      active: false,
      timestamp: pastTimeStr,
    })),
    createdAt: pastOrderDate.toISOString(),
    updatedAt: pastOrderDate.toISOString(),
  };

  return {
    members: [
      {
        id: demoMemberId,
        name: 'Tessa Tan',
        email: 'tessa.tan@bellytribe.sg',
        phone: '+65 9123 4567',
        password: 'belly123',
        points: 420,
        tier: 'Belly Warrior',
        savedAddresses: [
          {
            id: 'addr_1',
            label: 'Home · Everton Park',
            street: '12 Everton Park',
            unit: '#08-14',
            postalCode: '080012',
            notes: 'Leave on shoe rack by the door',
          },
          {
            id: 'addr_2',
            label: 'Office · Tanjong Pagar',
            street: '10 Anson Road, International Plaza',
            unit: 'Level 14 Lobby',
            postalCode: '079903',
            notes: 'Call upon arrival at drop-off bay',
          },
        ],
        joinedAt: new Date(Date.now() - 86_400_000 * 90).toISOString(),
      },
    ],
    activeMemberId: null,
    orders: [samplePastOrder],
    nextQueueSeq: 405,
  };
}

function loadStore(): LocalStoreData {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as LocalStoreData;
      if (parsed && Array.isArray(parsed.members) && Array.isArray(parsed.orders)) {
        return parsed;
      }
    }
  } catch {
    // Ignore storage read errors
  }
  const seeded = createSeedData();
  saveStore(seeded);
  return seeded;
}

function saveStore(data: LocalStoreData): void {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(data));
  } catch {
    // Ignore storage quota errors
  }
}

export function restoreActiveMember(): MemberAccount | null {
  const store = loadStore();
  if (store.activeMemberId) {
    const found = store.members.find((m) => m.id === store.activeMemberId);
    if (found) return sanitizeMember(found);
  }
  const sbUser = ptMember();
  if (sbUser) {
    const found = store.members.find((m) => m.email.toLowerCase() === sbUser.email.toLowerCase());
    if (found) {
      store.activeMemberId = found.id;
      saveStore(store);
      return sanitizeMember(found);
    }
  }
  return null;
}

export async function loginMember(params: {
  identifier?: string;
  password?: string;
  demo?: boolean;
}): Promise<{ member: MemberAccount; token: string }> {
  const store = loadStore();

  if (params.demo) {
    const demoMember = store.members[0];
    store.activeMemberId = demoMember.id;
    saveStore(store);
    return { member: sanitizeMember(demoMember), token: `local_${demoMember.id}` };
  }

  const cleanId = (params.identifier || '').trim().toLowerCase();
  const password = params.password || '';
  if (!cleanId || !password) {
    throw new Error('Please enter your email/phone and password.');
  }

  // Try Supabase Auth when signing in with an email
  if (cleanId.includes('@')) {
    try {
      const sbUser = await ptSignIn(cleanId, password);
      let existing = store.members.find(
        (m) => m.id === sbUser.id || m.email.toLowerCase() === cleanId
      );
      if (!existing) {
        existing = {
          id: sbUser.id,
          name: cleanId.split('@')[0],
          email: sbUser.email,
          phone: '+65 9000 0000',
          password,
          points: 150,
          tier: 'Belly Recruit',
          savedAddresses: [],
          joinedAt: new Date().toISOString(),
        };
        store.members.push(existing);
      }
      store.activeMemberId = existing.id;
      saveStore(store);
      return { member: sanitizeMember(existing), token: `sb_${sbUser.id}` };
    } catch (err) {
      // Fall back to local member check if offline or local-only account
      const localFound = store.members.find(
        (m) => m.email.toLowerCase() === cleanId && m.password === password
      );
      if (localFound) {
        store.activeMemberId = localFound.id;
        saveStore(store);
        return { member: sanitizeMember(localFound), token: `local_${localFound.id}` };
      }
      throw new Error(
        err instanceof Error
          ? err.message
          : 'Invalid Belly Tribe credentials. Try Demo Member or check password.'
      );
    }
  }

  const normalizedDigits = cleanId.replace(/\D/g, '');
  const found = store.members.find((m) => {
    const phoneDigits = m.phone.replace(/\D/g, '');
    return (
      normalizedDigits.length >= 8 &&
      (phoneDigits === normalizedDigits || phoneDigits.endsWith(normalizedDigits)) &&
      m.password === password
    );
  });

  if (!found) {
    throw new Error('Invalid Belly Tribe credentials. Try Demo Member or check password.');
  }

  store.activeMemberId = found.id;
  saveStore(store);
  return { member: sanitizeMember(found), token: `local_${found.id}` };
}

export async function registerMember(params: {
  name: string;
  email: string;
  phone: string;
  password: string;
}): Promise<{ member: MemberAccount; token: string }> {
  const cleanName = params.name.trim();
  const cleanEmail = params.email.trim().toLowerCase();
  const cleanPhone = params.phone.trim();
  const password = params.password;

  if (!cleanName || !cleanEmail || !cleanPhone || !password || password.length < 6) {
    throw new Error('Name, email, mobile number, and password (min 6 chars) are required.');
  }

  const store = loadStore();
  if (store.members.some((m) => m.email.toLowerCase() === cleanEmail)) {
    throw new Error('An account with this email already exists.');
  }

  let memberId = `mem_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
  try {
    const sbUser = await ptSignUp(cleanEmail, password);
    memberId = sbUser.id;
  } catch (err) {
    // Allow local fallback only if network fails; surface explicit validation/auth errors
    if (err instanceof Error && !err.message.toLowerCase().includes('fetch')) {
      throw err;
    }
  }

  const newMember: StoredMember = {
    id: memberId,
    name: cleanName,
    email: cleanEmail,
    phone: cleanPhone.startsWith('+') ? cleanPhone : `+65 ${cleanPhone}`,
    password,
    points: 150,
    tier: 'Belly Recruit',
    savedAddresses: [],
    joinedAt: new Date().toISOString(),
  };

  store.members.push(newMember);
  store.activeMemberId = newMember.id;
  saveStore(store);

  return { member: sanitizeMember(newMember), token: `sb_${newMember.id}` };
}

export function logoutMember(): void {
  ptSignOut();
  const store = loadStore();
  store.activeMemberId = null;
  saveStore(store);
}

export function getMemberOrderHistory(memberId: string): Order[] {
  const store = loadStore();
  return store.orders
    .filter((o) => o.customer.memberId === memberId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export function getOrderById(orderId: string): Order | null {
  const store = loadStore();
  return store.orders.find((o) => o.id === orderId) || null;
}

export function lookupOrder(query: string): Order | null {
  const q = query.trim().toUpperCase().replace(/^#/, '');
  if (!q) return null;
  const store = loadStore();
  return (
    store.orders.find(
      (o) =>
        o.id.toUpperCase() === q ||
        o.queueNumber.toUpperCase() === q ||
        o.queueNumber.toUpperCase() === `A-${q}`
    ) || null
  );
}

export function createOrder(input: {
  fulfillmentMode: FulfillmentMode;
  items: CartItem[];
  customer: CustomerCheckoutInfo;
  paymentMethod: PaymentMethod;
  utensilsIncluded: boolean;
  promoCode?: string | null;
  redeemPoints?: boolean;
}): { order: Order; updatedMember: MemberAccount | null } {
  if (!Array.isArray(input.items) || input.items.length === 0) {
    throw new Error('Your cart is empty.');
  }
  if (!input.customer?.name?.trim() || !input.customer?.phone?.trim()) {
    throw new Error('Contact name and mobile number are required.');
  }
  if (
    input.fulfillmentMode === 'delivery' &&
    (!input.customer.deliveryAddress?.street?.trim() ||
      !input.customer.deliveryAddress?.postalCode?.trim())
  ) {
    throw new Error('Delivery street address and postal code are required.');
  }

  const store = loadStore();
  const activeMember = input.customer.memberId
    ? store.members.find((m) => m.id === input.customer.memberId) || null
    : null;

  const subtotal = Number(input.items.reduce((acc, item) => acc + item.lineTotal, 0).toFixed(2));
  const normalizedPromo = (input.promoCode || '').trim().toUpperCase() || null;
  let promoDiscount = 0;
  if (normalizedPromo === 'BELLY10') {
    promoDiscount = Number((subtotal * 0.1).toFixed(2));
  } else if (normalizedPromo === 'BELLY5' && subtotal >= 25) {
    promoDiscount = 5.0;
  }

  let pointsRedeemed = 0;
  let pointsDiscount = 0;
  if (activeMember && input.redeemPoints && activeMember.points >= 100) {
    const maxRedeemableHundreds = Math.floor(activeMember.points / 100) * 100;
    const maxAffordableDiscount = Math.max(0, subtotal - promoDiscount);
    const maxNeededPoints = Math.floor(maxAffordableDiscount) * 100;
    pointsRedeemed = Math.min(maxRedeemableHundreds, maxNeededPoints);
    pointsDiscount = Number((pointsRedeemed / 100).toFixed(2));
  }

  const activeTier = activeMember ? computeBellyTier(activeMember.points) : null;
  const deliveryFee =
    input.fulfillmentMode === 'delivery'
      ? activeTier === 'Belly Legend' || subtotal >= 35
        ? 0
        : 3.5
      : 0;

  const total = Number(
    Math.max(0, subtotal - promoDiscount - pointsDiscount + deliveryFee).toFixed(2)
  );
  const pointsMultiplier =
    activeTier === 'Belly Legend' ? 15 : activeTier === 'Belly Warrior' ? 12.5 : 10;
  const pointsEarned = activeMember ? Math.round(total * pointsMultiplier) : 0;

  if (activeMember) {
    activeMember.points = Math.max(0, activeMember.points - pointsRedeemed + pointsEarned);
    activeMember.tier = computeBellyTier(activeMember.points);

    if (
      input.fulfillmentMode === 'delivery' &&
      input.customer.deliveryAddress?.street &&
      !activeMember.savedAddresses.some(
        (a) => a.postalCode === input.customer.deliveryAddress?.postalCode
      )
    ) {
      activeMember.savedAddresses.unshift({
        id: `addr_${Date.now()}`,
        label: 'Recent Delivery',
        street: input.customer.deliveryAddress.street,
        unit: input.customer.deliveryAddress.unit || '',
        postalCode: input.customer.deliveryAddress.postalCode,
        notes: input.customer.deliveryAddress.dropoffNote || '',
      });
    }
  }

  const now = new Date();
  const nowStr = formatSgTime(now);
  const seq = store.nextQueueSeq++;
  const orderId = `ORD-${Math.floor(1000 + Math.random() * 8999)}`;
  const queueNumber = `A-${seq}`;
  const initialEta = input.fulfillmentMode === 'pickup' ? 10 : 28;

  const newOrder: Order = {
    id: orderId,
    queueNumber,
    fulfillmentMode: input.fulfillmentMode,
    outletName: 'BellyBelly Good',
    outletAddress: '28 Keong Saik Road, #01-01, Singapore 089135',
    items: input.items,
    customer: input.customer,
    paymentMethod: input.paymentMethod,
    utensilsIncluded: input.utensilsIncluded,
    promoCode: normalizedPromo,
    pointsRedeemed,
    pointsEarned,
    subtotal,
    promoDiscount,
    pointsDiscount,
    deliveryFee,
    total,
    status: 'preparing',
    etaMinutes: initialEta,
    estimatedTimeLabel:
      input.fulfillmentMode === 'pickup'
        ? `Est. ready ${addMinutesLabel(now, initialEta)}`
        : `Est. arrival ${addMinutesLabel(now, initialEta)}`,
    deliveryProgressPct: input.fulfillmentMode === 'delivery' ? 18 : undefined,
    timeline: createInitialTimeline(input.fulfillmentMode, nowStr),
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  };

  store.orders.unshift(newOrder);
  saveStore(store);

  return {
    order: newOrder,
    updatedMember: activeMember ? sanitizeMember(activeMember) : null,
  };
}

const STAGE_ORDER: OrderStatusStage[] = [
  'confirmed',
  'preparing',
  'packing',
  'ready_or_enroute',
  'completed',
];

export function advanceOrderStage(orderId: string): Order | null {
  const store = loadStore();
  const order = store.orders.find((o) => o.id === orderId);
  if (!order) return null;

  let nextStage: OrderStatusStage | null = null;
  if (order.status === 'confirmed') nextStage = 'preparing';
  else if (order.status === 'preparing') nextStage = 'packing';
  else if (order.status === 'packing') nextStage = 'ready_or_enroute';
  else if (order.status === 'ready_or_enroute') nextStage = 'completed';

  if (!nextStage) return order;

  const now = new Date();
  const nowStr = formatSgTime(now);
  order.status = nextStage;
  order.updatedAt = now.toISOString();

  const nextIdx = STAGE_ORDER.indexOf(nextStage);
  order.timeline = order.timeline.map((step, idx) => {
    if (idx < nextIdx) {
      return {
        ...step,
        completed: true,
        active: false,
        timestamp: step.timestamp || nowStr,
      };
    }
    if (idx === nextIdx) {
      const isTerminal = nextStage === 'completed';
      return {
        ...step,
        completed: isTerminal,
        active: !isTerminal,
        timestamp: nowStr,
      };
    }
    return {
      ...step,
      completed: false,
      active: false,
    };
  });

  if (order.fulfillmentMode === 'pickup') {
    if (nextStage === 'preparing') {
      order.etaMinutes = 8;
      order.estimatedTimeLabel = `Est. ready ${addMinutesLabel(now, 8)}`;
    } else if (nextStage === 'packing') {
      order.etaMinutes = 3;
      order.estimatedTimeLabel = `Est. ready ${addMinutesLabel(now, 3)}`;
    } else if (nextStage === 'ready_or_enroute') {
      order.etaMinutes = 0;
      order.estimatedTimeLabel = 'Ready for Pick-Up Now';
    } else if (nextStage === 'completed') {
      order.etaMinutes = 0;
      order.estimatedTimeLabel = `Collected at ${nowStr}`;
    }
  } else {
    if (nextStage === 'preparing') {
      order.etaMinutes = 24;
      order.deliveryProgressPct = 20;
      order.estimatedTimeLabel = `Est. arrival ${addMinutesLabel(now, 24)}`;
    } else if (nextStage === 'packing') {
      order.etaMinutes = 16;
      order.deliveryProgressPct = 42;
      order.estimatedTimeLabel = `Est. arrival ${addMinutesLabel(now, 16)}`;
    } else if (nextStage === 'ready_or_enroute') {
      order.etaMinutes = 8;
      order.deliveryProgressPct = 74;
      order.riderName = order.riderName || 'Marcus Lim';
      order.riderPlate = order.riderPlate || 'E-Bike · SG-P42';
      order.estimatedTimeLabel = `Arriving around ${addMinutesLabel(now, 8)}`;
    } else if (nextStage === 'completed') {
      order.etaMinutes = 0;
      order.deliveryProgressPct = 100;
      order.estimatedTimeLabel = `Delivered at ${nowStr}`;
    }
  }

  saveStore(store);
  return { ...order };
}
