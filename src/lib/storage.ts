import { MenuItem, Order } from '../types';

// Demo persistence: localStorage doubles as a cross-tab "backend" between client, kitchen and courier views.
const ORDERS_KEY = 'delivery_app_orders';
const MENU_KEY = 'delivery_app_menu';
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

export function readOrders(): Order[] | null {
  const orders = read<Order[]>(ORDERS_KEY);
  return orders ? orders.map(o => ({ ...o, createdAt: new Date(o.createdAt) })) : null;
}

export const readMenu = () => read<MenuItem[]>(MENU_KEY);

export const saveOrders = (orders: Order[]) => localStorage.setItem(ORDERS_KEY, JSON.stringify(orders));

export const saveMenu = (menu: MenuItem[]) => localStorage.setItem(MENU_KEY, JSON.stringify(menu));

export const readMyOrderIds = () => read<string[]>(MY_ORDERS_KEY) ?? [];

export const saveMyOrderIds = (ids: string[]) => localStorage.setItem(MY_ORDERS_KEY, JSON.stringify(ids));
