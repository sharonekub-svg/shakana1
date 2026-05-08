import { create } from 'zustand';
import {
  DELIVERY_FEE,
  FREE_SHIPPING_GOAL,
  type DemoBrandId,
  type DemoProduct,
  demoStores,
  findProduct,
  productsForBrand,
} from '@/demo/catalog';

export type DemoRole = 'user' | 'store' | null;
export type OrderStatus = 'collecting' | 'accepted' | 'packing' | 'ready' | 'shipped';

export type DemoParticipant = {
  id: string;
  name: string;
  joinedAt: number;
};

export type DemoOrderItem = {
  id: string;
  productId: string;
  participantId: string;
  size: string;
  color: string;
  quantity: number;
  private: boolean;
  addedAt: number;
};

export type DemoOrder = {
  id: string;
  brand: DemoBrandId;
  status: OrderStatus;
  inviteCode: string;
  inviteLink: string;
  createdBy: string;
  createdAt: number;
  closesAt: number;
  deliveryAddress: string;
  participants: DemoParticipant[];
  items: DemoOrderItem[];
  lastEvent: string;
};

export type DemoPulse = {
  id: number;
  kind: 'join' | 'item' | 'status' | 'goal';
  message: string;
};

type DemoState = {
  demoRole: DemoRole;
  demoMode: boolean;
  selectedBrand: DemoBrandId | null;
  activeParticipantId: string;
  orders: DemoOrder[];
  lastNotice: string | null;
  lastPulse: DemoPulse | null;
  setDemoRole: (role: DemoRole) => void;
  setDemoMode: (enabled: boolean) => void;
  selectBrand: (brand: DemoBrandId | null) => void;
  setActiveParticipant: (participantId: string) => void;
  ensureOrder: (brand: DemoBrandId, creator?: DemoParticipant, timerMinutes?: number) => string;
  createNewOrder: (brand: DemoBrandId, creator?: DemoParticipant, timerMinutes?: number) => string;
  claimOrderFounder: (orderId: string, participant: DemoParticipant) => void;
  joinParticipant: (orderId: string, participant: DemoParticipant | string) => void;
  addItem: (orderId: string, input: AddItemInput) => void;
  updateTimer: (orderId: string, minutes: number) => void;
  updateDeliveryAddress: (orderId: string, deliveryAddress: string) => void;
  updateStatus: (orderId: string, status: OrderStatus) => void;
  restoreSharedOrder: (order: unknown) => void;
  resetDemo: () => void;
};

type PersistedDemoState = Pick<
  DemoState,
  'demoRole' | 'demoMode' | 'selectedBrand' | 'activeParticipantId' | 'orders' | 'lastNotice'
  | 'lastPulse'
>;

type AddItemInput = {
  productId: string;
  participantId: string;
  participant?: DemoParticipant;
  size: string;
  color: string;
  quantity: number;
  private: boolean;
};

export const demoParticipants: DemoParticipant[] = [
  { id: 'user-a', name: 'Sharone', joinedAt: 0 },
  { id: 'user-b', name: 'User B', joinedAt: 0 },
  { id: 'user-c', name: 'User C', joinedAt: 0 },
];

export const primaryDemoParticipant: DemoParticipant = demoParticipants[0] ?? {
  id: 'user-a',
  name: 'Sharone',
  joinedAt: 0,
};

const STORAGE_KEY = 'shakana-investor-demo-v1';
const CHANNEL_NAME = 'shakana-investor-demo-sync';
const DEMO_ORIGIN = 'https://shakana1.vercel.app';

let channel: BroadcastChannel | null = null;
let applyingRemote = false;
let syncInitialized = false;
let persistTimer: ReturnType<typeof globalThis.setTimeout> | null = null;
let remoteSyncTimer: ReturnType<typeof globalThis.setTimeout> | null = null;
let remotePollTimer: ReturnType<typeof globalThis.setInterval> | null = null;
let pendingPayload: PersistedDemoState | null = null;

const canUseWindow = () => typeof window !== 'undefined';
const now = () => Date.now();

function getParticipantName(participantId: string, order?: DemoOrder) {
  return (
    order?.participants.find((participant) => participant.id === participantId)?.name ??
    demoParticipants.find((participant) => participant.id === participantId)?.name ??
    'Guest'
  );
}

function normalizeOrderTimerMinutes(minutes?: number) {
  if (!minutes || !Number.isFinite(minutes)) return 30;
  return Math.max(1, Math.min(720, Math.round(minutes)));
}

function createOrder(brand: DemoBrandId, creator = primaryDemoParticipant, timerMinutes?: number): DemoOrder {
  const id = `SK-${Math.floor(1000 + Math.random() * 9000)}`;
  const inviteCode = String(Math.floor(1000 + Math.random() * 9000));
  const createdAt = now();
  const safeTimerMinutes = normalizeOrderTimerMinutes(timerMinutes);
  return {
    id,
    brand,
    status: 'collecting',
    inviteCode,
    inviteLink: `${DEMO_ORIGIN}/join/${inviteCode}`,
    createdBy: creator.id,
    createdAt,
    closesAt: createdAt + safeTimerMinutes * 60 * 1000,
    deliveryAddress: '',
    participants: [{ ...creator, joinedAt: createdAt }],
    items: [],
    lastEvent: `${demoStores[brand].name} group order created with a ${safeTimerMinutes} minute timer`,
  };
}

function defaultState(): PersistedDemoState {
  return {
    demoRole: null,
    demoMode: false,
    selectedBrand: null,
    activeParticipantId: 'user-a',
    orders: [],
    lastNotice: null,
    lastPulse: null,
  };
}

function orderVersion(order: DemoOrder) {
  return Math.max(
    order.createdAt,
    order.closesAt,
    ...order.participants.map((participant) => participant.joinedAt),
    ...order.items.map((item) => item.addedAt),
  );
}

function mergeOrder(localOrder: DemoOrder | undefined, remoteOrder: DemoOrder): DemoOrder {
  if (!localOrder) return remoteOrder;
  const participants = [
    ...localOrder.participants,
    ...remoteOrder.participants.filter(
      (remoteParticipant) => !localOrder.participants.some((localParticipant) => localParticipant.id === remoteParticipant.id),
    ),
  ];
  const items = [
    ...localOrder.items,
    ...remoteOrder.items.filter((remoteItem) => !localOrder.items.some((localItem) => localItem.id === remoteItem.id)),
  ].sort((a, b) => b.addedAt - a.addedAt);
  const remoteIsNewer = orderVersion(remoteOrder) >= orderVersion(localOrder);
  return {
    ...localOrder,
    ...remoteOrder,
    participants,
    items,
    status: remoteIsNewer ? remoteOrder.status : localOrder.status,
    deliveryAddress: remoteOrder.deliveryAddress || localOrder.deliveryAddress,
    lastEvent: remoteIsNewer ? remoteOrder.lastEvent : localOrder.lastEvent,
  };
}

function mergeRemoteOrders(state: DemoState, remoteOrders: DemoOrder[]): PersistedDemoState {
  const sanitizedRemote = sanitizeState({ orders: remoteOrders }).orders;
  if (sanitizedRemote.length === 0) return persistedFromState(state);
  const localByCode = new Map(state.orders.map((order) => [order.inviteCode, order]));
  const mergedRemote = sanitizedRemote.map((remoteOrder) => mergeOrder(localByCode.get(remoteOrder.inviteCode), remoteOrder));
  const remoteCodes = new Set(mergedRemote.map((order) => order.inviteCode));
  return {
    ...persistedFromState(state),
    selectedBrand: state.selectedBrand,
    orders: [
      ...mergedRemote,
      ...state.orders.filter((order) => !remoteCodes.has(order.inviteCode)),
    ],
  };
}

function scheduleRemoteSync(orders: DemoOrder[]) {
  if (!canUseWindow() || orders.length === 0) return;
  if (remoteSyncTimer) globalThis.clearTimeout(remoteSyncTimer);
  remoteSyncTimer = globalThis.setTimeout(() => {
    remoteSyncTimer = null;
    window.fetch('/api/demo-order-sync', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ orders }),
    }).catch(() => {});
  }, 220);
}

function encodeOrderForUrl(order: DemoOrder): string {
  return encodeURIComponent(JSON.stringify({ v: 1, order }));
}

export function buildSharedDemoInviteLink(order: DemoOrder): string {
  return `${DEMO_ORIGIN}/join/${encodeURIComponent(order.inviteCode)}`;
}

export function readSharedDemoOrderSnapshot(value: string | string[] | undefined): DemoOrder | null {
  const raw = Array.isArray(value) ? value[0] : value;
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    const sanitized = sanitizeState({ orders: [parsed?.order] });
    return sanitized.orders[0] ?? null;
  } catch {
    try {
      const parsed = JSON.parse(decodeURIComponent(raw));
      const sanitized = sanitizeState({ orders: [parsed?.order] });
      return sanitized.orders[0] ?? null;
    } catch {
      return null;
    }
  }
}

function sanitizeState(value: unknown): PersistedDemoState {
  const fallback = defaultState();
  if (!value || typeof value !== 'object') return fallback;
  const incoming = value as Partial<PersistedDemoState>;
  const orders = Array.isArray(incoming.orders)
    ? incoming.orders.flatMap((order) => {
        if (!order || typeof order !== 'object') return [];
        const incomingOrder = order as Partial<DemoOrder>;
        const brand =
          incomingOrder.brand === 'hm' ||
          incomingOrder.brand === 'zara' ||
          incomingOrder.brand === 'amazon'
            ? incomingOrder.brand
            : null;
        if (!brand || typeof incomingOrder.id !== 'string') return [];

        const normalizedStatus = String(incomingOrder.status ?? 'collecting').toLowerCase();
        const status = ['collecting', 'accepted', 'packing', 'ready', 'shipped'].includes(normalizedStatus)
          ? (normalizedStatus as OrderStatus)
          : 'collecting';
        const createdAt =
          typeof incomingOrder.createdAt === 'number' && Number.isFinite(incomingOrder.createdAt)
            ? incomingOrder.createdAt
            : now();
        const closesAt =
          typeof incomingOrder.closesAt === 'number' && Number.isFinite(incomingOrder.closesAt)
            ? incomingOrder.closesAt
            : createdAt + 30 * 60 * 1000;
        const participants = Array.isArray(incomingOrder.participants)
          ? incomingOrder.participants.flatMap((participant) => {
              if (!participant || typeof participant !== 'object') return [];
              const candidate = participant as Partial<DemoParticipant>;
              if (typeof candidate.id !== 'string') return [];
              return [{
                id: candidate.id,
                name: typeof candidate.name === 'string' && candidate.name.trim() ? candidate.name : 'Member',
                joinedAt:
                  typeof candidate.joinedAt === 'number' && Number.isFinite(candidate.joinedAt)
                    ? candidate.joinedAt
                    : createdAt,
              }];
            })
          : [];
        const safeParticipants = participants.length > 0 ? participants : [{ ...primaryDemoParticipant, joinedAt: createdAt }];
        const participantIds = new Set(safeParticipants.map((participant) => participant.id));
        const items = Array.isArray(incomingOrder.items)
          ? incomingOrder.items.flatMap((item) => {
              if (!item || typeof item !== 'object') return [];
              const candidate = item as Partial<DemoOrderItem>;
              if (
                typeof candidate.id !== 'string' ||
                typeof candidate.productId !== 'string' ||
                typeof candidate.participantId !== 'string' ||
                !findProduct(candidate.productId)
              ) {
                return [];
              }
              return [{
                id: candidate.id,
                productId: candidate.productId,
                participantId: participantIds.has(candidate.participantId)
                  ? candidate.participantId
                  : safeParticipants[0]?.id ?? primaryDemoParticipant.id,
                size: typeof candidate.size === 'string' ? candidate.size : '',
                color: typeof candidate.color === 'string' ? candidate.color : '',
                quantity:
                  typeof candidate.quantity === 'number' && Number.isFinite(candidate.quantity)
                    ? Math.max(1, Math.round(candidate.quantity))
                    : 1,
                private: candidate.private === true,
                addedAt:
                  typeof candidate.addedAt === 'number' && Number.isFinite(candidate.addedAt)
                    ? candidate.addedAt
                    : createdAt,
              }];
            })
          : [];

        return [{
          id: incomingOrder.id,
          brand,
          status,
          inviteCode:
            typeof incomingOrder.inviteCode === 'string' && /^\d{4}$/.test(incomingOrder.inviteCode)
              ? incomingOrder.inviteCode
              : String(Math.floor(1000 + Math.random() * 9000)),
          inviteLink:
            typeof incomingOrder.inviteLink === 'string' && incomingOrder.inviteLink
              ? incomingOrder.inviteLink
              : `${DEMO_ORIGIN}/join/${incomingOrder.inviteCode ?? ''}`,
          createdBy:
            typeof incomingOrder.createdBy === 'string' && incomingOrder.createdBy
              ? incomingOrder.createdBy
              : safeParticipants[0]?.id ?? primaryDemoParticipant.id,
          createdAt,
          closesAt,
          deliveryAddress:
            typeof incomingOrder.deliveryAddress === 'string' ? incomingOrder.deliveryAddress : '',
          participants: safeParticipants,
          items,
          lastEvent:
            typeof incomingOrder.lastEvent === 'string' && incomingOrder.lastEvent
              ? incomingOrder.lastEvent
              : `${demoStores[brand].name} group order`,
        }];
      })
    : [];
  return {
    demoRole: incoming.demoRole === 'user' || incoming.demoRole === 'store' ? incoming.demoRole : null,
    demoMode: incoming.demoMode === true,
    selectedBrand:
      incoming.selectedBrand === 'hm' ||
      incoming.selectedBrand === 'zara' ||
      incoming.selectedBrand === 'amazon'
        ? incoming.selectedBrand
        : null,
    activeParticipantId:
      typeof incoming.activeParticipantId === 'string' ? incoming.activeParticipantId : 'user-a',
    orders,
    lastNotice: typeof incoming.lastNotice === 'string' ? incoming.lastNotice : null,
    lastPulse:
      incoming.lastPulse &&
      typeof incoming.lastPulse === 'object' &&
      typeof (incoming.lastPulse as DemoPulse).id === 'number' &&
      typeof (incoming.lastPulse as DemoPulse).message === 'string'
        ? (incoming.lastPulse as DemoPulse)
        : null,
  };
}

function readPersistedState(): PersistedDemoState {
  if (!canUseWindow()) return defaultState();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? sanitizeState(JSON.parse(raw)) : defaultState();
  } catch {
    return defaultState();
  }
}

function persistedFromState(state: DemoState): PersistedDemoState {
  return {
    demoRole: state.demoRole,
    demoMode: state.demoMode,
    selectedBrand: state.selectedBrand,
    activeParticipantId: state.activeParticipantId,
    orders: state.orders,
    lastNotice: state.lastNotice,
    lastPulse: state.lastPulse,
  };
}

function persistAndBroadcast(state: DemoState) {
  if (!canUseWindow() || applyingRemote) return;
  const payload = persistedFromState(state);
  pendingPayload = payload;
  if (persistTimer) globalThis.clearTimeout(persistTimer);
  persistTimer = globalThis.setTimeout(() => {
    const nextPayload = pendingPayload;
    pendingPayload = null;
    persistTimer = null;
    if (!nextPayload) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextPayload));
      channel?.postMessage(nextPayload);
      scheduleRemoteSync(nextPayload.orders);
    } catch {
      // The demo continues in memory when browser storage is unavailable.
    }
  }, 100);
}

function persistNow(state: DemoState) {
  if (!canUseWindow() || applyingRemote) return;
  if (persistTimer) {
    globalThis.clearTimeout(persistTimer);
    persistTimer = null;
  }
  pendingPayload = null;
  const payload = persistedFromState(state);
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    channel?.postMessage(payload);
    scheduleRemoteSync(payload.orders);
  } catch {
    // The demo continues in memory when browser storage is unavailable.
  }
}

const initialState = readPersistedState();

export const useDemoCommerceStore = create<DemoState>((set, get) => ({
  ...initialState,
  setDemoRole: (demoRole) =>
    set((state) => {
      if (state.demoRole === demoRole) return state;
      const next = { ...state, demoRole };
      persistAndBroadcast(next);
      return next;
    }),
  setDemoMode: (demoMode) =>
    set((state) => {
      if (state.demoMode === demoMode) return state;
      const next = { ...state, demoMode };
      persistAndBroadcast(next);
      return next;
    }),
  selectBrand: (selectedBrand) =>
    set((state) => {
      if (state.selectedBrand === selectedBrand) return state;
      const next = { ...state, selectedBrand };
      persistAndBroadcast(next);
      return next;
    }),
  setActiveParticipant: (activeParticipantId) =>
    set((state) => {
      if (state.activeParticipantId === activeParticipantId) return state;
      const next = { ...state, activeParticipantId };
      persistAndBroadcast(next);
      return next;
    }),
  ensureOrder: (brand, creator = primaryDemoParticipant, timerMinutes) => {
    const existing = get().orders.find((order) => order.brand === brand && order.status !== 'shipped');
    if (existing) return existing.id;
    const order = createOrder(brand, creator, timerMinutes);
    set((state) => {
      const pulse: DemoPulse = { id: now(), kind: 'join', message: order.lastEvent };
      const next = {
        ...state,
        selectedBrand: brand,
        orders: [order, ...state.orders],
        lastNotice: order.lastEvent,
        lastPulse: pulse,
      };
      persistAndBroadcast(next);
      return next;
    });
    return order.id;
  },
  createNewOrder: (brand, creator = primaryDemoParticipant, timerMinutes) => {
    const order = createOrder(brand, creator, timerMinutes);
    set((state) => {
      const pulse: DemoPulse = { id: now(), kind: 'join', message: order.lastEvent };
      const next = {
        ...state,
        selectedBrand: brand,
        orders: [order, ...state.orders],
        lastNotice: order.lastEvent,
        lastPulse: pulse,
      };
      persistAndBroadcast(next);
      return next;
    });
    return order.id;
  },
  claimOrderFounder: (orderId, participant) =>
    set((state) => {
      const orders = state.orders.map((order) => {
        if (order.id !== orderId || order.createdBy !== primaryDemoParticipant.id) return order;
        const withoutPlaceholder = order.participants.filter(
          (existing) => existing.id !== primaryDemoParticipant.id && existing.id !== participant.id,
        );
        return {
          ...order,
          createdBy: participant.id,
          participants: [{ ...participant, joinedAt: order.createdAt }, ...withoutPlaceholder],
          lastEvent: `${participant.name} is leading this group order`,
        };
      });
      const changedOrder = orders.find((order) => order.id === orderId);
      const next = {
        ...state,
        orders,
        activeParticipantId: participant.id,
        lastNotice: changedOrder?.lastEvent ?? state.lastNotice,
      };
      persistAndBroadcast(next);
      return next;
    }),
  joinParticipant: (orderId, participantInput) =>
    set((state) => {
      const participantTemplate =
        typeof participantInput === 'string'
          ? demoParticipants.find((participant) => participant.id === participantInput)
          : participantInput;
      if (!participantTemplate) return state;
      const participantId = participantTemplate.id;
      const orders = state.orders.map((order) => {
        if (order.id !== orderId) return order;
        if (order.participants.some((participant) => participant.id === participantId)) return order;
        const participant = { ...participantTemplate, joinedAt: now() };
        return {
          ...order,
          participants: [...order.participants, participant],
          lastEvent: `${participant.name} joined the group order`,
        };
      });
      const joinedOrder = orders.find((order) => order.id === orderId);
      const pulse: DemoPulse = {
        id: now(),
        kind: 'join',
        message: joinedOrder?.lastEvent ?? 'Friend joined',
      };
      const next = {
        ...state,
        orders,
        activeParticipantId: participantId,
        lastNotice: joinedOrder?.lastEvent ?? 'Friend joined',
        lastPulse: pulse,
      };
      persistAndBroadcast(next);
      return next;
    }),
  addItem: (orderId, input) =>
    set((state) => {
      const product = findProduct(input.productId);
      if (!product || !input.size || !input.color || input.quantity < 1) {
        return { ...state, lastNotice: 'Choose size, color, and quantity before adding.' };
      }
      const item: DemoOrderItem = {
        id: `${input.productId}-${input.participantId}-${now()}`,
        productId: input.productId,
        participantId: input.participantId,
        size: input.size,
        color: input.color,
        quantity: input.quantity,
        private: input.private,
        addedAt: now(),
      };
      const orders = state.orders.map((order) => {
        if (order.id !== orderId) return order;
        if (order.closesAt <= now()) {
          return {
            ...order,
            lastEvent: 'This cart timer ended. The store can now process the order.',
          };
        }
        const participantExists = order.participants.some(
          (participant) => participant.id === input.participantId,
        );
        const participantFromInput = input.participant
          ? { ...input.participant, joinedAt: now() }
          : null;
        const participants =
          participantExists
            ? order.participants
            : [
                ...order.participants,
                participantFromInput ?? {
                  id: input.participantId,
                  name: getParticipantName(input.participantId, order),
                  joinedAt: now(),
                },
              ];
        return {
          ...order,
          participants,
          items: [item, ...order.items],
          lastEvent: `${getParticipantName(input.participantId, { ...order, participants })} added ${input.quantity}x ${product.name}`,
        };
      });
      const changedOrder = orders.find((order) => order.id === orderId);
      const timerBlocked = changedOrder?.closesAt !== undefined && changedOrder.closesAt <= now();
      const pulse: DemoPulse = {
        id: now(),
        kind: timerBlocked ? 'status' : 'item',
        message: changedOrder?.lastEvent ?? (timerBlocked ? 'Timer ended' : 'Item added'),
      };
      const next = {
        ...state,
        orders,
        activeParticipantId: input.participantId,
        lastNotice: changedOrder?.lastEvent ?? (timerBlocked ? 'Timer ended' : 'Item added'),
        lastPulse: pulse,
      };
      persistAndBroadcast(next);
      return next;
    }),
  updateTimer: (orderId, minutes) =>
    set((state) => {
      const safeMinutes = Math.max(1, Math.min(720, Math.round(minutes)));
      const updatedAt = now();
      const closesAt = updatedAt + safeMinutes * 60 * 1000;
      const orders = state.orders.map((order) =>
        order.id === orderId
          ? {
              ...order,
              createdAt: updatedAt,
              closesAt,
              lastEvent: `Founder set the cart timer to ${safeMinutes} minutes`,
            }
          : order,
      );
      const changedOrder = orders.find((order) => order.id === orderId);
      const next = {
        ...state,
        orders,
        lastNotice: changedOrder?.lastEvent ?? 'Timer updated',
        lastPulse: {
          id: now(),
          kind: 'status',
          message: changedOrder?.lastEvent ?? 'Timer updated',
        } as DemoPulse,
      };
      persistAndBroadcast(next);
      return next;
    }),
  updateDeliveryAddress: (orderId, deliveryAddress) =>
    set((state) => {
      const safeAddress = deliveryAddress.slice(0, 180);
      const orders = state.orders.map((order) =>
        order.id === orderId
          ? {
              ...order,
              deliveryAddress: safeAddress,
              lastEvent: safeAddress
                ? 'Delivery address added to the shared order'
                : 'Delivery address cleared',
            }
          : order,
      );
      const next = {
        ...state,
        orders,
        lastNotice: safeAddress ? 'Delivery address added to the shared order' : 'Delivery address cleared',
      };
      persistAndBroadcast(next);
      return next;
    }),
  updateStatus: (orderId, status) =>
    set((state) => {
      const orders = state.orders.map((order) =>
        order.id === orderId
          ? order.deliveryAddress.trim().length < 8 && status !== 'collecting'
            ? { ...order, lastEvent: 'Add a delivery address before the store can process this order' }
            : { ...order, status, lastEvent: `Store marked order as ${status}` }
          : order,
      );
      const changedOrder = orders.find((order) => order.id === orderId);
      const addressBlocked = (changedOrder?.deliveryAddress.trim().length ?? 0) < 8 && status !== 'collecting';
      const next = {
        ...state,
        orders,
        lastNotice: addressBlocked ? 'Delivery address is required before fulfillment.' : `Order status updated to ${status}`,
        lastPulse: {
          id: now(),
          kind: addressBlocked ? 'status' : status === 'shipped' ? 'goal' : 'status',
          message: addressBlocked ? 'Delivery address is required before fulfillment.' : `Order status updated to ${status}`,
        } as DemoPulse,
      };
      persistAndBroadcast(next);
      return next;
    }),
  restoreSharedOrder: (incomingOrder) =>
    set((state) => {
      const order = sanitizeState({ orders: [incomingOrder] }).orders[0];
      if (!order) return state;
      const otherOrders = state.orders.filter(
        (existing) => existing.id !== order.id && existing.inviteCode !== order.inviteCode,
      );
      const existing = state.orders.find(
        (candidate) => candidate.id === order.id || candidate.inviteCode === order.inviteCode,
      );
      const mergedOrder = mergeOrder(existing, order);
      const next = {
        ...state,
        demoMode: false,
        demoRole: 'user' as DemoRole,
        selectedBrand: mergedOrder.brand,
        orders: [mergedOrder, ...otherOrders],
        lastNotice: `Loaded ${demoStores[mergedOrder.brand].name} shared order`,
      };
      persistNow(next);
      return next;
    }),
  resetDemo: () =>
    set((state) => {
      const next = { ...state, ...defaultState() };
      persistNow(next);
      return next;
    }),
}));

export function initDemoCommerceSync() {
  if (!canUseWindow()) return;
  if (syncInitialized) return;
  syncInitialized = true;
  if ('BroadcastChannel' in window && !channel) {
    channel = new BroadcastChannel(CHANNEL_NAME);
    channel.onmessage = (event: MessageEvent<PersistedDemoState>) => {
      applyingRemote = true;
      useDemoCommerceStore.setState(sanitizeState(event.data));
      applyingRemote = false;
    };
  }
  window.addEventListener('storage', (event) => {
    if (event.key !== STORAGE_KEY || !event.newValue) return;
    try {
      applyingRemote = true;
      useDemoCommerceStore.setState(sanitizeState(JSON.parse(event.newValue)));
    } catch {
      // Ignore malformed external storage writes.
    } finally {
      applyingRemote = false;
    }
  });
  if (!remotePollTimer) {
    remotePollTimer = globalThis.setInterval(() => {
      if (document.visibilityState === 'hidden') return;
      const state = useDemoCommerceStore.getState();
      const codes = state.orders.map((order) => order.inviteCode).filter(Boolean);
      if (codes.length === 0) return;
      window.fetch(`/api/demo-order-sync?codes=${encodeURIComponent(codes.join(','))}`)
        .then((res) => (res.ok ? res.json() : null))
        .then((payload: { orders?: unknown[] } | null) => {
          if (!payload?.orders?.length) return;
          const next = mergeRemoteOrders(useDemoCommerceStore.getState(), payload.orders as DemoOrder[]);
          applyingRemote = true;
          useDemoCommerceStore.setState(next);
          applyingRemote = false;
          persistNow(useDemoCommerceStore.getState());
        })
        .catch(() => {});
    }, 5000);
  }
}

export function getOrderTotal(order: DemoOrder) {
  return order.items.reduce((total, item) => {
    const product = findProduct(item.productId);
    return total + (product?.price ?? 0) * item.quantity;
  }, 0);
}

export function getOrderItemCount(order: DemoOrder) {
  return order.items.reduce((total, item) => total + item.quantity, 0);
}

export function getSharedDeliveryFee(order: DemoOrder) {
  if (order.participants.length === 0) return DELIVERY_FEE;
  return DELIVERY_FEE / order.participants.length;
}

export function getPersonalSavings(order: DemoOrder) {
  return Math.max(0, DELIVERY_FEE - getSharedDeliveryFee(order));
}

export function getGroupSavings(order: DemoOrder) {
  return getPersonalSavings(order) * order.participants.length;
}

export function getGoalProgress(order: DemoOrder) {
  return Math.min(100, Math.round((getOrderTotal(order) / FREE_SHIPPING_GOAL) * 100));
}

export function getRemainingToGoal(order: DemoOrder) {
  return Math.max(0, FREE_SHIPPING_GOAL - getOrderTotal(order));
}

export function getProductLine(item: DemoOrderItem) {
  const product = findProduct(item.productId);
  return {
    product,
    lineTotal: (product?.price ?? 0) * item.quantity,
    displayName: product?.name ?? 'Unknown product',
  };
}

export function getMasterPickingList(order: DemoOrder) {
  const grouped = new Map<string, { item: DemoOrderItem; product: DemoProduct; quantity: number }>();
  order.items.forEach((item) => {
    const product = findProduct(item.productId);
    if (!product) return;
    const key = `${item.productId}:${item.size}:${item.color}`;
    const current = grouped.get(key);
    if (current) {
      current.quantity += item.quantity;
    } else {
      grouped.set(key, { item, product, quantity: item.quantity });
    }
  });
  return Array.from(grouped.values());
}

export function getOrdersForStore() {
  return useDemoCommerceStore.getState().orders;
}

export function canParticipantSeeOrder(order: DemoOrder, participantId: string | null | undefined) {
  if (!participantId) return false;
  return (
    order.createdBy === participantId ||
    order.participants.some((participant) => participant.id === participantId)
  );
}

export function getVisibleOrdersForParticipant(orders: DemoOrder[], participantId: string | null | undefined) {
  return orders.filter((order) => canParticipantSeeOrder(order, participantId));
}

export function getDemoOrderStats(orders: DemoOrder[]) {
  const shippedOrders = orders.filter((order) => order.status === 'shipped');
  const totalSavings = shippedOrders.reduce((total, order) => total + getGroupSavings(order), 0);
  const totalParticipants = new Set(
    shippedOrders.flatMap((order) => order.participants.map((participant) => participant.id)),
  ).size;
  return {
    shippedOrders: shippedOrders.length,
    totalSavings,
    totalParticipants,
  };
}

export function getParticipantSuccessCount(orders: DemoOrder[], participantId: string) {
  return orders.reduce((count, order) => {
    const participantSeen = order.participants.some((participant) => participant.id === participantId);
    return participantSeen && order.status === 'shipped' ? count + 1 : count;
  }, 0);
}

export function getDefaultProductForBrand(brand: DemoBrandId) {
  return productsForBrand(brand)[0] ?? null;
}

export function getOrderTimerTotal(order: DemoOrder) {
  return Math.max(60 * 1000, order.closesAt - order.createdAt);
}

export function isOrderTimerEnded(order: DemoOrder, atMs = now()) {
  return order.closesAt <= atMs;
}

export function getMerchantOrderState(order: DemoOrder, atMs = now()) {
  const statusLabels: Record<OrderStatus, string> = {
    collecting: 'Collecting',
    accepted: 'Accepted',
    packing: 'Packing',
    ready: 'Ready',
    shipped: 'Shipped',
  };
  if (order.status === 'shipped') return 'Shipped';
  if (isOrderTimerEnded(order, atMs)) return 'Order done';
  return statusLabels[order.status];
}
