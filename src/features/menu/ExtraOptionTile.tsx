import { Ban, Check, Plus, UtensilsCrossed } from 'lucide-react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import { Extra } from '../../types';
import { FadeInImage } from '../../components/ui/FadeInImage';

interface Props {
  extra: Extra;
  selected: boolean;
  onToggle: (extra: Extra) => void;
  /**
   * 'ingredient' tiles carry the selection state in the corner badge only once chosen;
   * 'recommended' tiles always show a corner affordance that flips from Plus to Check.
   */
  variant: 'ingredient' | 'recommended';
  disabled?: boolean;
}

/** A "fără ..." extra removes something, so it gets a crossed-out mark instead of a photo. */
const isRemoval = (name: string) => /^f[aă]r[aă]\b/i.test(name.trim());

export default function ExtraOptionTile({ extra, selected, onToggle, variant, disabled = false }: Props) {
  const reduceMotion = useReducedMotion();
  const removal = isRemoval(extra.name);
  const priceLabel = extra.price > 0 ? `+${extra.price} RON` : 'Gratuit';

  return (
    <motion.button
      type="button"
      role="checkbox"
      aria-checked={selected}
      aria-label={`${extra.name}, ${priceLabel}`}
      disabled={disabled}
      onClick={() => onToggle(extra)}
      whileTap={reduceMotion || disabled ? undefined : { scale: 0.95 }}
      transition={{ type: 'spring', stiffness: 400, damping: 26 }}
      className={`snap-start shrink-0 w-[112px] sm:w-[124px] p-2.5 rounded-[24px] text-left border-[0.5px] backdrop-blur-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D4EAE6] focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-900 disabled:opacity-40 ${
        selected
          ? 'bg-[#D4EAE6]/10 border-[#D4EAE6] shadow-[inset_0_1px_1px_rgba(255,255,255,0.12),0_6px_24px_rgba(212,234,230,0.12)]'
          : 'bg-white/[0.06] border-white/15 hover:bg-white/[0.1] hover:border-white/25 shadow-[inset_0_1px_1px_rgba(255,255,255,0.08)]'
      }`}
    >
      <div className="relative">
        <div className="w-full aspect-square rounded-[18px] overflow-hidden bg-zinc-800/60 border-[0.5px] border-white/10">
          {extra.image ? (
            <FadeInImage src={extra.image} alt="" className="w-full h-full" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-zinc-400" aria-hidden="true">
              {removal ? <Ban size={26} strokeWidth={1.5} /> : <UtensilsCrossed size={24} strokeWidth={1.5} />}
            </div>
          )}
          {removal && extra.image && (
            <div className="absolute inset-0 flex items-center justify-center bg-zinc-900/55" aria-hidden="true">
              <Ban size={26} strokeWidth={1.5} className="text-zinc-100" />
            </div>
          )}
        </div>

        {/* Corner state. Recommended tiles always show it; ingredient tiles only once chosen. */}
        <AnimatePresence initial={false}>
          {(selected || variant === 'recommended') && (
            <motion.span
              key={selected ? 'on' : 'off'}
              aria-hidden="true"
              initial={reduceMotion ? false : { scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={reduceMotion ? undefined : { scale: 0.5, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 500, damping: 28 }}
              className={`absolute -top-1.5 -right-1.5 w-7 h-7 rounded-full flex items-center justify-center border-[0.5px] ${
                selected
                  ? 'bg-[#D4EAE6] border-[#D4EAE6] text-zinc-900'
                  : 'bg-zinc-900/80 backdrop-blur-md border-white/25 text-zinc-100'
              }`}
            >
              {selected ? <Check size={15} strokeWidth={3} /> : <Plus size={15} strokeWidth={2.5} />}
            </motion.span>
          )}
        </AnimatePresence>
      </div>

      <p className={`mt-2 text-[12px] leading-tight font-medium line-clamp-2 min-h-[2rem] ${selected ? 'text-white' : 'text-zinc-200'}`}>
        {extra.name}
      </p>
      <p className={`mt-0.5 text-[11px] ${selected ? 'text-[#D4EAE6]' : 'text-zinc-400'}`}>
        {priceLabel}
        {selected && <span className="sr-only"> — selectat</span>}
      </p>
    </motion.button>
  );
}
