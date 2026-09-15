import { memo, useEffect, useMemo } from 'react';
import { motion, type Variants } from 'motion/react';
import { EASE_OUT, revealOnMount, revealOnView, riseItem, staggerGroup } from '../../lib/motion';
import { Plus } from 'lucide-react';
import { MenuItem, OrderType } from '../../types';
import { triggerVibration } from '../../lib/haptics';
import ClientHeaderControls from '../../components/navigation/ClientHeaderControls';
import { FadeInImage } from '../../components/ui/FadeInImage';
import { CLIENT_PAGE_BOTTOM, clientTopPadding } from '../client/layout';

interface Props {
  menuItems: MenuItem[];
  orderType: OrderType;
  setOrderType: (type: OrderType) => void;
  onSelectItem: (item: MenuItem) => void;
  /** Opens the one global search sheet, the same one the Home header opens. */
  onOpenSearch: () => void;
  /** Order trackers pinned above the page; the header starts below them. */
  trackerCount?: number;
  /** The category currently marked, shared with the Home carousel. Highlighting only. */
  selectedCategory?: string | null;
  /**
   * One-shot navigation intent: set only when the visitor arrived by tapping a category card, so
   * opening the Menu tab normally still restores where the page was left.
   */
  scrollToCategory?: string | null;
  onScrolledToCategory?: () => void;
}

/** Anchor id for a category block, used by the quick-access chips. */
/** The hairlines beside a category title draw outwards from it as the title arrives. */
const DIVIDER: Variants = {
  hidden: { scaleX: 0, opacity: 0 },
  show: { scaleX: 1, opacity: 1, transition: { duration: 0.4, ease: EASE_OUT } },
};

const categoryId = (category: string) => `meniu-${category.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;

function MenuScreen({
  menuItems,
  orderType,
  setOrderType,
  onSelectItem,
  onOpenSearch,
  trackerCount = 0,
  selectedCategory = null,
  scrollToCategory = null,
  onScrolledToCategory,
}: Props) {
  const categories = useMemo(() => {
    return Array.from(new Set(menuItems.map(i => i.category)));
  }, [menuItems]);

  // Arriving from a category card: jump to that block once, then hand the intent back as consumed.
  useEffect(() => {
    if (!scrollToCategory) return;
    document.getElementById(categoryId(scrollToCategory))?.scrollIntoView({ behavior: 'auto', block: 'start' });
    onScrolledToCategory?.();
  }, [scrollToCategory, onScrolledToCategory]);

  return (
    <div className={CLIENT_PAGE_BOTTOM} style={{ paddingTop: clientTopPadding(trackerCount) }}>
      {/* The same compact header the Home page opens with, so the two tabs read as one app. */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <ClientHeaderControls orderType={orderType} setOrderType={setOrderType} onOpenSearch={onOpenSearch} />

        {/* Quick access to a category. Buttons, not #anchors, so the page URL stays clean. */}
        {categories.length > 1 && (
          <nav aria-label="Categorii" className="mt-8 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 overflow-x-auto no-scrollbar">
            <motion.ul variants={staggerGroup(0.02, 0)} {...revealOnMount} className="flex gap-2 w-max">
              {categories.map(category => (
                <motion.li key={category} variants={riseItem}>
                  <button
                    type="button"
                    onClick={() => {
                      triggerVibration(10);
                      document.getElementById(categoryId(category))?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }}
                    className={`inline-flex items-center min-h-[44px] px-4 rounded-full border-[0.5px] text-[13px] font-medium whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D4EAE6] ${
                      category === selectedCategory
                        ? 'bg-[#D4EAE6] border-[#D4EAE6] text-zinc-900'
                        : 'bg-white/[0.06] border-white/15 text-zinc-300 hover:bg-white/[0.12] hover:text-white'
                    }`}
                  >
                    {category}
                  </button>
                </motion.li>
              ))}
            </motion.ul>
          </nav>
        )}
      </div>

      {/* Menu Categories */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 sm:pt-12">
        {categories.map(category => {
          const items = menuItems.filter(i => i.category === category);
          if (items.length === 0) return null;

          return (
            <div key={category} id={categoryId(category)} className="mb-12 sm:mb-16 lg:mb-20 scroll-mt-[96px]">
              <motion.div {...revealOnView} className="flex items-center gap-4 sm:gap-6 mb-6 sm:mb-10">
                <motion.div variants={DIVIDER} className="flex-1 h-px bg-zinc-700/60 origin-right" />
                <motion.h2 variants={riseItem} className="text-2xl sm:text-3xl font-sans font-semibold tracking-tight text-white text-center">{category}</motion.h2>
                <motion.div variants={DIVIDER} className="flex-1 h-px bg-zinc-700/60 origin-left" />
              </motion.div>

              {/* Two cards per row on a phone, more as the screen grows. Cards come in one after
                  another as the category scrolls into view. */}
              <motion.div variants={staggerGroup(0.05, 0)} {...revealOnView} className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-2.5 sm:gap-5 lg:gap-6">
                {items.map(item => (
                  <motion.button
                    variants={riseItem}
                    key={item.id}
                    type="button"
                    disabled={!item.available}
                    onClick={() => {
                      triggerVibration(10);
                      onSelectItem(item);
                    }}
                    // Press feedback through the CSS `scale` property: it composes with the entrance
                    // transform, which would otherwise take precedence over a Motion whileTap scale.
                    className={`group w-full min-w-0 text-left flex flex-col p-1.5 sm:p-2 bg-white/[0.05] glass-edge rounded-card transition-[background-color,scale] duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D4EAE6] focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-900 ${
                      !item.available ? 'opacity-40 grayscale cursor-default' : 'cursor-pointer hover:bg-white/[0.09] active:scale-[0.98]'
                    }`}
                  >
                    <div className="w-full aspect-square shrink-0 rounded-tile overflow-hidden bg-zinc-800 relative">
                      <FadeInImage src={item.image} alt={item.name} className="w-full h-full" />
                      {!item.available && (
                        <div className="absolute inset-0 bg-zinc-900/40 flex items-center justify-center backdrop-blur-[2px] px-2">
                          <span className="bg-zinc-900/80 text-white px-2.5 py-1.5 sm:px-4 sm:py-2 rounded-full text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-center">Indisponibil</span>
                        </div>
                      )}
                    </div>

                    {/* Name, description and price stack: at two columns on a 320px screen there is no
                        room to set the price beside the title without one of the two being cut. */}
                    <div className="flex-1 flex flex-col min-w-0 px-1.5 sm:px-2 pt-2.5 pb-1.5 sm:pb-2">
                      <h3 className="text-[15px] sm:text-[17px] lg:text-xl font-sans font-semibold tracking-tight text-white group-hover:text-[#D4EAE6] transition-colors leading-snug line-clamp-2">{item.name}</h3>
                      <p className="mt-1 text-[12px] sm:text-[13px] text-zinc-300 leading-snug line-clamp-2">{item.description}</p>

                      <div className="mt-auto pt-2.5 flex items-center justify-between gap-2">
                        <span className="min-w-0 text-[#D4EAE6] font-medium text-[14px] sm:text-[15px] tabular-nums whitespace-nowrap">{item.price} RON</span>
                        {item.available && (
                          // Decorative: the whole card is the button, so this must not be a second one.
                          <span aria-hidden className="shrink-0 w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-[#D4EAE6]/10 grid place-items-center text-[#D4EAE6] group-hover:bg-[#D4EAE6] group-hover:text-zinc-900 transition-colors">
                            <Plus size={16} strokeWidth={2.5} />
                          </span>
                        )}
                      </div>
                    </div>
                  </motion.button>
                ))}
              </motion.div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Memoised: opening a product sheet, the search or the 5-second order poll re-renders App, and
// rebuilding every card of the page in that same frame held back the first frame of the sheet.
export default memo(MenuScreen);
