import { motion } from 'motion/react';
import { MenuItem } from '../../types';
import { triggerVibration } from '../../lib/haptics';
import { FadeInImage } from '../../components/ui/FadeInImage';
import { HOME_CATEGORIES, categoryImage } from '../../data/home';

interface Props {
  menuItems: MenuItem[];
  /** The `MenuItem.category` currently chosen, so the card stays marked after coming back here. */
  selectedCategory: string | null;
  onOpenCategory: (menuCategory: string) => void;
}

/**
 * Swipeable row of tall category cards. The cards keep a fixed width and snap into place, and the
 * row is wide enough that the next one always peeks in, which is what makes it read as swipeable.
 */
export default function CategoryCarousel({ menuItems, selectedCategory, onOpenCategory }: Props) {
  return (
    <section aria-labelledby="home-categories">
      <h2 id="home-categories" className="sr-only">
        Categorii
      </h2>

      <div className="-mx-4 sm:-mx-6 px-4 sm:px-6 overflow-x-auto no-scrollbar snap-x snap-mandatory scroll-px-4 sm:scroll-px-6">
        <ul className="flex gap-3 w-max py-1">
          {HOME_CATEGORIES.map(category => {
            const active = selectedCategory === category.menuCategory;
            return (
              <li key={category.id} className="snap-start">
                <motion.button
                  type="button"
                  whileTap={{ scale: 0.97 }}
                  aria-pressed={active}
                  onClick={() => {
                    triggerVibration(12);
                    onOpenCategory(category.menuCategory);
                  }}
                  className={`w-[112px] shrink-0 p-2 rounded-[26px] border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D4EAE6] focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-900 ${
                    active
                      ? 'bg-[#D4EAE6] border-[#D4EAE6] shadow-[0_8px_28px_rgba(212,234,230,0.22)]'
                      : 'bg-white/[0.06] border-white/15 backdrop-blur-xl shadow-[0_8px_32px_rgba(0,0,0,0.3)] hover:bg-white/[0.1]'
                  }`}
                >
                  <FadeInImage
                    src={categoryImage(menuItems, category)}
                    alt={category.label}
                    className="w-full aspect-square rounded-[20px] bg-zinc-800"
                  />
                  <span
                    className={`block mt-2.5 mb-1 px-1 text-[12px] font-semibold leading-tight text-center min-h-[2.4em] ${
                      active ? 'text-zinc-900' : 'text-zinc-200'
                    }`}
                  >
                    {category.label}
                  </span>
                </motion.button>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
