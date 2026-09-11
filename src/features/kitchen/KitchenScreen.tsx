import { ReactNode, useEffect, useState } from 'react';
import { ChevronLeft, CheckCircle2, ArrowRight, X, LogOut } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Order, OrderStatus } from '../../types';
import { formatTime } from '../../lib/format';
import { getNextStatus } from '../../lib/orderFlow';
import OrderCard from '../../components/orders/OrderCard';

interface Props {
  orders: Order[];
  onUpdateOrderStatus: (orderId: string, newStatus: OrderStatus) => void;
  onBack: () => void;
  /** Only passed while staff login is enabled. */
  onLogout?: () => void;
}

/** Re-renders on an interval so the clock and the per-order timers keep ticking. */
function useNow(intervalMs: number) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}

const oldestFirst = (a: Order, b: Order) => a.createdAt.getTime() - b.createdAt.getTime();

const PILL = 'h-[52px] rounded-full text-sm font-bold uppercase tracking-wider inline-flex items-center justify-center gap-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-900';

/**
 * New tickets can be refused from a small secondary button. Refusing takes a second tap on the
 * same row (no modal), and the confirmation quietly resets if the cook doesn't follow through.
 */
function KitchenActions({ isNew, onAdvance, onRefuse }: { isNew: boolean; onAdvance: () => void; onRefuse: () => void }) {
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    if (!confirming) return;
    const id = setTimeout(() => setConfirming(false), 5000);
    return () => clearTimeout(id);
  }, [confirming]);

  if (confirming) {
    return (
      <div className="flex gap-3">
        <button type="button" onClick={() => setConfirming(false)} className={`${PILL} flex-1 bg-white/[0.06] border border-white/10 text-zinc-300 hover:bg-white/10 focus-visible:ring-white/40`}>
          Renunță
        </button>
        <motion.button
          type="button"
          whileTap={{ scale: 0.98 }}
          onClick={onRefuse}
          className={`${PILL} flex-[1.5] px-4 bg-red-500 text-white hover:bg-red-400 focus-visible:ring-red-400`}
        >
          Refuză comanda
        </motion.button>
      </div>
    );
  }

  return (
    <div className="flex gap-3">
      {isNew && (
        <button
          type="button"
          onClick={() => setConfirming(true)}
          aria-label="Refuză comanda"
          title="Refuză comanda"
          className="w-[52px] h-[52px] shrink-0 grid place-items-center rounded-full bg-white/[0.06] border border-white/10 text-zinc-400 hover:text-red-300 hover:bg-red-500/10 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
        >
          <X size={20} />
        </button>
      )}
      <motion.button
        type="button"
        whileTap={{ scale: 0.98 }}
        onClick={onAdvance}
        className={`${PILL} flex-1 ${
          isNew
            ? 'bg-amber-400 text-amber-950 hover:bg-amber-300 shadow-[0_4px_20px_rgba(251,191,36,0.2)] focus-visible:ring-amber-400'
            : 'bg-[#D4EAE6] text-zinc-900 hover:bg-[#c5dfda] shadow-[0_4px_20px_rgba(212,234,230,0.18)] focus-visible:ring-[#D4EAE6]'
        }`}
      >
        {isNew ? (
          <>
            Începe prepararea
            <ArrowRight size={18} />
          </>
        ) : (
          <>
            <CheckCircle2 size={18} />
            Marchează gata
          </>
        )}
      </motion.button>
    </div>
  );
}

function Column({ title, count, empty, children }: { title: string; count: number; empty: string; children: ReactNode }) {
  return (
    <section>
      <div className="flex items-baseline justify-between px-1 mb-3">
        <h2 className="text-[13px] font-semibold text-zinc-400">{title}</h2>
        <span className="text-[13px] text-zinc-500 tabular-nums">{count}</span>
      </div>
      {count === 0 ? (
        <p className="rounded-[32px] border border-dashed border-white/10 px-6 py-10 text-center text-[14px] text-zinc-500">{empty}</p>
      ) : (
        <div className="grid gap-4 2xl:grid-cols-2 items-start">
          <AnimatePresence mode="popLayout">{children}</AnimatePresence>
        </div>
      )}
    </section>
  );
}

export default function KitchenScreen({ orders, onUpdateOrderStatus, onBack, onLogout }: Props) {
  const now = useNow(30_000);
  const newOrders = orders.filter(o => o.status === 'Comandă primită').sort(oldestFirst);
  const cooking = orders.filter(o => o.status === 'În preparare').sort(oldestFirst);

  const renderCard = (order: Order, index: number) => {
    const isNew = order.status === 'Comandă primită';
    const nextStatus = getNextStatus(order.type, order.status);
    return (
      <motion.div layout key={order.id}>
        <OrderCard
          order={order}
          variant={isNew ? 'highlighted' : 'default'}
          delay={index}
          actionButtons={nextStatus && (
            <KitchenActions
              isNew={isNew}
              onAdvance={() => onUpdateOrderStatus(order.id, nextStatus)}
              onRefuse={() => onUpdateOrderStatus(order.id, 'Refuzată')}
            />
          )}
        />
      </motion.div>
    );
  };

  return (
    <div className="relative isolate min-h-[100svh] flex flex-col bg-zinc-950 text-zinc-100 font-sans">
      {/* Soft glow so the frosted-glass cards have something to blur. */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(70%_45%_at_10%_0%,rgba(212,234,230,0.16),transparent_70%),radial-gradient(60%_40%_at_100%_60%,rgba(251,191,36,0.08),transparent_70%)]"
      />

      <header className="sticky top-0 z-30 bg-zinc-950/70 backdrop-blur-2xl border-b border-white/[0.06] px-4 sm:px-6 pt-[calc(env(safe-area-inset-top)+20px)] pb-4">
        <div className="max-w-7xl mx-auto flex items-center gap-3">
          <button
            onClick={onBack}
            aria-label="Înapoi"
            className="w-11 h-11 shrink-0 grid place-items-center rounded-full bg-white/[0.06] border border-white/10 text-zinc-300 hover:text-white transition active:scale-95"
          >
            <ChevronLeft size={20} />
          </button>
          <div className="min-w-0 flex-1">
            <h1 className="text-[22px] font-semibold tracking-tight text-white leading-tight">Bucătărie</h1>
            <p className="text-[13px] text-zinc-400 truncate">
              {newOrders.length} {newOrders.length === 1 ? 'nouă' : 'noi'} · {cooking.length} în preparare
            </p>
          </div>
          <div className="text-right shrink-0">
            <div className="hidden sm:block text-[13px] text-zinc-400 first-letter:uppercase">
              {now.toLocaleDateString('ro-RO', { weekday: 'long', day: 'numeric', month: 'long' })}
            </div>
            <div className="text-[20px] font-semibold text-white tabular-nums leading-tight">{formatTime(now)}</div>
          </div>
          {onLogout && (
            <button
              onClick={onLogout}
              aria-label="Deconectare"
              title="Deconectare"
              className="w-11 h-11 shrink-0 grid place-items-center rounded-full bg-white/[0.06] border border-white/10 text-zinc-400 hover:text-white transition active:scale-95"
            >
              <LogOut size={18} />
            </button>
          )}
        </div>
      </header>

      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 pt-6 pb-[calc(env(safe-area-inset-bottom)+32px)]">
        {newOrders.length === 0 && cooking.length === 0 ? (
          <div className="mt-16 mx-auto max-w-md rounded-[32px] bg-white/[0.05] border border-white/10 backdrop-blur-2xl px-8 py-12 text-center">
            <CheckCircle2 size={48} className="mx-auto text-[#D4EAE6]/70" />
            <p className="mt-4 text-[20px] font-semibold tracking-tight text-white">Nicio comandă activă</p>
            <p className="mt-1 text-[14px] text-zinc-400">Toate comenzile au fost preparate.</p>
          </div>
        ) : (
          // Two lanes, like a kitchen display: accept new tickets on the left, finish cooking on the right.
          <div className="grid gap-8 lg:grid-cols-2 items-start">
            <Column title="Comenzi noi" count={newOrders.length} empty="Nicio comandă nouă">
              {newOrders.map(renderCard)}
            </Column>
            <Column title="În preparare" count={cooking.length} empty="Nimic pe foc acum">
              {cooking.map(renderCard)}
            </Column>
          </div>
        )}
      </main>
    </div>
  );
}
