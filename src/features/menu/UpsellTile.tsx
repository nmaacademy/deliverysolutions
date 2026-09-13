import { Check, Plus, UtensilsCrossed } from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { FadeInImage } from '../../components/ui/FadeInImage';

interface Props {
  image?: string;
  name: string;
  /** Already formatted, e.g. "+12 RON" for an add-on or "45 RON" for a dish. */
  priceLabel: string;
  /** Accessible name for the whole tile. */
  label: string;
  onPress: () => void;
  /** Set for add-ons that toggle on and off; leave it out for one-tap "add to cart" suggestions. */
  selected?: boolean;
  disabled?: boolean;
}

/**
 * An upsell tile ("Ți-ar plăcea și astea"): a large photo with a round add button on it, the name and
 * the price underneath, and no card around it. Deliberately a different shape from the customisation
 * checklist, so things to add read as suggestions rather than as settings of the dish.
 */
export default function UpsellTile({ image, name, priceLabel, label, onPress, selected, disabled = false }: Props) {
  const reduceMotion = useReducedMotion();
  const on = selected === true;

  return (
    <motion.button
      type="button"
      aria-label={label}
      aria-pressed={selected}
      disabled={disabled}
      onClick={onPress}
      whileTap={reduceMotion || disabled ? undefined : { scale: 0.96 }}
      transition={{ type: 'spring', stiffness: 400, damping: 26 }}
      className="group snap-start shrink-0 w-[136px] text-left rounded-card disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D4EAE6] focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-900"
    >
      <span className="relative block">
        <span
          className={`block w-[136px] h-[136px] rounded-card overflow-hidden bg-zinc-800 transition-shadow ${
            on ? 'ring-2 ring-[#D4EAE6] ring-offset-2 ring-offset-zinc-900' : 'ring-1 ring-white/10'
          }`}
        >
          {image ? (
            <FadeInImage src={image} alt="" className="w-full h-full" imageClassName="transition-transform duration-300 group-hover:scale-105" />
          ) : (
            <span className="w-full h-full grid place-items-center text-zinc-500">
              <UtensilsCrossed size={28} strokeWidth={1.5} aria-hidden />
            </span>
          )}
        </span>

        {/* Solid rather than frosted, as on the Home cards: the tile fades in with the sheet, and a
            backdrop blur inside something still fading can be drawn under the photo. */}
        <span
          aria-hidden
          className={`absolute bottom-2 right-2 w-9 h-9 grid place-items-center rounded-full transition-colors ${
            on
              ? 'bg-[#D4EAE6] text-zinc-900 glow-opal'
              : 'bg-zinc-900/80 glass-float text-white group-hover:bg-[#D4EAE6] group-hover:text-zinc-900'
          }`}
        >
          <AnimatePresence mode="wait" initial={false}>
            <motion.span
              key={on ? 'on' : 'off'}
              initial={reduceMotion ? false : { scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={reduceMotion ? undefined : { scale: 0.5, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 500, damping: 28 }}
              className="grid place-items-center"
            >
              {on ? <Check size={16} strokeWidth={3} /> : <Plus size={16} strokeWidth={2.5} />}
            </motion.span>
          </AnimatePresence>
        </span>
      </span>

      <span className="mt-2 block text-[13px] font-medium leading-snug text-zinc-100 line-clamp-2 min-h-[2.75em]">{name}</span>
      <span className={`mt-0.5 block text-[13px] tabular-nums ${on ? 'text-[#D4EAE6]' : 'text-zinc-400'}`}>{priceLabel}</span>
    </motion.button>
  );
}
