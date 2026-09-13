import { motion } from 'motion/react';
import { revealOnMount, riseItem, staggerGroup } from '../../lib/motion';
import { MenuItem } from '../../types';
import { triggerVibration } from '../../lib/haptics';
import { FadeInImage } from '../../components/ui/FadeInImage';
import { HOME_CATEGORIES, categoryImage } from '../../data/home';

interface Props {
  menuItems: MenuItem[];
  /** The `MenuItem.category` currently chosen, so the category stays marked after coming back here. */
  selectedCategory: string | null;
  onOpenCategory: (menuCategory: string) => void;
}

/**
 * Swipeable row of categories: just the rounded photo with the name underneath, no card around it.
 * The row is wide enough that the next one always peeks in, which is what makes it read as swipeable.
 */
export default function CategoryCarousel({ menuItems, selectedCategory, onOpenCategory }: Props) {
  return (
    <section aria-labelledby="home-categories">
      <h2 id="home-categories" className="sr-only">
        Categorii
      </h2>

      <div className="-mx-4 sm:-mx-6 px-4 sm:px-6 overflow-x-auto no-scrollbar snap-x snap-mandatory scroll-px-4 sm:scroll-px-6">
        <motion.ul variants={staggerGroup(0.02, 0)} {...revealOnMount} className="flex gap-3 w-max py-1">
          {HOME_CATEGORIES.map(category => {
            const active = selectedCategory === category.menuCategory;
            return (
              <motion.li key={category.id} variants={riseItem} className="snap-start">
                <motion.button
                  type="button"
                  whileTap={{ scale: 0.95 }}
                  aria-pressed={active}
                  onClick={() => {
                    triggerVibration(12);
                    onOpenCategory(category.menuCategory);
                  }}
                  className="group w-[84px] shrink-0 flex flex-col items-center rounded-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D4EAE6] focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-900"
                >
                  <FadeInImage
                    src={categoryImage(menuItems, category)}
                    alt=""
                    className={`w-[84px] h-[84px] rounded-card bg-zinc-800 transition-shadow ${
                      active ? 'ring-2 ring-[#D4EAE6] ring-offset-2 ring-offset-zinc-900' : 'ring-1 ring-white/10'
                    }`}
                    imageClassName="transition-transform duration-300 group-hover:scale-105"
                  />
                  <span
                    className={`mt-2 px-0.5 text-[12px] font-medium leading-tight text-center line-clamp-2 min-h-[2.5em] transition-colors ${
                      active ? 'text-[#D4EAE6]' : 'text-zinc-300 group-hover:text-white'
                    }`}
                  >
                    {category.label}
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
