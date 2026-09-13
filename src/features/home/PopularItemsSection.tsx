import { useMemo } from 'react';
import { ChevronRight, Clock, Star } from 'lucide-react';
import { motion } from 'motion/react';
import { MenuItem } from '../../types';
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

/**
 * Deliberately the opposite shape of "Meniul zilei": a stacked list of short, wide rows rather than
 * a swipeable row of tall cards, so the two sections never blur into one another.
 */
export default function PopularItemsSection({ menuItems, onSelectItem, onSeeAll }: Props) {
  const items = useMemo(() => resolveShowcase(menuItems, POPULAR_IDS, COUNT), [menuItems]);

  if (items.length === 0) return null;

  return (
    <section aria-labelledby="home-popular">
      <SectionHeader id="home-popular" title="Preparate apreciate" onSeeAll={onSeeAll} />

      <ul className="flex flex-col gap-2.5 sm:grid sm:grid-cols-2 sm:gap-3">
        {items.map((item, index) => {
          const { rating, prepMinutes } = showcaseMeta(item);
          return (
            <li key={item.id}>
              <motion.button
                type="button"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, delay: index * 0.04, ease: 'easeOut' }}
                whileTap={{ scale: 0.99 }}
                onClick={() => {
                  triggerVibration(10);
                  onSelectItem(item);
                }}
                className="group w-full flex items-center gap-3.5 p-3 rounded-[26px] text-left bg-white/[0.05] backdrop-blur-xl border-[0.5px] border-white/15 shadow-[0_8px_28px_rgba(0,0,0,0.3)] hover:bg-white/[0.1] hover:border-white/25 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D4EAE6] focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-900"
              >
                <FadeInImage
                  src={item.image}
                  alt={item.name}
                  className="w-[68px] h-[68px] shrink-0 rounded-full bg-zinc-800 ring-1 ring-white/10"
                />

                <span className="min-w-0 flex-1">
                  <span className="block text-[15px] font-semibold tracking-tight text-white truncate group-hover:text-[#D4EAE6] transition-colors">
                    {item.name}
                  </span>
                  <span className="block text-[12px] text-zinc-500 truncate mt-0.5">{item.category}</span>

                  <span className="flex items-center gap-3 mt-1.5 text-[12px] text-zinc-400 tabular-nums">
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
              </motion.button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
