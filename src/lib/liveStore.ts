import { useEffect, useState } from 'react';
import { MenuItem, Order, OrderActor, OrderStatus } from '../types';
import { canTransition } from './orderFlow';
import { MENU_KEY, ORDERS_KEY, normalizeOrders, readMenu, readOrders, saveMenu, saveOrders } from './storage';

/**
 * Cross-tab sync for the demo, with no backend involved.
 *
 * A write lands in localStorage and is announced right away on a BroadcastChannel; other tabs also
 * get the browser's own `storage` event. A slow interval stays behind as a fallback for browsers
 * without BroadcastChannel. Every write re-reads storage first, so a change made in another tab is
 * never overwritten with stale state.
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
// React bindings
// ---------------------------------------------------------------------------

/** Orders, kept in sync with every other tab. */
export function useLiveOrders(fallback: Order[]): Order[] {
  // The demo orders get the same timestamp fields as stored ones, so every screen sees one shape.
  const [orders, setOrders] = useState(() => ordersStore.init(normalizeOrders(fallback)));
  useEffect(() => ordersStore.subscribe(setOrders), []);
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
  useEffect(() => menuStore.subscribe(setMenu), []);
  return menu;
}

// ---------------------------------------------------------------------------
// Writes
// ---------------------------------------------------------------------------

export const addOrder = (order: Order) => ordersStore.update(orders => [order, ...orders]);

export const updateMenu = (mutate: (menu: MenuItem[]) => MenuItem[]) => menuStore.update(mutate);

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
    return orders.map(order => (order.id === orderId ? updated : order));
  });

  return result;
}
