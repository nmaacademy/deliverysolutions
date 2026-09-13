import { ChevronRight } from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { Order } from '../../types';
import { shortOrderId } from '../../lib/format';
import { SPRING_SNAPPY, SWAP } from '../../lib/motion';
import { FadeInImage } from '../../components/ui/FadeInImage';
import { STATUS_ICONS, statusMessage, trackerSubtitle, trackerProgress, TRACKER_PHASE_COUNT } from './orderStatus';

interface Props {
  order: Order;
  onOpen: () => void;
}

/**
 * A slim frosted-glass pill pinned at the top of the customer app, keeping a placed order one tap away.
 * The glass is only lightly tinted, so the page scrolling underneath stays visible through it.
 */
export default function ActiveOrderTracker({ order, onOpen }: Props) {
  const reduceMotion = useReducedMotion();
  const refused = order.status === 'Refuzată';
  const progress = trackerProgress(order);
  const Icon = STATUS_ICONS[order.status];
  const shortId = shortOrderId(order.id);
  const message = statusMessage(order);
  const image = order.items[0]?.menuItem.image;

  return (
    <motion.button
      type="button"
      onClick={onOpen}
      aria-label={`Comanda #${shortId}: ${message}. Vezi detalii`}
      whileTap={reduceMotion ? undefined : { scale: 0.97 }}
      whileHover={reduceMotion ? undefined : { scale: 1.01 }}
      transition={SPRING_SNAPPY}
      className="w-full flex items-center gap-2.5 pl-1.5 pr-2.5 py-1.5 rounded-full text-left text-white bg-zinc-900/30 backdrop-blur-xl backdrop-saturate-150 glass-float hover:bg-zinc-900/40 transition-colors [text-shadow:0_1px_2px_rgb(0_0_0/0.35)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D4EAE6]"
    >
      <span className="relative shrink-0">
        {image ? (
          <FadeInImage src={image} alt="" className="w-9 h-9 rounded-full bg-zinc-700" imageClassName={refused ? 'grayscale opacity-60' : ''} />
        ) : (
          <span className="block w-9 h-9 rounded-full bg-zinc-700" />
        )}
        {/* Pops each time the status changes, so a change is noticed even out of the corner of an eye. */}
        <motion.span
          key={order.status}
          aria-hidden
          initial={reduceMotion ? false : { scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', duration: 0.4, bounce: 0.3 }}
          className={`absolute -bottom-0.5 -right-0.5 w-4 h-4 grid place-items-center rounded-full ring-2 ring-zinc-900/80 ${
            refused ? 'bg-red-500 text-white' : 'bg-[#D4EAE6] text-zinc-900'
          }`}
        >
          <Icon size={9} strokeWidth={3} />
        </motion.span>
      </span>

      <span className="flex-1 min-w-0">
        {/* The headline swaps with a soft rise and blur as the kitchen and the courier move the order along. */}
        <span className="block relative h-4 overflow-hidden">
          <AnimatePresence mode="wait" initial={false}>
            <motion.span
              key={order.status}
              initial={{ opacity: 0, y: 8, filter: 'blur(3px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              exit={{ opacity: 0, y: -8, filter: 'blur(3px)' }}
              transition={SWAP}
              className="block text-[13px] font-semibold leading-4 truncate"
            >
              {message}
            </motion.span>
          </AnimatePresence>
        </span>
        <span className={`block text-[11px] leading-[14px] mt-px truncate ${refused ? 'text-red-300' : 'text-zinc-300'}`}>
          {trackerSubtitle(order)}
        </span>
        {!refused && (
          <span aria-hidden className="mt-1 flex gap-1">
            {Array.from({ length: TRACKER_PHASE_COUNT }, (_, i) => (
              <span key={i} className="relative h-[2px] flex-1 rounded-full bg-white/20 overflow-hidden">
                {i < progress.phase && <span className="absolute inset-0 bg-[#D4EAE6]" />}
                {i === progress.phase && (
                  <>
                    {/* The phase in progress keeps filling; steps already done inside it stay solid. */}
                    <span className="absolute inset-0 origin-left bg-[#D4EAE6]/50 animate-tracker-fill motion-reduce:animate-none motion-reduce:scale-x-50" />
                    {progress.fraction > 0 && (
                      <span className="absolute inset-y-0 left-0 bg-[#D4EAE6] rounded-full" style={{ width: `${progress.fraction * 100}%` }} />
                    )}
                  </>
                )}
              </span>
            ))}
          </span>
        )}
      </span>

      <span className="shrink-0 flex items-center text-zinc-300/80">
        <span className="text-[9px] font-bold uppercase tracking-wider tabular-nums">#{shortId}</span>
        <ChevronRight size={16} />
      </span>
    </motion.button>
  );
}
