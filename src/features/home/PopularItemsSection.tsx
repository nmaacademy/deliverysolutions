import { useMemo } from 'react';
import { ChevronRight, Clock, Star } from 'lucide-react';
import { motion, type Variants } from 'motion/react';
import { MenuItem } from '../../types';
import { ENTER, revealOnView, riseItem } from '../../lib/motion';
import { triggerVibration } from '../../lib/haptics';
import { FadeInImage } from '../../components/ui/FadeInImage';
import { POPULAR_IDS, resolveShowcase, showcaseMeta } from '../../data/home';
import SectionHeader from './SectionHeader';

interface Props {
  menuItems: MenuItem[];
  onSelectItem: (item: MenuItem) => void;
  onSeeAll: () => void;
}

const COUNT = 4;

/** The grouped card fades in while its rows rise one by one. The card itself doesn't move, so nothing travels twice. */
const LIST: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { ...ENTER, staggerChildren: 0.03 } },
};

/**
 * Deliberately the opposite shape of "Meniul zilei": one grouped list with hairlines between short,
 * wide rows instead of a row of separate cards, so the section reads as a list and not as more boxes.
 * On wider screens the rows sit in two columns inside the same card.
 */
export default function PopularItemsSection({ menuItems, onSelectItem, onSeeAll }: Props) {
  const items = useMemo(() => resolveShowcase(menuItems, POPULAR_IDS, COUNT), [menuItems]);

  if (items.length === 0) return null;

  return (
    <section aria-labelledby="home-popular">
      <SectionHeader id="home-popular" title="Preparate apreciate" onSeeAll={onSeeAll} />

      <motion.ul variants={LIST} {...revealOnView} className="rounded-card bg-white/[0.05] glass-edge overflow-hidden sm:grid sm:grid-cols-2 [&>li+li]:border-t [&>li+li]:border-white/[0.06] sm:[&>li:nth-child(2)]:border-t-0 sm:[&>li:nth-child(even)]:border-l">
        {items.map(item => {
          const { rating, prepMinutes } = showcaseMeta(item);
          return (
            <motion.li key={item.id} variants={riseItem}>
              <button
                type="button"
                onClick={() => {
                  triggerVibration(10);
                  onSelectItem(item);
                }}
                className="group w-full h-full flex items-center gap-3.5 px-3 py-3 text-left transition-colors hover:bg-white/[0.04] active:bg-white/[0.06] focus-visible:outline-none focus-visible:bg-white/[0.06]"
              >
                <FadeInImage
                  src={item.image}
                  alt={item.name}
                  className="w-14 h-14 shrink-0 rounded-full bg-zinc-800 ring-1 ring-white/10"
                />

                <span className="min-w-0 flex-1">
                  <span className="block text-[15px] font-semibold tracking-tight text-white truncate group-hover:text-[#D4EAE6] transition-colors">
                    {item.name}
                  </span>
                  <span className="block text-[12px] text-zinc-500 truncate mt-0.5">{item.category}</span>

                  <span className="flex items-center gap-3 mt-1 text-[12px] text-zinc-400 tabular-nums">
                    {/* Demo figure: this prototype has no reviews behind it. */}
                    <span className="inline-flex items-center gap-1 whitespace-nowrap">
                      <Star size={12} className="text-amber-300 fill-amber-300" aria-hidden />
                      {rating.toFixed(1)}
                    </span>
                    <span className="inline-flex items-center gap-1 whitespace-nowrap">
                      <Clock size={12} aria-hidden />
                      {prepMinutes} min
                    </span>
                  </span>
                </span>

                <span className="shrink-0 flex items-center gap-0.5">
                  <span className="text-[14px] font-semibold text-[#D4EAE6] tabular-nums whitespace-nowrap">
                    {item.price} RON
                  </span>
                  <ChevronRight size={18} className="text-zinc-600 group-hover:text-[#D4EAE6] transition-colors" />
                </span>
              </button>
            </motion.li>
          );
        })}
      </motion.ul>
    </section>
  );
}
