import { Check, Clock, Truck, Home, Package, ShoppingBag, X, LucideIcon } from 'lucide-react';
import { Order, OrderStatus, OrderType } from '../../types';
import { ORDER_STEPS } from '../../lib/orderFlow';
import { formatTime } from '../../lib/format';

// Customer-facing presentation of order statuses, shared by the tracking page and the menu tracker.
export const STATUS_ICONS: Record<OrderStatus, LucideIcon> = {
  'Comandă primită': Check,
  'În preparare': Clock,
  'Gata de ridicare': ShoppingBag,
  'Preluată de curier': Package,
  'Pe drum': Truck,
  'Livrată': Home,
  'Ridicată': Check,
  'Refuzată': X,
};

// Customer-facing wording where the internal status name would read oddly.
export const statusLabel = (order: Order, status: OrderStatus = order.status) =>
  order.type === 'livrare' && status === 'Gata de ridicare' ? 'Așteaptă curierul' : status;

/** Delivered, picked up or refused: nothing left to wait for. */
export function isFinished(order: Order) {
  const steps = ORDER_STEPS[order.type];
  return order.status === 'Refuzată' || order.status === steps[steps.length - 1];
}

// The compact tracker folds the order steps into three phases; the final status fills all of them.
const TRACKER_PHASES: Record<OrderType, OrderStatus[][]> = {
  livrare: [['Comandă primită', 'În preparare'], ['Gata de ridicare', 'Preluată de curier'], ['Pe drum']],
  ridicare: [['Comandă primită'], ['În preparare'], ['Gata de ridicare']],
};

export const TRACKER_PHASE_COUNT = 3;

/** Which phase is in progress, and how far through its own steps it is (0..1). */
export function trackerProgress(order: Order) {
  const phases = TRACKER_PHASES[order.type];
  const phase = phases.findIndex(steps => steps.includes(order.status));
  if (phase < 0) return { phase: TRACKER_PHASE_COUNT, fraction: 0 };
  return { phase, fraction: phases[phase].indexOf(order.status) / phases[phase].length };
}

// Upper bound of the "Cât mai repede (30-45 min)" promise shown at checkout.
const ASAP_MINUTES = 45;

/** One-line summary under the status: when to expect the order, plus how much was ordered. */
export function trackerSubtitle(order: Order) {
  const count = order.items.reduce((sum, item) => sum + item.quantity, 0);
  const products = count === 1 ? '1 produs' : `${count} produse`;

  if (order.status === 'Refuzată') return 'Restaurantul a refuzat comanda';
  if (isFinished(order)) return `Poftă bună! · ${products}`;
  if (!order.time.startsWith('Cât mai repede')) return `Programată la ${order.time} · ${products}`;

  const eta = formatTime(new Date(order.createdAt.getTime() + ASAP_MINUTES * 60_000));
  return `${order.type === 'livrare' ? 'Ajunge' : 'Gata'} ~${eta} · ${products}`;
}
