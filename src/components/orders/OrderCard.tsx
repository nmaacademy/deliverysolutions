import { ReactNode } from 'react';
import { Clock } from 'lucide-react';
import { motion } from 'motion/react';
import { Order, OrderType, PaymentMethod } from '../../types';
import { formatTime, minutesSince } from '../../lib/format';

// Order card for the kitchen and admin screens. The courier app has its own card (features/courier).
interface Props {
  order: Order;
  variant?: 'default' | 'highlighted';
  showItems?: boolean;
  showTotal?: boolean;
  actionButtons?: ReactNode;
  statusBadgeLabel?: string;
  delay?: number;
}

const TYPE_LABEL: Record<OrderType, string> = { livrare: 'Livrare', ridicare: 'Ridicare' };
const PAYMENT_LABEL: Record<PaymentMethod, string> = { card: 'Card', cash: 'Numerar' };

// Kitchen timer: neutral while fresh, amber once a ticket has waited 10 min, red at 20.
function timerClass(minutes: number) {
  if (minutes >= 20) return 'text-red-400';
  if (minutes >= 10) return 'text-amber-300';
  return 'text-zinc-200';
}

// ASAP is the default, so only scheduled orders mention their time.
const isScheduled = (time: string) => !time.startsWith('Cât mai repede');

export default function OrderCard({
  order,
  variant = 'default',
  showItems = true,
  showTotal = false,
  actionButtons,
  statusBadgeLabel,
  delay = 0
}: Props) {

  const isHighlighted = variant === 'highlighted';

  const accentColor = isHighlighted ? 'text-amber-400' : 'text-[#D4EAE6]';
  const badgeBg = isHighlighted ? 'bg-amber-400/10' : 'bg-[#D4EAE6]/10';
  // New tickets get a feathered amber glow rather than a hard outline.
  const frameClass = isHighlighted
    ? 'border-white/[0.04] shadow-[0_8px_32px_rgba(0,0,0,0.35),0_0_48px_-16px_rgba(251,191,36,0.35)]'
    : 'border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.35)]';

  const elapsed = minutesSince(order.createdAt);
  const badgeText = statusBadgeLabel
    || [`#${order.id.replace('ORD-', '')}`, TYPE_LABEL[order.type], order.paymentMethod && PAYMENT_LABEL[order.paymentMethod]]
      .filter(Boolean).join(' · ');

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.3, delay: delay * 0.05 }}
      className={`bg-white/[0.07] backdrop-blur-2xl border rounded-[32px] p-5 flex flex-col transition-colors ${frameClass}`}
    >
      {/* Header */}
      <div className="flex justify-between items-start mb-4 pb-4 border-b border-white/10 gap-4">
        <div className="min-w-0">
          <span className={`inline-block text-[10px] font-bold tracking-wider uppercase px-2.5 py-1 rounded-full mb-3 ${accentColor} ${badgeBg}`}>
            {badgeText}
          </span>
          <h3 className="font-sans font-semibold tracking-tight text-white text-xl sm:text-2xl mb-1 truncate">{order.customerName}</h3>
          <p className="text-[13px] text-zinc-400">Plasată la {formatTime(order.createdAt)}
            {isScheduled(order.time) && <> · <span className="text-zinc-200 font-medium">Pentru {order.time}</span></>}</p>
        </div>

        {showTotal ? (
          <div className="text-right shrink-0">
            <span className={`font-sans font-bold ${accentColor} text-xl block`}>{order.total} RON</span>
          </div>
        ) : (
          <div
            className={`flex items-center gap-1.5 shrink-0 font-semibold text-xl sm:text-2xl tabular-nums ${timerClass(elapsed)}`}
            title="Timp de la plasarea comenzii"
          >
            <Clock size={20} />
            {elapsed} min
          </div>
        )}
      </div>

      {showItems && (
        <div className="mb-6 flex-1">
          <ul className="text-base sm:text-lg text-zinc-200 space-y-4">
            {order.items.map(item => (
              <li key={item.id} className="flex gap-4 items-start">
                <span className={`font-bold tabular-nums px-3 py-1 rounded-xl border ${isHighlighted ? 'bg-amber-400/10 text-amber-400 border-amber-400/20' : 'bg-white/5 text-[#D4EAE6] border-white/10'}`}>
                  {item.quantity}×
                </span>
                <div className="flex-1 mt-0.5">
                  <span className="text-white font-medium block leading-tight">{item.menuItem.name}</span>
                  {item.selectedExtras.length > 0 && (
                    <span className="text-zinc-400 text-sm block mt-1.5">
                      + {item.selectedExtras.map(e => e.name).join(', ')}
                    </span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Footer / Actions */}
      {(actionButtons || !showItems) && (
        <div className={`mt-auto pt-2 ${!showItems ? 'border-t border-white/10 pt-6' : ''}`}>
          {actionButtons}
        </div>
      )}
    </motion.div>
  );
}
