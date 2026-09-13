import { Minus, Plus } from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';
import { SPRING_SNAPPY } from '../../lib/motion';

interface Props {
  quantity: number;
  min?: number;
  max: number;
  onChange: (next: number) => void;
  disabled?: boolean;
}

/** Compact minus / value / plus pill. Both ends stay 44×44 so they remain comfortable to tap. */
export default function QuantityControl({ quantity, min = 1, max, onChange, disabled = false }: Props) {
  const reduceMotion = useReducedMotion();
  const canDecrease = !disabled && quantity > min;
  const canIncrease = !disabled && quantity < max;

  const step = (delta: number) => {
    // Clamped here rather than in the caller, so a burst of fast taps can never land out of range.
    const next = Math.min(max, Math.max(min, quantity + delta));
    if (next !== quantity) onChange(next);
  };

  const button = 'min-h-[44px] min-w-[44px] flex items-center justify-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D4EAE6] disabled:opacity-30 disabled:cursor-not-allowed';

  return (
    <div className="flex items-center bg-white/[0.06] glass-edge rounded-full px-1">
      <motion.button
        type="button"
        aria-label="Scade cantitatea"
        disabled={!canDecrease}
        onClick={() => step(-1)}
        whileTap={reduceMotion || !canDecrease ? undefined : { scale: 0.9 }}
        transition={SPRING_SNAPPY}
        className={`${button} text-zinc-300 hover:text-white`}
      >
        <Minus size={16} strokeWidth={2.5} />
      </motion.button>

      <span className="w-7 text-center font-medium text-white tabular-nums" aria-live="polite">
        {quantity}
      </span>

      <motion.button
        type="button"
        aria-label="Crește cantitatea"
        disabled={!canIncrease}
        onClick={() => step(1)}
        whileTap={reduceMotion || !canIncrease ? undefined : { scale: 0.9 }}
        transition={SPRING_SNAPPY}
        className={`${button} text-zinc-300 hover:text-white`}
      >
        <Plus size={16} strokeWidth={2.5} />
      </motion.button>
    </div>
  );
}
