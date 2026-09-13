import { AnimatePresence, motion } from 'motion/react';
import { Check, X } from 'lucide-react';
import { Order } from '../../types';
import { ORDER_STEPS } from '../../lib/orderFlow';
import { STATUS_ICONS, statusLabel, statusMessage, isFinished } from './orderStatus';

interface Props {
  order: Order;
  onBackToMenu: () => void;
}

/**
 * The customer's tracking page: read-only. Statuses only move when the kitchen or the courier act,
 * and the change arrives here through the cross-tab sync.
 */
export default function ConfirmationScreen({ order, onBackToMenu }: Props) {
  const steps = ORDER_STEPS[order.type];
  const currentStepIndex = steps.indexOf(order.status);
  const finished = isFinished(order);

  if (order.status === 'Refuzată') {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 sm:py-24 flex flex-col items-center min-h-[100svh]">
        <motion.div
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
          className="w-20 h-20 sm:w-24 sm:h-24 bg-red-400/15 rounded-full flex items-center justify-center text-red-300 mb-8 sm:mb-10"
        >
          <X size={40} strokeWidth={1.5} />
        </motion.div>
        <h2 className="text-3xl sm:text-4xl font-sans font-semibold tracking-tight text-white mb-3 text-center">Comandă refuzată</h2>
        <p className="text-zinc-300 mb-10 sm:mb-12 text-center text-sm sm:text-lg">
          Ne pare rău, {order.customerName}. Restaurantul nu poate prelua acum comanda #{order.id}.
          {order.paymentMethod === 'card' && ` Suma de ${order.total} RON îți va fi returnată pe card.`}
        </p>
        <button
          onClick={onBackToMenu}
          className="w-full min-h-[44px] bg-[#D4EAE6] text-zinc-900 py-3 sm:py-4 rounded-[32px] font-medium hover:bg-[#B8D6D1] transition active:scale-[0.98]"
        >
          Înapoi la meniu
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto px-4 py-16 sm:py-24 flex flex-col items-center min-h-[100svh]">
      <motion.div
        initial={{ scale: 0.6, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        className="w-20 h-20 sm:w-24 sm:h-24 bg-[#D4EAE6] rounded-full flex items-center justify-center text-zinc-900 mb-8 sm:mb-10 shadow-lg shadow-[#D4EAE6]/20"
      >
        <Check size={40} strokeWidth={1.5} className="sm:hidden" />
        <Check size={48} strokeWidth={1.5} className="hidden sm:block" />
      </motion.div>

      <h2 className="text-3xl sm:text-4xl font-sans font-semibold tracking-tight text-white mb-3 text-center">
        {finished ? `Comandă ${order.type === 'livrare' ? 'livrată' : 'ridicată'}` : 'Comandă confirmată'}
      </h2>
      {/* Live status line: it swaps with a soft fade whenever the kitchen or the courier moves the order. */}
      <div className="min-h-[3.5rem] sm:min-h-[4rem] mb-8 sm:mb-10 w-full grid [grid-template-areas:'status'] place-items-center">
        <AnimatePresence mode="wait">
          <motion.p
            key={order.status}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="[grid-area:status] text-center text-base sm:text-xl font-medium text-[#D4EAE6]"
          >
            {statusMessage(order)}
          </motion.p>
        </AnimatePresence>
      </div>

      <p className="text-zinc-400 mb-10 sm:mb-12 text-center text-sm sm:text-base">
        {finished
          ? `Poftă bună, ${order.customerName}! Mulțumim pentru comanda #${order.id}.`
          : `Mulțumim, ${order.customerName}. Comanda #${order.id} este urmărită în timp real.`}
      </p>

      <div className="bg-zinc-800 rounded-[28px] p-6 sm:p-8 border border-zinc-700 w-full mb-8 sm:mb-10">
        <div className="flex justify-between items-center mb-8 sm:mb-10 pb-6 sm:pb-8 border-b border-zinc-700/60">
          <div>
            <p className="text-[10px] sm:text-xs uppercase tracking-wider font-semibold text-zinc-400 mb-1 sm:mb-2">Timp estimat</p>
            <p className="font-medium text-zinc-100 text-lg sm:text-xl">{order.time}</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] sm:text-xs uppercase tracking-wider font-semibold text-zinc-400 mb-1 sm:mb-2">Total</p>
            <p className="font-sans font-semibold tracking-tight text-[#D4EAE6] text-xl sm:text-2xl">{order.total} RON</p>
          </div>
        </div>

        <div className="relative pl-1 sm:pl-2">
          <div className="absolute left-[26px] sm:left-8 top-6 bottom-6 w-px bg-zinc-700"></div>

          <div className="space-y-8 sm:space-y-10">
            {steps.map((status, index) => {
              const isActive = index <= currentStepIndex;
              const isCurrent = index === currentStepIndex;
              const Icon = STATUS_ICONS[status];

              return (
                <div key={status} className="flex items-center relative z-10">
                  <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center shrink-0 transition-colors duration-700 ${isActive ? 'bg-[#D4EAE6] text-zinc-900' : 'bg-zinc-900 border border-zinc-700 text-zinc-500'}`}>
                    <Icon size={20} />
                  </div>
                  <div className="ml-5 sm:ml-6">
                    <p className={`font-medium text-base sm:text-lg transition-colors duration-700 ${isActive ? 'text-zinc-100' : 'text-zinc-500'}`}>{statusLabel(order, status)}</p>
                    {isCurrent && index < steps.length - 1 && (
                      <p className="text-xs sm:text-sm text-[#D4EAE6] mt-1 font-medium">Status actual</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 w-full pb-8">
        <button
          onClick={onBackToMenu}
          className="flex-1 min-h-[44px] bg-[#D4EAE6] text-zinc-900 py-3 sm:py-4 rounded-[32px] font-medium hover:bg-[#B8D6D1] transition active:scale-[0.98]"
        >
          Înapoi la meniu
        </button>
      </div>
    </div>
  );
}
