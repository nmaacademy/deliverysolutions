import { useEffect } from 'react';
import { X, Phone, MapPin, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Order } from '../../types';
import { lineTotal } from '../../lib/pricing';
import { formatTime } from '../../lib/format';
import { shortOrderId } from './CourierOrderCard';

interface Props {
  order: Order | null;
  onClose: () => void;
}

export default function OrderDetailsSheet({ order, onClose }: Props) {
  useEffect(() => {
    if (!order) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [order, onClose]);

  return (
    <AnimatePresence>
      {order && (
        <>
          <motion.div
            key="scrim"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 z-50"
          />
          <motion.div
            key="sheet"
            role="dialog"
            aria-modal="true"
            aria-labelledby="order-sheet-title"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 34, stiffness: 380 }}
            className="fixed inset-x-0 bottom-0 z-50 sm:max-w-lg sm:mx-auto max-h-[88svh] overflow-y-auto no-scrollbar rounded-t-[32px] bg-zinc-900/85 backdrop-blur-2xl border-t border-white/10 shadow-[0_-12px_40px_rgba(0,0,0,0.5)] pb-[calc(env(safe-area-inset-bottom)+24px)]"
          >
            <div className="sticky top-0 z-10 bg-zinc-900/90 px-5 pt-3 pb-4 border-b border-white/[0.06]">
              <div aria-hidden className="mx-auto mb-3 h-1 w-10 rounded-full bg-white/15" />
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-[13px] text-zinc-500">Comanda #{shortOrderId(order.id)} · {order.status}</p>
                  <h2 id="order-sheet-title" className="text-[20px] font-semibold tracking-tight text-white truncate">{order.customerName}</h2>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Închide"
                  className="h-11 w-11 shrink-0 rounded-full bg-white/[0.06] hover:bg-white/10 grid place-items-center text-zinc-300 transition-colors"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            <div className="px-5 pt-5 space-y-6">
              <section>
                <h3 className="text-[13px] font-semibold text-zinc-400 mb-1">Produse</h3>
                <ul className="divide-y divide-white/[0.06]">
                  {order.items.map(item => (
                    <li key={item.id} className="flex items-start gap-3 py-3">
                      <span className="h-7 min-w-7 px-2 rounded-lg bg-white/[0.06] text-[13px] font-semibold text-[#D4EAE6] grid place-items-center tabular-nums">
                        {item.quantity}×
                      </span>
                      <div className="flex-1 min-w-0 pt-0.5">
                        <p className="text-[15px] text-zinc-100 leading-snug">{item.menuItem.name}</p>
                        {item.selectedExtras.length > 0 && (
                          <p className="text-[13px] text-zinc-500 mt-0.5">+ {item.selectedExtras.map(e => e.name).join(', ')}</p>
                        )}
                      </div>
                      <span className="text-[14px] text-zinc-400 tabular-nums pt-0.5">{lineTotal(item)} RON</span>
                    </li>
                  ))}
                </ul>
                <div className="flex justify-between items-baseline pt-3 border-t border-white/[0.06]">
                  <span className="text-[15px] text-zinc-400">
                    {order.paymentMethod === 'card' ? 'Plătită online cu cardul' : order.paymentMethod === 'cash' ? 'De încasat numerar' : 'Total de încasat'}
                  </span>
                  <span className="text-[17px] font-semibold text-white tabular-nums">{order.total} RON</span>
                </div>
              </section>

              <section className="space-y-3">
                <h3 className="text-[13px] font-semibold text-zinc-400">Livrare</h3>
                {order.address && (
                  <p className="flex gap-3 text-[15px] text-zinc-200">
                    <MapPin size={18} className="text-[#D4EAE6] shrink-0 mt-0.5" />
                    {order.address}
                  </p>
                )}
                <p className="flex gap-3 text-[15px] text-zinc-200">
                  <Clock size={18} className="text-zinc-500 shrink-0 mt-0.5" />
                  {order.time} <span className="text-zinc-500">· plasată la {formatTime(order.createdAt)}</span>
                </p>
              </section>

              {order.customerPhone && (
                <a
                  href={`tel:${order.customerPhone}`}
                  className="h-12 w-full rounded-full bg-white/[0.08] hover:bg-white/10 transition-colors inline-flex items-center justify-center gap-2 text-[15px] font-medium text-zinc-100"
                >
                  <Phone size={17} />
                  Sună clientul · <span className="tabular-nums">{order.customerPhone}</span>
                </a>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
