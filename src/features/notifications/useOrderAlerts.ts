import { useEffect, useRef } from 'react';
import { Order, OrderStatus } from '../../types';
import { isCourierAvailable } from '../../lib/orderFlow';
import { shortOrderId } from '../../lib/format';
import { useHighlights, useNotifications } from './useNotifications';

type StaffScreen = 'kitchen' | 'courier';

/**
 * Watches the live order list and raises one in-app notification per real change.
 *
 * The orders already on screen when the tab opens (including the demo/mock ones) are recorded as
 * "already seen", so nothing fires on the first load. Because the comparison is against the last
 * list this hook processed, the same change arriving twice — from the storage event, the
 * BroadcastChannel and the polling fallback — still notifies only once.
 */
export function useOrderAlerts(orders: Order[], screen: StaffScreen) {
  const { notifications, notify, dismiss } = useNotifications();
  const { highlightedIds, highlight } = useHighlights();

  // Statuses as of the previous run; seeded with what was on screen at mount.
  const seen = useRef<Map<string, OrderStatus> | null>(null);
  if (seen.current === null) {
    seen.current = new Map(orders.map(order => [order.id, order.status]));
  }

  useEffect(() => {
    const previous = seen.current!;

    orders.forEach(order => {
      const before = previous.get(order.id);
      if (before === order.status) return;

      if (screen === 'kitchen' && order.status === 'Comandă primită') {
        notify(`Comandă nouă #${shortOrderId(order.id)} de la ${order.customerName}`, {
          detail: order.type === 'livrare' ? 'Livrare' : 'Ridicare personală',
        });
        highlight(order.id);
      }

      if (screen === 'courier' && isCourierAvailable(order)) {
        notify(`Cursă nouă disponibilă: comanda #${shortOrderId(order.id)}`, {
          detail: order.address ?? order.customerName,
        });
        highlight(order.id);
      }

      if (screen === 'courier' && order.status === 'Livrată' && before) {
        notify(`Comanda #${shortOrderId(order.id)} a fost livrată`, { tone: 'success' });
      }
    });

    seen.current = new Map(orders.map(order => [order.id, order.status]));
  }, [orders, screen, notify, highlight]);

  return { notifications, dismiss, highlightedIds };
}
