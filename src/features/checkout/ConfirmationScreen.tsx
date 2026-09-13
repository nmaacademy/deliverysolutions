import { AnimatePresence, motion } from 'motion/react';
import { Check, ChevronLeft, Clock, CreditCard, LucideIcon, MapPin, Wallet } from 'lucide-react';
import { Order } from '../../types';
import { ORDER_STEPS } from '../../lib/orderFlow';
import { formatTime, shortOrderId } from '../../lib/format';
import { lineTotal } from '../../lib/pricing';
import { EASE_OUT, ENTER, SWAP, revealOnMount, riseItem, staggerGroup } from '../../lib/motion';
import { FadeInImage } from '../../components/ui/FadeInImage';
import { STATUS_ICONS, statusLabel, statusMessage, isFinished, trackerSubtitle } from './orderStatus';

interface Props {
  order: Order;
  onBackToMenu: () => void;
}

function DetailRow({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2.5">
      <Icon size={15} className="text-zinc-500 shrink-0 mt-0.5" aria-hidden />
      <span className="text-zinc-400 shrink-0">{label}</span>
      <span className="flex-1 min-w-0 text-right text-zinc-200 truncate">{value}</span>
    </div>
  );
}

/**
 * The customer's tracking page, read-only: statuses only move when the kitchen or the courier act,
 * and the change arrives here through the cross-tab sync.
 *
 * Built around what someone opening it wants to know, in that order, all on the first screen of a
 * phone: what is happening right now and when it arrives, how far along it is, then what was
 * ordered. The way back stays pinned at the bottom, so nobody has to scroll to leave.
 */
export default function ConfirmationScreen({ order, onBackToMenu }: Props) {
  const refused = order.status === 'Refuzată';
  const finished = isFinished(order);
  const steps = ORDER_STEPS[order.type];
  const current = steps.indexOf(order.status);
  const Icon = STATUS_ICONS[order.status];
  const shortId = shortOrderId(order.id);

  const headline = refused
    ? 'Comandă refuzată'
    : finished
      ? `Comandă ${order.type === 'livrare' ? 'livrată' : 'ridicată'}`
      : statusMessage(order);
  const subline = refused
    ? `Ne pare rău, ${order.customerName}. Restaurantul nu poate prelua acum comanda.${
        order.paymentMethod === 'card' ? ` Suma de ${order.total} RON îți va fi returnată pe card.` : ''
      }`
    : trackerSubtitle(order);

  return (
    <div className="min-h-[100svh] pb-[calc(env(safe-area-inset-bottom)+104px)]">
      {/* Top bar: the way back and which order this is. */}
      <header className="sticky top-0 z-20 bg-zinc-900/70 backdrop-blur-2xl border-b border-white/[0.06] pt-[env(safe-area-inset-top)]">
        <div className="relative max-w-xl mx-auto h-14 px-2 sm:px-4 flex items-center">
          <button
            type="button"
            onClick={onBackToMenu}
            className="min-h-[44px] px-2 inline-flex items-center gap-0.5 rounded-full text-[#D4EAE6] font-medium hover:text-white transition active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D4EAE6]"
          >
            <ChevronLeft size={22} />
            Meniu
          </button>
          <h1 className="absolute left-1/2 -translate-x-1/2 text-[16px] font-semibold tracking-tight text-white tabular-nums">
            Comanda #{shortId}
          </h1>
        </div>
      </header>

      <motion.main variants={staggerGroup(0.05, 0.04)} {...revealOnMount} className="max-w-xl mx-auto px-4 pt-6 flex flex-col gap-4">
        {/* 1. What is happening right now, and when it arrives. */}
        <motion.section variants={riseItem} aria-live="polite" className="flex flex-col items-center text-center px-2 pb-2">
          <div className="relative mb-4">
            {!finished && (
              <motion.span
                aria-hidden
                className="absolute inset-0 rounded-full bg-[#D4EAE6]/40"
                animate={{ scale: [1, 1.7], opacity: [0.5, 0] }}
                transition={{ duration: 1.8, repeat: Infinity, ease: 'easeOut' }}
              />
            )}
            <motion.span
              key={order.status}
              initial={{ scale: 0.6, rotate: -20, opacity: 0 }}
              animate={{ scale: 1, rotate: 0, opacity: 1 }}
              transition={{ type: 'spring', duration: 0.5, bounce: 0.3 }}
              className={`relative w-[72px] h-[72px] grid place-items-center rounded-full ${
                refused ? 'bg-red-400/15 text-red-300' : 'bg-[#D4EAE6] text-zinc-900 glow-opal'
              }`}
            >
              <Icon size={32} strokeWidth={1.75} />
            </motion.span>
          </div>

          <AnimatePresence mode="wait" initial={false}>
            <motion.h2
              key={headline}
              initial={{ opacity: 0, y: 10, filter: 'blur(4px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              exit={{ opacity: 0, y: -10, filter: 'blur(4px)' }}
              transition={SWAP}
              className="text-[22px] sm:text-[26px] font-semibold tracking-tight leading-tight text-white text-balance"
            >
              {headline}
            </motion.h2>
          </AnimatePresence>
          <p className={`mt-1.5 text-[14px] ${refused ? 'text-zinc-300' : 'text-zinc-400'} tabular-nums`}>{subline}</p>
        </motion.section>

        {/* 2. How far along it is. */}
        {!refused && (
          <motion.section variants={riseItem} aria-label="Etapele comenzii" className="rounded-card bg-white/[0.05] glass-edge px-5 py-4">
            <ol>
              {steps.map((status, index) => {
                const done = index < current;
                const isCurrent = index === current;
                const reached = done || isCurrent;
                const StepIcon = STATUS_ICONS[status];
                return (
                  <li key={status} className="relative flex items-center gap-3 min-h-[44px]">
                    {index < steps.length - 1 && (
                      <span aria-hidden className="absolute left-[15px] top-[38px] h-3 w-[2px] rounded-full bg-white/10 overflow-hidden">
                        <motion.span
                          className="absolute inset-0 bg-[#D4EAE6] origin-top"
                          initial={false}
                          animate={{ scaleY: done ? 1 : 0 }}
                          transition={{ duration: 0.5, ease: EASE_OUT }}
                        />
                      </span>
                    )}
                    <motion.span
                      initial={false}
                      animate={{ scale: isCurrent && !finished ? 1.12 : 1 }}
                      transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                      className={`relative w-8 h-8 shrink-0 grid place-items-center rounded-full transition-colors duration-500 ${
                        reached ? 'bg-[#D4EAE6] text-zinc-900' : 'bg-zinc-900 border border-white/15 text-zinc-500'
                      } ${isCurrent && !finished ? 'glow-opal' : ''}`}
                    >
                      <StepIcon size={15} />
                    </motion.span>
                    <span className={`flex-1 min-w-0 text-[14px] ${reached ? 'text-zinc-100' : 'text-zinc-500'} ${isCurrent ? 'font-semibold' : ''}`}>
                      {statusLabel(order, status)}
                    </span>
                    {isCurrent && !finished && (
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#D4EAE6]">Acum</span>
                    )}
                    {done && <Check size={14} className="text-zinc-500" aria-label="Finalizat" />}
                  </li>
                );
              })}
            </ol>
          </motion.section>
        )}

        {/* 3. What was ordered, and the practical details. */}
        <motion.section variants={riseItem} className="rounded-card bg-white/[0.05] glass-edge p-5">
          <h3 className="text-[14px] font-semibold tracking-tight text-white mb-3">Ce ai comandat</h3>
          <ul className="flex flex-col gap-3">
            {order.items.map(cartItem => (
              <li key={cartItem.id} className="flex items-center gap-3">
                <FadeInImage src={cartItem.menuItem.image} alt="" className="w-12 h-12 shrink-0 rounded-tile bg-zinc-800" />
                <span className="flex-1 min-w-0">
                  <span className="block text-[14px] text-zinc-100 truncate">{cartItem.menuItem.name}</span>
                  {cartItem.selectedExtras.length > 0 && (
                    <span className="block text-[12px] text-zinc-500 truncate">{cartItem.selectedExtras.map(e => e.name).join(', ')}</span>
                  )}
                </span>
                <span className="text-[13px] text-zinc-500 tabular-nums">×{cartItem.quantity}</span>
                <span className="w-[72px] text-right text-[14px] text-zinc-100 tabular-nums">{lineTotal(cartItem)} RON</span>
              </li>
            ))}
          </ul>

          <div className="mt-4 pt-4 border-t border-white/10 flex flex-col gap-2 text-[13px]">
            {order.type === 'livrare' && order.address && <DetailRow icon={MapPin} label="Livrare la" value={order.address} />}
            <DetailRow icon={Clock} label="Plasată la" value={formatTime(order.createdAt)} />
            {order.paymentMethod && (
              <DetailRow
                icon={order.paymentMethod === 'card' ? CreditCard : Wallet}
                label="Plată"
                value={order.paymentMethod === 'card' ? 'Card online' : 'Numerar'}
              />
            )}
            <div className="flex items-baseline justify-between pt-2 text-[15px]">
              <span className="text-zinc-300">Total</span>
              <span className="text-[18px] font-semibold text-[#D4EAE6] tabular-nums">{order.total} RON</span>
            </div>
          </div>
        </motion.section>
      </motion.main>

      {/* The way back, always within reach. */}
      <motion.div
        initial={{ opacity: 0, transform: 'translateY(24px)' }}
        animate={{ opacity: 1, transform: 'translateY(0px)' }}
        transition={{ ...ENTER, delay: 0.1 }}
        className="fixed inset-x-0 bottom-0 z-20 px-4 pt-6 pb-[max(16px,env(safe-area-inset-bottom))] bg-gradient-to-t from-zinc-900 via-zinc-900/90 to-transparent"
      >
        <div className="max-w-xl mx-auto">
          <motion.button
            type="button"
            whileTap={{ scale: 0.97 }}
            onClick={onBackToMenu}
            className="w-full h-[52px] rounded-full bg-[#D4EAE6] text-zinc-900 font-semibold glow-opal hover:bg-[#B8D6D1] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D4EAE6] focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-900"
          >
            Înapoi la meniu
          </motion.button>
        </div>
      </motion.div>
    </div>
  );
}
