import { useEffect, useState } from 'react';
import { MenuItem, Order, OrderActor, OrderStatus } from '../types';
import { canTransition } from './orderFlow';
import { MENU_KEY, ORDERS_KEY, normalizeOrders, readMenu, readOrders, saveMenu, saveOrders } from './storage';
import { supabase } from './supabase';

/**
 * Cross-device sync for the demo.
 *
 * Every change lands locally first, so the UI stays instant and remains usable offline. When the
 * Supabase variables are configured, the same change is mirrored to the cloud and Realtime brings
 * it to other devices. BroadcastChannel and the storage event still handle same-device tabs.
 */

type Topic = 'orders' | 'menu';
const TOPICS: Topic[] = ['orders', 'menu'];

const CHANNEL_NAME = 'delivery_app_live';
const TAB_ID = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
// Fallback only: storage events and BroadcastChannel deliver the real-time updates.
const POLL_MS = 5000;

const TOPIC_BY_KEY: Record<string, Topic> = { [ORDERS_KEY]: 'orders', [MENU_KEY]: 'menu' };

// ---------------------------------------------------------------------------
// Shared notification bus, refcounted so intervals and listeners are cleaned up.
// ---------------------------------------------------------------------------

type BusListener = (topic: Topic) => void;

const busListeners = new Set<BusListener>();
let channel: BroadcastChannel | null = null;
let teardown: (() => void) | null = null;

function notifyBus(topic: Topic) {
  busListeners.forEach(listener => listener(topic));
}

const notifyAll = () => TOPICS.forEach(notifyBus);

function startBus() {
  const onStorage = (event: StorageEvent) => {
    // A null key means the whole store was cleared: refresh everything.
    if (!event.key) {
      notifyAll();
      return;
    }
    const topic = TOPIC_BY_KEY[event.key];
    if (topic) notifyBus(topic);
  };

  const onMessage = (event: MessageEvent) => {
    const data = event.data as { tabId?: string; topic?: Topic } | null;
    // Ignore our own echo, so a write can never loop back into a second write.
    if (data?.topic && data.tabId !== TAB_ID) notifyBus(data.topic);
  };

  if (typeof BroadcastChannel !== 'undefined') {
    channel = new BroadcastChannel(CHANNEL_NAME);
    channel.addEventListener('message', onMessage);
  }
  window.addEventListener('storage', onStorage);
  const pollId = window.setInterval(notifyAll, POLL_MS);

  teardown = () => {
    window.removeEventListener('storage', onStorage);
    channel?.removeEventListener('message', onMessage);
    channel?.close();
    channel = null;
    window.clearInterval(pollId);
  };
}

function joinBus(listener: BusListener) {
  busListeners.add(listener);
  if (busListeners.size === 1) startBus();

  return () => {
    busListeners.delete(listener);
    if (busListeners.size === 0) {
      teardown?.();
      teardown = null;
    }
  };
}

function broadcast(topic: Topic) {
  channel?.postMessage({ tabId: TAB_ID, topic });
}

// ---------------------------------------------------------------------------
// One small store per topic.
// ---------------------------------------------------------------------------

function createStore<T>(topic: Topic, read: () => T | null, save: (value: T) => void) {
  let current: T | null = null;
  const listeners = new Set<(value: T) => void>();

  const emit = (value: T) => {
    current = value;
    listeners.forEach(listener => listener(value));
  };

  /** Adopt what is in storage, unless it is the state we already have. */
  const pull = () => {
    const stored = read();
    if (stored && JSON.stringify(stored) !== JSON.stringify(current)) emit(stored);
  };

  const set = (value: T) => {
    save(value);
    emit(value);
    broadcast(topic);
  };

  /** Adopt a cloud snapshot without writing it back to Supabase. */
  const adopt = (value: T) => {
    save(value);
    emit(value);
    broadcast(topic);
  };

  return {
    /** First tab to open seeds storage with the demo data, so every tab starts from the same list. */
    init(fallback: T): T {
      if (current === null) {
        const stored = read();
        current = stored ?? fallback;
        if (!stored) save(current);
      }
      return current;
    },
    set,
    adopt,
    snapshot: () => current,
    /** Mutate the freshest version in storage, so another tab's change is never lost. */
    update(mutate: (value: T) => T): T | null {
      const latest = read() ?? current;
      if (latest === null) return null;

      const next = mutate(latest);
      if (next === latest) {
        // Nothing to write, but storage may still be ahead of this tab.
        if (JSON.stringify(latest) !== JSON.stringify(current)) emit(latest);
        return latest;
      }
      set(next);
      return next;
    },
    subscribe(listener: (value: T) => void) {
      listeners.add(listener);
      const leaveBus = joinBus(changed => {
        if (changed === topic) pull();
      });
      // Storage may have moved on between the initial render and this subscription.
      pull();
      return () => {
        listeners.delete(listener);
        leaveBus();
      };
    },
  };
}

const ordersStore = createStore<Order[]>('orders', readOrders, saveOrders);
const menuStore = createStore<MenuItem[]>('menu', readMenu, saveMenu);

// ---------------------------------------------------------------------------
// Supabase mirror. The app remains fully functional if this section cannot connect.
// ---------------------------------------------------------------------------

type CloudRow<T> = { id: string; payload: T; updated_at?: string };
let cloudStarted = false;

function warnCloud(action: string, error: unknown) {
  console.warn(`[cloud sync] ${action}`, error);
}

async function upsertOrder(order: Order) {
  if (!supabase) return;
  const { error } = await supabase
    .from('demo_orders')
    .upsert({ id: order.id, payload: order, updated_at: new Date().toISOString() });
  if (error) warnCloud('order write failed', error);
}

async function upsertMenu(menu: MenuItem[]) {
  if (!supabase || menu.length === 0) return;
  const updatedAt = new Date().toISOString();
  const { error } = await supabase
    .from('demo_menu_items')
    .upsert(menu.map(item => ({ id: item.id, payload: item, updated_at: updatedAt })));
  if (error) warnCloud('menu write failed', error);
}

function adoptOrder(order: Order) {
  const normalized = normalizeOrders([order])[0];
  const current = ordersStore.snapshot() ?? [];
  const index = current.findIndex(item => item.id === normalized.id);
  const next = index === -1
    ? [normalized, ...current]
    : current.map(item => (item.id === normalized.id ? normalized : item));
  ordersStore.adopt(next);
}

function adoptMenuItem(item: MenuItem) {
  const current = menuStore.snapshot() ?? [];
  const index = current.findIndex(entry => entry.id === item.id);
  const next = index === -1
    ? [...current, item]
    : current.map(entry => (entry.id === item.id ? item : entry));
  menuStore.adopt(next);
}

async function hydrateFromCloud() {
  if (!supabase) return;

  const [ordersResult, menuResult] = await Promise.all([
    supabase.from('demo_orders').select('id,payload,updated_at'),
    supabase.from('demo_menu_items').select('id,payload,updated_at'),
  ]);

  if (ordersResult.error) {
    warnCloud('orders could not be loaded', ordersResult.error);
  } else {
    const remote = (ordersResult.data as CloudRow<Order>[]).map(row => row.payload);
    const local = ordersStore.snapshot() ?? [];
    if (remote.length === 0) {
      await Promise.all(local.map(upsertOrder));
    } else {
      // Cloud is authoritative for matching ids; local-only orders are uploaded (offline recovery).
      const remoteIds = new Set(remote.map(order => order.id));
      const localOnly = local.filter(order => !remoteIds.has(order.id));
      ordersStore.adopt(normalizeOrders([...remote, ...localOnly]));
      await Promise.all(localOnly.map(upsertOrder));
    }
  }

  if (menuResult.error) {
    warnCloud('menu could not be loaded', menuResult.error);
  } else {
    const remote = (menuResult.data as CloudRow<MenuItem>[]).map(row => row.payload);
    const local = menuStore.snapshot() ?? [];
    if (remote.length === 0) {
      await upsertMenu(local);
    } else {
      // Keep products introduced by a newer frontend build, while preserving cloud stock/settings.
      const remoteIds = new Set(remote.map(item => item.id));
      const localOnly = local.filter(item => !remoteIds.has(item.id));
      menuStore.adopt([...remote, ...localOnly]);
      await upsertMenu(localOnly);
    }
  }
}

function startCloudSync() {
  if (!supabase || cloudStarted) return;
  cloudStarted = true;
  void hydrateFromCloud();

  supabase
    .channel('delivery-demo-state')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'demo_orders' }, event => {
      const row = event.new as CloudRow<Order>;
      if (row.payload) adoptOrder(row.payload);
    })
    .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'demo_orders' }, event => {
      const row = event.new as CloudRow<Order>;
      if (row.payload) adoptOrder(row.payload);
    })
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'demo_menu_items' }, event => {
      const row = event.new as CloudRow<MenuItem>;
      if (row.payload) adoptMenuItem(row.payload);
    })
    .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'demo_menu_items' }, event => {
      const row = event.new as CloudRow<MenuItem>;
      if (row.payload) adoptMenuItem(row.payload);
    })
    .subscribe(status => {
      if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') warnCloud(`Realtime: ${status}`, status);
    });
}

// ---------------------------------------------------------------------------
// React bindings
// ---------------------------------------------------------------------------

/** Orders, kept in sync with every other tab. */
export function useLiveOrders(fallback: Order[]): Order[] {
  // The demo orders get the same timestamp fields as stored ones, so every screen sees one shape.
  const [orders, setOrders] = useState(() => ordersStore.init(normalizeOrders(fallback)));
  useEffect(() => {
    startCloudSync();
    return ordersStore.subscribe(setOrders);
  }, []);
  return orders;
}

/**
 * Menu items (stock, availability), kept in sync with every other tab.
 *
 * Demo products added to the app after a browser already stored a menu are merged in by id, so a
 * returning visitor sees new categories without losing the stock and availability edits made in the
 * manager screen.
 */
export function useLiveMenu(fallback: MenuItem[]): MenuItem[] {
  const [menu, setMenu] = useState(() => {
    const current = menuStore.init(fallback);
    const missing = fallback.filter(item => !current.some(stored => stored.id === item.id));
    return missing.length > 0 ? menuStore.update(stored => [...stored, ...missing]) ?? current : current;
  });
  useEffect(() => {
    startCloudSync();
    return menuStore.subscribe(setMenu);
  }, []);
  return menu;
}

// ---------------------------------------------------------------------------
// Writes
// ---------------------------------------------------------------------------

export const addOrder = (order: Order) => {
  const result = ordersStore.update(orders => [order, ...orders]);
  void upsertOrder(order);
  return result;
};

export const updateMenu = (mutate: (menu: MenuItem[]) => MenuItem[]) => {
  let changed: MenuItem[] = [];
  const result = menuStore.update(current => {
    const next = mutate(current);
    const currentById = new Map(current.map(item => [item.id, item]));
    changed = next.filter(item => JSON.stringify(currentById.get(item.id)) !== JSON.stringify(item));
    return next;
  });
  if (changed.length > 0) void upsertMenu(changed);
  return result;
};

export type StatusChange =
  | { ok: true; order: Order }
  /** `stale` means another tab already moved the order, so the click is quietly ignored. */
  | { ok: false; reason: 'missing' | 'stale' | 'not-allowed' };

/**
 * The only way a status changes. The transition has to be one this role is allowed to make from the
 * order's current status, which rules out skipped steps, regressions and double clicks.
 */
export function updateOrderStatus(orderId: string, next: OrderStatus, actor: OrderActor): StatusChange {
  let result: StatusChange = { ok: false, reason: 'missing' };

  ordersStore.update(orders => {
    const current = orders.find(order => order.id === orderId);
    if (!current) return orders;

    if (!canTransition(actor, current.type, current.status, next)) {
      result = { ok: false, reason: current.status === next ? 'stale' : 'not-allowed' };
      return orders;
    }

    const at = new Date().toISOString();
    const updated: Order = {
      ...current,
      status: next,
      updatedAt: at,
      statusHistory: [...(current.statusHistory ?? []), { status: next, actor, at }],
    };
    result = { ok: true, order: updated };
    void upsertOrder(updated);
    return orders.map(order => (order.id === orderId ? updated : order));
  });

  return result;
}
