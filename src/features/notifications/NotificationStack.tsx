import { BellRing, CheckCircle2, X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { AppNotification } from './useNotifications';

interface Props {
  notifications: AppNotification[];
  onDismiss: (id: number) => void;
}

const TONE = {
  new: { icon: BellRing, ring: 'ring-amber-400/30', chip: 'bg-amber-400/15 text-amber-300' },
  success: { icon: CheckCircle2, ring: 'ring-[#D4EAE6]/30', chip: 'bg-[#D4EAE6]/15 text-[#D4EAE6]' },
} as const;

/** Glass toasts in the top-right corner of a staff screen. Subtle, and never blocking the cards. */
export default function NotificationStack({ notifications, onDismiss }: Props) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed top-[calc(env(safe-area-inset-top)+16px)] inset-x-4 sm:inset-x-auto sm:right-6 z-50 flex flex-col items-stretch sm:items-end gap-2 pointer-events-none"
    >
      <AnimatePresence initial={false}>
        {notifications.map(({ id, title, detail, tone }) => {
          const { icon: Icon, ring, chip } = TONE[tone];
          return (
            <motion.div
              key={id}
              layout
              initial={{ opacity: 0, y: -12, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.97 }}
              transition={{ type: 'spring', stiffness: 400, damping: 32, opacity: { duration: 0.15 } }}
              className={`pointer-events-auto w-full sm:w-[340px] flex items-start gap-3 rounded-[24px] bg-zinc-900/85 backdrop-blur-2xl border border-white/10 ring-1 ${ring} shadow-[0_12px_40px_rgba(0,0,0,0.5)] px-4 py-3.5`}
            >
              <span className={`w-9 h-9 shrink-0 grid place-items-center rounded-full ${chip}`}>
                <Icon size={18} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[14px] font-semibold text-white leading-snug">{title}</p>
                {detail && <p className="text-[12px] text-zinc-400 mt-0.5 truncate">{detail}</p>}
              </div>
              <button
                type="button"
                onClick={() => onDismiss(id)}
                aria-label="Închide notificarea"
                className="w-8 h-8 shrink-0 grid place-items-center rounded-full text-zinc-500 hover:text-white hover:bg-white/10 transition-colors"
              >
                <X size={15} />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
