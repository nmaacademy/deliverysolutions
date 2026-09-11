import { OrderStatus, OrderType } from '../types';

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
