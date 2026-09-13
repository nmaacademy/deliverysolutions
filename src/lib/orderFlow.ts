import { Order, OrderActor, OrderStatus, OrderType } from '../types';

// Single source of truth for how an order moves through kitchen, courier and customer views.
export const ORDER_STEPS: Record<OrderType, OrderStatus[]> = {
  livrare: ['Comandă primită', 'În preparare', 'Gata de ridicare', 'Preluată de curier', 'Pe drum', 'Livrată'],
  ridicare: ['Comandă primită', 'În preparare', 'Gata de ridicare', 'Ridicată'],
};

export function getNextStatus(type: OrderType, status: OrderStatus): OrderStatus | null {
  const steps = ORDER_STEPS[type];
  const index = steps.indexOf(status);
  return index >= 0 && index < steps.length - 1 ? steps[index + 1] : null;
}

/**
 * What each role is allowed to do, per current status. The kitchen only cooks, the courier only
 * delivers, the customer only watches; the manager keeps a demo-only shortcut along the happy path.
 */
const ROLE_TRANSITIONS: Record<OrderActor, Partial<Record<OrderStatus, OrderStatus[]>>> = {
  kitchen: {
    'Comandă primită': ['În preparare', 'Refuzată'],
    'În preparare': ['Gata de ridicare'],
  },
  courier: {
    'Gata de ridicare': ['Preluată de curier'],
    'Preluată de curier': ['Pe drum'],
    'Pe drum': ['Livrată'],
  },
  // The customer is an observer: no transition is ever allowed from the client screens.
  client: {},
  // Admin tools are for the demo only: one step forward along the flow, plus refusing a new order.
  admin: {},
};

export function allowedTransitions(actor: OrderActor, type: OrderType, status: OrderStatus): OrderStatus[] {
  if (actor === 'admin') {
    const next = getNextStatus(type, status);
    return [...(next ? [next] : []), ...(status === 'Comandă primită' ? ['Refuzată' as OrderStatus] : [])];
  }
  if (actor === 'courier' && type !== 'livrare') return [];
  return ROLE_TRANSITIONS[actor][status] ?? [];
}

/** The only gate for status changes: a screen cannot skip a step or move an order backwards. */
export const canTransition = (actor: OrderActor, type: OrderType, from: OrderStatus, to: OrderStatus) =>
  from !== to && allowedTransitions(actor, type, from).includes(to);

/** The single step the kitchen may take on this order, or null if it is not theirs to move. */
export const kitchenNextStatus = (order: Order): OrderStatus | null =>
  (ROLE_TRANSITIONS.kitchen[order.status] ?? [])[0] ?? null;

/** The single step the courier may take on this order, or null if the run is not theirs yet. */
export const courierNextStatus = (order: Order): OrderStatus | null =>
  order.type === 'livrare' ? (ROLE_TRANSITIONS.courier[order.status] ?? [])[0] ?? null : null;

/** Statuses a delivery order has to reach before the courier screen lists it. */
export const COURIER_AVAILABLE_STATUS: OrderStatus = 'Gata de ridicare';
export const COURIER_ACTIVE_STATUSES: OrderStatus[] = ['Preluată de curier', 'Pe drum'];

/** Free for the courier to take: a delivery the kitchen has already finished. */
export const isCourierAvailable = (order: Order) =>
  order.type === 'livrare' && order.status === COURIER_AVAILABLE_STATUS;

/** Already on this courier's plate. */
export const isCourierActive = (order: Order) =>
  order.type === 'livrare' && COURIER_ACTIVE_STATUSES.includes(order.status);
