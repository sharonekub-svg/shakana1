import { create } from 'zustand';
import { Platform } from 'react-native';
import type { CartItem, GroupOrder, OrderStatus, Participant, Role, DemoUserId } from './types';
import { BRAND_META } from './products';

const KEY = 'shakana_demo_v2';
const CHANNEL = 'shakana_demo_channel';

const DEMO_USERS: Record<DemoUserId, { name: string; avatar: string }> = {
  A: { name: 'Sharone', avatar: '🧑‍💼' },
  B: { name: 'Maya',    avatar: '👩' },
  C: { name: 'Daniel',  avatar: '👨' },
};

type State = {
  role: Role;
  activeUser: DemoUserId;
  orders: Record<string, GroupOrder>;
  hydrated: boolean;
};

type Actions = {
  setRole: (r: Role) => void;
  setActiveUser: (u: DemoUserId) => void;
  createOrder: (brand: 'hm' | 'zara') => string;
  addItem: (orderId: string, item: Omit<CartItem, 'id' | 'addedAt' | 'userId'> & { userId?: DemoUserId }) => void;
  removeItem: (orderId: string, itemId: string) => void;
  togglePrivate: (orderId: string, itemId: string) => void;
  joinAs: (orderId: string, userId: DemoUserId) => void;
  setStatus: (orderId: string, status: OrderStatus) => void;
  resetDemo: () => void;
  _replace: (s: Pick<State, 'role' | 'activeUser' | 'orders'>) => void;
};

const initial: Pick<State, 'role' | 'activeUser' | 'orders'> = {
  role: null,
  activeUser: 'A',
  orders: {},
};

const isWeb = Platform.OS === 'web' && typeof window !== 'undefined';

let bc: BroadcastChannel | null = null;
let suppress = false;

function loadFromStorage(): Pick<State, 'role' | 'activeUser' | 'orders'> | null {
  if (!isWeb) return null;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return {
      role: parsed.role ?? null,
      activeUser: parsed.activeUser ?? 'A',
      orders: parsed.orders ?? {},
    };
  } catch {
    return null;
  }
}

function persist(s: Pick<State, 'role' | 'activeUser' | 'orders'>) {
  if (!isWeb || suppress) return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(s));
    bc?.postMessage({ type: 'state', payload: s });
  } catch {}
}

function shortCode() {
  return Math.floor(1000 + Math.random() * 9000).toString();
}

function uid(prefix = 'id') {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

export const useDemoStore = create<State & Actions>((set, get) => ({
  ...initial,
  hydrated: false,

  setRole: (role) => {
    set({ role });
    persist({ role, activeUser: get().activeUser, orders: get().orders });
  },

  setActiveUser: (activeUser) => {
    set({ activeUser });
    persist({ role: get().role, activeUser, orders: get().orders });
  },

  createOrder: (brand) => {
    const id = uid('order');
    const ownerId = get().activeUser;
    const meta = BRAND_META[brand];
    const order: GroupOrder = {
      id,
      brand,
      storeName: meta.name,
      ownerId,
      joinCode: shortCode(),
      createdAt: Date.now(),
      expiresAt: Date.now() + 15 * 60 * 1000,
      status: 'open',
      participants: [
        { id: ownerId, name: DEMO_USERS[ownerId].name, avatar: DEMO_USERS[ownerId].avatar, joinedAt: Date.now() },
      ],
      items: [],
      goal: meta.goal,
      individualDeliveryFee: meta.deliveryFee,
      totalDeliveryFee: meta.deliveryFee,
    };
    const orders = { ...get().orders, [id]: order };
    set({ orders });
    persist({ role: get().role, activeUser: get().activeUser, orders });
    return id;
  },

  addItem: (orderId, item) => {
    const order = get().orders[orderId];
    if (!order) return;
    const userId = item.userId ?? get().activeUser;
    const newItem: CartItem = {
      id: uid('item'),
      productId: item.productId,
      userId,
      size: item.size,
      color: item.color,
      qty: item.qty,
      isPrivate: item.isPrivate,
      addedAt: Date.now(),
    };
    const updated: GroupOrder = { ...order, items: [...order.items, newItem] };
    const orders = { ...get().orders, [orderId]: updated };
    set({ orders });
    persist({ role: get().role, activeUser: get().activeUser, orders });
  },

  removeItem: (orderId, itemId) => {
    const order = get().orders[orderId];
    if (!order) return;
    const updated: GroupOrder = { ...order, items: order.items.filter((i) => i.id !== itemId) };
    const orders = { ...get().orders, [orderId]: updated };
    set({ orders });
    persist({ role: get().role, activeUser: get().activeUser, orders });
  },

  togglePrivate: (orderId, itemId) => {
    const order = get().orders[orderId];
    if (!order) return;
    const updated: GroupOrder = {
      ...order,
      items: order.items.map((i) => (i.id === itemId ? { ...i, isPrivate: !i.isPrivate } : i)),
    };
    const orders = { ...get().orders, [orderId]: updated };
    set({ orders });
    persist({ role: get().role, activeUser: get().activeUser, orders });
  },

  joinAs: (orderId, userId) => {
    const order = get().orders[orderId];
    if (!order) return;
    if (order.participants.some((p) => p.id === userId)) return;
    const updated: GroupOrder = {
      ...order,
      participants: [
        ...order.participants,
        { id: userId, name: DEMO_USERS[userId].name, avatar: DEMO_USERS[userId].avatar, joinedAt: Date.now() },
      ],
    };
    const orders = { ...get().orders, [orderId]: updated };
    set({ orders });
    persist({ role: get().role, activeUser: get().activeUser, orders });
  },

  setStatus: (orderId, status) => {
    const order = get().orders[orderId];
    if (!order) return;
    const updated: GroupOrder = { ...order, status };
    const orders = { ...get().orders, [orderId]: updated };
    set({ orders });
    persist({ role: get().role, activeUser: get().activeUser, orders });
  },

  resetDemo: () => {
    set({ ...initial });
    persist(initial);
  },

  _replace: (s) => {
    suppress = true;
    set({ ...s });
    suppress = false;
  },
}));

export function hydrateDemoStore() {
  if (!isWeb) {
    useDemoStore.setState({ hydrated: true });
    return () => {};
  }
  const fromStore = loadFromStorage();
  if (fromStore) useDemoStore.getState()._replace(fromStore);
  useDemoStore.setState({ hydrated: true });

  const onStorage = (e: StorageEvent) => {
    if (e.key !== KEY || !e.newValue) return;
    try {
      const parsed = JSON.parse(e.newValue);
      useDemoStore.getState()._replace({
        role: parsed.role ?? null,
        activeUser: parsed.activeUser ?? 'A',
        orders: parsed.orders ?? {},
      });
    } catch {}
  };
  window.addEventListener('storage', onStorage);

  try {
    bc = new BroadcastChannel(CHANNEL);
    bc.onmessage = (ev) => {
      if (ev.data?.type === 'state') {
        useDemoStore.getState()._replace(ev.data.payload);
      }
    };
  } catch {
    bc = null;
  }

  return () => {
    window.removeEventListener('storage', onStorage);
    bc?.close();
    bc = null;
  };
}

// ===== Selectors / helpers =====

export function listOrders(orders: Record<string, GroupOrder>): GroupOrder[] {
  return Object.values(orders).sort((a, b) => b.createdAt - a.createdAt);
}

export function calcTotals(order: GroupOrder, productPrice: (id: string) => number) {
  const itemsTotal = order.items.reduce((sum, it) => sum + productPrice(it.productId) * it.qty, 0);
  const totalCount = order.items.reduce((s, it) => s + it.qty, 0);
  const participants = order.participants.length;
  const sharedDeliveryPerUser = participants > 0 ? order.totalDeliveryFee / participants : order.totalDeliveryFee;
  const personalSavings = Math.max(0, order.individualDeliveryFee - sharedDeliveryPerUser);
  const totalGroupSavings = order.individualDeliveryFee * participants - order.totalDeliveryFee;
  const goalProgress = order.goal > 0 ? Math.min(1, itemsTotal / order.goal) : 0;
  const remainingToGoal = Math.max(0, order.goal - itemsTotal);
  return {
    itemsTotal,
    totalCount,
    sharedDeliveryPerUser,
    personalSavings,
    totalGroupSavings: Math.max(0, totalGroupSavings),
    goalProgress,
    remainingToGoal,
    grandTotal: itemsTotal + order.totalDeliveryFee,
  };
}

export const DEMO_USER_META = DEMO_USERS;
