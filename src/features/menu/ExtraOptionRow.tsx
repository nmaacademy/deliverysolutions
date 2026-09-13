import { Ban, Check, Plus } from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';
import { Extra } from '../../types';
import { FadeInImage } from '../../components/ui/FadeInImage';

interface Props {
  extra: Extra;
  selected: boolean;
  onToggle: (extra: Extra) => void;
  disabled?: boolean;
}

/** A "fără ..." extra takes something out of the dish instead of adding to it. */
export const isRemoval = (name: string) => /^f[aă]r[aă]\b/i.test(name.trim());

/**
 * One option on the product page as a plain checklist row, the Glovo / Bolt Food pattern: thumbnail,
 * name, price and a round check on the right. Rows are separated by hairlines and never boxed.
 */
export default function ExtraOptionRow({ extra, selected, onToggle, disabled = false }: Props) {
  const reduceMotion = useReducedMotion();
  const removal = isRemoval(extra.name);
  const priceLabel = extra.price > 0 ? `+${extra.price} RON` : null;

  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={selected}
      aria-label={`${extra.name}, ${priceLabel ?? 'gratuit'}`}
      disabled={disabled}
      onClick={() => onToggle(extra)}
      className="group w-full flex items-center gap-3.5 min-h-[64px] py-2.5 text-left rounded-tile transition-opacity disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D4EAE6]"
    >
      <span className="relative w-12 h-12 shrink-0 grid place-items-center rounded-tile overflow-hidden bg-white/[0.05] text-zinc-400">
        {extra.image ? (
          <FadeInImage src={extra.image} alt="" className="w-full h-full" />
        ) : removal ? (
          <Ban size={20} strokeWidth={1.75} aria-hidden />
        ) : (
          <Plus size={20} strokeWidth={1.75} aria-hidden />
        )}
        {removal && extra.image && (
          <span className="absolute inset-0 grid place-items-center bg-zinc-900/55" aria-hidden>
            <Ban size={20} strokeWidth={1.75} className="text-zinc-100" />
          </span>
        )}
      </span>

      <span className={`min-w-0 flex-1 text-[15px] leading-snug ${selected ? 'text-white font-medium' : 'text-zinc-200'}`}>
        {extra.name}
      </span>

      {priceLabel && (
        <span className={`shrink-0 text-[14px] tabular-nums ${selected ? 'text-[#D4EAE6]' : 'text-zinc-400'}`}>
          {priceLabel}
        </span>
      )}

      <span
        aria-hidden
        className={`w-6 h-6 shrink-0 grid place-items-center rounded-full border transition-colors duration-150 ${
          selected ? 'bg-[#D4EAE6] border-[#D4EAE6] text-zinc-900' : 'border-white/25 text-transparent group-hover:border-white/40'
        }`}
      >
        <motion.span
          initial={false}
          animate={{ scale: selected ? 1 : 0.4, opacity: selected ? 1 : 0 }}
          transition={reduceMotion ? { duration: 0 } : { type: 'spring', stiffness: 600, damping: 30 }}
          className="grid place-items-center"
        >
          <Check size={14} strokeWidth={3} />
        </motion.span>
      </span>
    </button>
  );
}
