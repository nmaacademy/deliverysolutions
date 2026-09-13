import { MenuItem, Order } from '../types';

// Demo persistence: localStorage doubles as a cross-tab "backend" between client, kitchen and courier views.
// Reads and writes go through here; liveStore.ts adds the cross-tab notifications on top.
export const ORDERS_KEY = 'delivery_app_orders';
// v2: the demo menu gained grouped extras with thumbnails and a prep time. A menu cached under the
// old key has none of those, so it would keep the product page showing the pre-redesign data.
export const MENU_KEY = 'delivery_app_menu_v2';
// Orders placed from this browser, so the customer can keep tracking them after leaving the page.
const MY_ORDERS_KEY = 'delivery_app_my_orders';

function read<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function write(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Private mode or a full quota: the demo keeps working in this tab, just without persistence.
  }
}

/**
 * Orders come back from JSON with `createdAt` as a string, and orders saved by older versions of
 * the app have no timestamps at all. Rehydrate both so every screen can rely on the same shape.
 */
function normalizeOrder(order: Order): Order {
  const createdAt = new Date(order.createdAt);
  const safeCreatedAt = Number.isNaN(createdAt.getTime()) ? new Date() : createdAt;
  return {
    ...order,
    createdAt: safeCreatedAt,
    updatedAt: order.updatedAt ?? safeCreatedAt.toISOString(),
    statusHistory: order.statusHistory ?? [],
  };
}

export function normalizeOrders(orders: Order[]): Order[] {
  return orders.map(normalizeOrder);
}

export function readOrders(): Order[] | null {
  const orders = read<Order[]>(ORDERS_KEY);
  return Array.isArray(orders) ? normalizeOrders(orders) : null;
}

export function readMenu(): MenuItem[] | null {
  const menu = read<MenuItem[]>(MENU_KEY);
  return Array.isArray(menu) ? menu : null;
}

export const saveOrders = (orders: Order[]) => write(ORDERS_KEY, orders);

export const saveMenu = (menu: MenuItem[]) => write(MENU_KEY, menu);

export const readMyOrderIds = () => read<string[]>(MY_ORDERS_KEY) ?? [];

export const saveMyOrderIds = (ids: string[]) => write(MY_ORDERS_KEY, ids);
