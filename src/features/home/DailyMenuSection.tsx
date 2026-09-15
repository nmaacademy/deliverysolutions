import { useMemo } from 'react';
import { Clock, Plus } from 'lucide-react';
import { motion } from 'motion/react';
import { revealOnView, riseItem, staggerGroup } from '../../lib/motion';
import { MenuItem } from '../../types';
import { triggerVibration } from '../../lib/haptics';
import { FadeInImage } from '../../components/ui/FadeInImage';
import { dailyMenuItems, showcaseMeta } from '../../data/home';
import SectionHeader from './SectionHeader';

interface Props {
  menuItems: MenuItem[];
  onSelectItem: (item: MenuItem) => void;
  onSeeAll: () => void;
}

/**
 * Today's picks as large cards: a round photo, the name, two lines of description and a footer with
 * the prep time and the price. One and a bit cards fit on a phone, so the row invites a swipe; on a
 * wide screen the same cards lay out as a grid instead.
 *
 * The manager picks these, so the count is whatever it is: the phone row scrolls and the desktop
 * grid wraps onto a second line past four.
 */
export default function DailyMenuSection({ menuItems, onSelectItem, onSeeAll }: Props) {
  const items = useMemo(() => dailyMenuItems(menuItems), [menuItems]);

  if (items.length === 0) return null;

  return (
    <section aria-labelledby="home-daily">
      <SectionHeader id="home-daily" title="Meniul zilei" hint="Disponibil astăzi" onSeeAll={onSeeAll} />

      <div className="-mx-4 sm:-mx-6 px-4 sm:px-6 overflow-x-auto no-scrollbar snap-x snap-mandatory scroll-px-4 sm:scroll-px-6 lg:overflow-visible lg:mx-0 lg:px-0">
        <motion.ul variants={staggerGroup(0.03, 0)} {...revealOnView} className="flex gap-3 w-max py-1 lg:grid lg:grid-cols-4 lg:w-auto lg:gap-4">
          {items.map(item => {
            const { prepMinutes } = showcaseMeta(item);
            return (
              <motion.li key={item.id} variants={riseItem} className="snap-start lg:snap-align-none">
                <motion.button
                  type="button"
                  whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    triggerVibration(10);
                    onSelectItem(item);
                  }}
                  className="group w-[190px] sm:w-[220px] lg:w-full h-full flex flex-col p-4 rounded-card text-left bg-white/[0.05] glass-edge hover:bg-white/[0.09] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D4EAE6] focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-900"
                >
                  <span className="relative block self-center">
                    <FadeInImage
                      src={item.image}
                      alt={item.name}
                      className="w-[132px] h-[132px] rounded-full bg-zinc-800 ring-1 ring-white/10"
                    />
                    <span className="absolute -top-1 left-0 text-[9px] font-bold uppercase tracking-wider text-zinc-900 bg-[#D4EAE6] px-2.5 py-1 rounded-full glow-opal">
                      Astăzi
                    </span>
                    {/* Affordance only: the whole card opens the product modal. Solid rather than frosted: on
                        the phone a backdrop blur inside a card that is still fading in showed under the
                        photo, then jumped on top when the entrance ended. */}
                    <span
                      aria-hidden
                      className="absolute bottom-0 right-0 w-8 h-8 grid place-items-center z-10 rounded-full bg-zinc-900/80 ring-1 ring-white/15 shadow-[0_4px_12px_rgba(0,0,0,0.35)] text-[#D4EAE6] group-hover:bg-[#D4EAE6] group-hover:text-zinc-900 transition-colors"
                    >
                      <Plus size={16} strokeWidth={2.5} />
                    </span>
                  </span>

                  <h3 className="mt-4 text-[16px] font-semibold tracking-tight text-white leading-tight line-clamp-1 group-hover:text-[#D4EAE6] transition-colors">
                    {item.name}
                  </h3>
                  <p className="mt-1 text-[12.5px] text-zinc-400 leading-snug line-clamp-2 min-h-[2.5em]">
                    {item.description}
                  </p>

                  <span className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-1.5 text-[12px] text-zinc-400 tabular-nums whitespace-nowrap">
                      <Clock size={13} aria-hidden />
                      {prepMinutes} min
                    </span>
                    <span className="text-[16px] font-semibold text-[#D4EAE6] tabular-nums whitespace-nowrap">
                      {item.price} RON
                    </span>
                  </span>
                </motion.button>
              </motion.li>
            );
          })}
        </motion.ul>
      </div>
    </section>
  );
}
