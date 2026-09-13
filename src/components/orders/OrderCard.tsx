import { ReactNode } from 'react';
import { Clock } from 'lucide-react';
import { motion } from 'motion/react';
import { Order, OrderType, PaymentMethod } from '../../types';
import { formatTime, minutesSince } from '../../lib/format';
import { EASE_OUT } from '../../lib/motion';

// Order card for the kitchen and admin screens. The courier app has its own card (features/courier).
interface Props {
  order: Order;
  variant?: 'default' | 'highlighted';
  /** `compact` fits more tickets on a kitchen tablet: the same information with tighter spacing and type. */
  density?: 'comfortable' | 'compact';
  showItems?: boolean;
  showTotal?: boolean;
  actionButtons?: ReactNode;
  statusBadgeLabel?: string;
  delay?: number;
}

const TYPE_LABEL: Record<OrderType, string> = { livrare: 'Livrare', ridicare: 'Ridicare' };
const PAYMENT_LABEL: Record<PaymentMethod, string> = { card: 'Card', cash: 'Numerar' };

const SIZES = {
  comfortable: {
    frame: 'rounded-[32px] p-5',
    header: 'mb-4 pb-4 gap-4',
    badge: 'text-[10px] px-2.5 py-1 mb-3',
    name: 'text-xl sm:text-2xl mb-1',
    placed: 'text-[13px]',
    timer: 'text-xl sm:text-2xl gap-1.5',
    timerIcon: 20,
    total: 'text-xl',
    items: 'mb-6 text-base sm:text-lg space-y-4',
    row: 'gap-4',
    qty: 'px-3 py-1 rounded-xl',
    extras: 'text-sm mt-1.5',
    footer: 'pt-2',
  },
  compact: {
    frame: 'rounded-card p-3.5',
    header: 'mb-3 pb-3 gap-3',
    badge: 'text-[9px] px-2 py-0.5 mb-1.5 max-w-full truncate whitespace-nowrap align-top',
    name: 'text-[17px] leading-tight',
    placed: 'text-[12px] mt-0.5',
    timer: 'text-[17px] gap-1',
    timerIcon: 15,
    total: 'text-[17px]',
    items: 'mb-3 text-[14px] space-y-2',
    row: 'gap-2.5',
    qty: 'min-w-[34px] text-center px-1.5 py-0.5 rounded-lg text-[13px]',
    extras: 'text-[12px] mt-0.5',
    footer: 'pt-0.5',
  },
} as const;

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
  density = 'comfortable',
  showItems = true,
  showTotal = false,
  actionButtons,
  statusBadgeLabel,
  delay = 0
}: Props) {

  const isHighlighted = variant === 'highlighted';
  const size = SIZES[density];

  const accentColor = isHighlighted ? 'text-amber-400' : 'text-[#D4EAE6]';
  const badgeBg = isHighlighted ? 'bg-amber-400/10' : 'bg-[#D4EAE6]/10';
  // New tickets get a feathered amber glow rather than a hard outline.
  const frameClass = isHighlighted
    ? 'border-white/[0.04] shadow-[0_8px_32px_rgba(0,0,0,0.35),0_0_48px_-16px_rgba(251,191,36,0.35)]'
    : 'border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.35)]';

  const elapsed = minutesSince(order.createdAt);
  // A compact ticket is narrow: the payment method matters to the courier, not the cook, so it's
  // left out there and the badge stays on one line next to the timer.
  const payment = density === 'comfortable' && order.paymentMethod && PAYMENT_LABEL[order.paymentMethod];
  const badgeText = statusBadgeLabel
    || [`#${order.id.replace('ORD-', '')}`, TYPE_LABEL[order.type], payment]
      .filter(Boolean).join(' · ');

  return (
    <motion.div
      initial={{ opacity: 0, y: 12, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.28, ease: EASE_OUT, delay: delay * 0.04 }}
      className={`bg-white/[0.07] backdrop-blur-2xl border flex flex-col transition-colors ${size.frame} ${frameClass}`}
    >
      {/* Header */}
      <div className={`flex justify-between items-start border-b border-white/10 ${size.header}`}>
        <div className="min-w-0">
          <span className={`inline-block font-bold tracking-wider uppercase rounded-full ${size.badge} ${accentColor} ${badgeBg}`}>
            {badgeText}
          </span>
          <h3 className={`font-sans font-semibold tracking-tight text-white truncate ${size.name}`}>{order.customerName}</h3>
          <p className={`text-zinc-400 ${size.placed}`}>Plasată la {formatTime(order.createdAt)}
            {isScheduled(order.time) && <> · <span className="text-zinc-200 font-medium">Pentru {order.time}</span></>}</p>
        </div>

        {showTotal ? (
          <div className="text-right shrink-0">
            <span className={`font-sans font-bold block ${accentColor} ${size.total}`}>{order.total} RON</span>
          </div>
        ) : (
          <div
            className={`flex items-center shrink-0 font-semibold tabular-nums ${size.timer} ${timerClass(elapsed)}`}
            title="Timp de la plasarea comenzii"
          >
            <Clock size={size.timerIcon} />
            {elapsed} min
          </div>
        )}
      </div>

      {showItems && (
        <div className="flex-1">
          <ul className={`text-zinc-200 ${size.items}`}>
            {order.items.map(item => (
              <li key={item.id} className={`flex items-start ${size.row}`}>
                <span className={`font-bold tabular-nums border ${size.qty} ${isHighlighted ? 'bg-amber-400/10 text-amber-400 border-amber-400/20' : 'bg-white/5 text-[#D4EAE6] border-white/10'}`}>
                  {item.quantity}×
                </span>
                <div className="flex-1 min-w-0 mt-0.5">
                  <span className="text-white font-medium block leading-tight">{item.menuItem.name}</span>
                  {item.selectedExtras.length > 0 && (
                    <span className={`text-zinc-400 block ${size.extras}`}>
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
        <div className={`mt-auto ${size.footer} ${!showItems ? 'border-t border-white/10 pt-6' : ''}`}>
          {actionButtons}
        </div>
      )}
    </motion.div>
  );
}
