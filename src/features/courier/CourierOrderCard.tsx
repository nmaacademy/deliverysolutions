import { useState } from 'react';
import { Phone, Navigation, ChevronRight, Clock, ArrowRight, Store, MapPin } from 'lucide-react';
import { motion } from 'motion/react';
import { Order, OrderStatus } from '../../types';
import { getNextStatus } from '../../lib/orderFlow';
import { minutesSince } from '../../lib/format';
import { distanceKm, formatKm } from '../../lib/geo';
import { triggerVibration } from '../../lib/haptics';
import { RESTAURANT_LOCATION } from '../../components/map/leafletDocument';
import { RouteMiniMap, RouteInfo } from '../../components/map/RouteMiniMap';

const STATUS_STYLE: Partial<Record<OrderStatus, { label: string; dot: string; text: string; live?: boolean }>> = {
  'În preparare': { label: 'Se prepară', dot: 'bg-amber-400', text: 'text-amber-300' },
  'Gata de ridicare': { label: 'Gata de ridicare', dot: 'bg-[#D4EAE6]', text: 'text-[#D4EAE6]' },
  'Preluată de curier': { label: 'Preluată', dot: 'bg-sky-400', text: 'text-sky-300' },
  'Pe drum': { label: 'Pe drum', dot: 'bg-[#D4EAE6]', text: 'text-[#D4EAE6]', live: true },
};

const SPLIT_PILL_HALF =
  'flex-1 h-full inline-flex items-center justify-center gap-2 text-[14px] font-medium text-zinc-100 hover:bg-white/[0.06] active:bg-white/[0.1] transition-colors focus-visible:outline-none focus-visible:bg-white/[0.1]';

export const shortOrderId = (id: string) => id.replace('ORD-', '');

const ACTION_LABEL: Partial<Record<OrderStatus, string>> = {
  'Gata de ridicare': 'Preia comanda',
  'Preluată de curier': 'Pornește spre client',
  'Pe drum': 'Confirmă livrarea',
};

function urgencyClass(minutes: number) {
  if (minutes >= 45) return 'text-red-400';
  if (minutes >= 30) return 'text-amber-300';
  return 'text-zinc-400';
}

const deliveryWhen = (time: string) => (time.startsWith('Cât mai repede') ? 'Cât mai repede' : `La ${time}`);

interface Props {
  order: Order;
  index: number;
  /** Active runs get the route map and quick contact actions. */
  isActiveRun: boolean;
  onOpen: (order: Order) => void;
  onAdvance: (orderId: string, status: OrderStatus) => void;
}

export default function CourierOrderCard({ order, index, isActiveRun, onOpen, onAdvance }: Props) {
  const status = STATUS_STYLE[order.status];
  const nextStatus = getNextStatus(order.type, order.status);
  const actionLabel = ACTION_LABEL[order.status];
  const elapsed = minutesSince(order.createdAt);
  const itemCount = order.items.reduce((n, item) => n + item.quantity, 0);
  const distance = order.coordinates ? distanceKm(RESTAURANT_LOCATION, order.coordinates) : null;
  const [route, setRoute] = useState<RouteInfo | null>(null);

  return (
    <motion.article
      layout="position"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={{ duration: 0.25, delay: index * 0.04, ease: 'easeOut' }}
      className="rounded-[32px] bg-white/[0.07] backdrop-blur-2xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.35)] overflow-hidden"
    >
      {/* Summary: tap for full order details */}
      <button
        type="button"
        onClick={() => onOpen(order)}
        className="w-full text-left px-5 pt-5 pb-4 transition-colors hover:bg-white/[0.02] active:bg-white/[0.04] focus-visible:outline-none focus-visible:bg-white/[0.04]"
        aria-label={`Detalii comandă ${order.id}, ${order.customerName}`}
      >
        <div className="flex items-center justify-between mb-3">
          {status && (
            <span className={`inline-flex items-center gap-2 text-[13px] font-semibold ${status.text}`}>
              <span className="relative flex w-2 h-2">
                {status.live && <span className={`absolute inset-0 rounded-full opacity-60 animate-ping motion-reduce:animate-none ${status.dot}`} />}
                <span className={`relative w-2 h-2 rounded-full ${status.dot}`} />
              </span>
              {status.label}
            </span>
          )}
          <span className={`inline-flex items-center gap-1 text-[13px] font-medium tabular-nums ${urgencyClass(elapsed)}`} title="Timp de la plasarea comenzii">
            <Clock size={14} />
            {elapsed} min
          </span>
        </div>

        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="text-[19px] font-semibold tracking-tight text-white truncate">{order.customerName}</h3>
            <p className="text-[13px] text-zinc-400 mt-0.5 truncate">
              #{shortOrderId(order.id)} · {itemCount} {itemCount === 1 ? 'produs' : 'produse'} · {deliveryWhen(order.time)}
            </p>
          </div>
          <div className="flex items-center gap-1 shrink-0 pt-0.5">
            <span className="text-[17px] font-semibold text-white tabular-nums">{order.total} RON</span>
            <ChevronRight size={18} className="text-zinc-600" />
          </div>
        </div>
      </button>

      {/* Route: pickup → drop-off */}
      <ol className="relative mx-5 pb-1">
        <span aria-hidden className="absolute left-[15px] top-8 bottom-8 border-l border-dashed border-white/15" />
        <li className="flex items-center gap-3 py-2">
          <span className="w-8 h-8 shrink-0 rounded-full bg-white/[0.08] grid place-items-center text-orange-400">
            <Store size={15} />
          </span>
          <div className="min-w-0">
            <p className="text-[12px] text-zinc-500">Ridicare</p>
            <p className="text-[14px] text-zinc-200 truncate">Restaurant Demo</p>
          </div>
        </li>
        <li className="flex items-center gap-3 py-2">
          <span className="w-8 h-8 shrink-0 rounded-full bg-[#D4EAE6]/10 grid place-items-center text-[#D4EAE6]">
            <MapPin size={15} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[12px] text-zinc-500">Livrare</p>
            <p className="text-[14px] text-zinc-200 truncate">{order.address ?? 'Adresă lipsă'}</p>
          </div>
          {/* Active runs show the live road ETA from the mini-map instead of the straight-line distance. */}
          {isActiveRun && route && (
            <span className="shrink-0 text-right tabular-nums leading-tight">
              <span className="block text-[14px] font-semibold text-white">{route.minutes} min</span>
              <span className="block text-[12px] text-zinc-500">{formatKm(route.km)}</span>
            </span>
          )}
          {distance !== null && !isActiveRun && (
            <span className="text-[13px] text-zinc-400 tabular-nums shrink-0" title="Distanță în linie dreaptă de la restaurant">
              ≈ {formatKm(distance)}
            </span>
          )}
        </li>
      </ol>

      {isActiveRun && order.coordinates && (
        <div className="mx-5 mt-3 h-44 rounded-[20px] overflow-hidden bg-black/30 border border-white/[0.06]">
          <RouteMiniMap lat={order.coordinates.lat} lng={order.coordinates.lng} className="h-full" onRouteInfo={setRoute} />
        </div>
      )}

      <div className="p-5 pt-5 space-y-3.5">
        {isActiveRun && (order.customerPhone || order.coordinates) && (
          // One pill split by a hairline divider; each half is a full-height tap target.
          <div className="flex items-center h-11 rounded-full bg-white/[0.08] overflow-hidden">
            {order.customerPhone && (
              <a href={`tel:${order.customerPhone}`} className={SPLIT_PILL_HALF}>
                <Phone size={16} />
                Sună
              </a>
            )}
            {order.customerPhone && order.coordinates && <span aria-hidden className="w-px h-5 bg-white/15 shrink-0" />}
            {order.coordinates && (
              <a
                href={`https://waze.com/ul?ll=${order.coordinates.lat},${order.coordinates.lng}&navigate=yes`}
                target="_blank"
                rel="noopener noreferrer"
                className={SPLIT_PILL_HALF}
              >
                <Navigation size={16} />
                Navighează
              </a>
            )}
          </div>
        )}

        {actionLabel && nextStatus ? (
          <motion.button
            type="button"
            whileTap={{ scale: 0.98 }}
            onClick={() => {
              triggerVibration(20);
              onAdvance(order.id, nextStatus);
            }}
            className="w-full h-[52px] rounded-full bg-[#D4EAE6] hover:bg-[#c5dfda] shadow-[0_4px_20px_rgba(212,234,230,0.18)] text-zinc-900 text-[15px] font-semibold inline-flex items-center justify-center gap-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D4EAE6] focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-900"
          >
            {actionLabel}
            <ArrowRight size={18} />
          </motion.button>
        ) : (
          <div role="status" className="w-full h-[52px] rounded-full bg-white/[0.04] border border-white/[0.06] text-zinc-400 text-[14px] font-medium inline-flex items-center justify-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse motion-reduce:animate-none" />
            Se prepară în bucătărie
          </div>
        )}
      </div>
    </motion.article>
  );
}
