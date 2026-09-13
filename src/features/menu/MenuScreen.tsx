import { memo, useEffect, useMemo } from 'react';
import { motion, type Variants } from 'motion/react';
import { EASE_OUT, revealOnMount, revealOnView, riseItem, staggerGroup } from '../../lib/motion';
import { Plus } from 'lucide-react';
import { MenuItem, OrderType } from '../../types';
import { triggerVibration } from '../../lib/haptics';
import { SegmentedControl } from '../../components/ui/SegmentedControl';
import { FadeInImage } from '../../components/ui/FadeInImage';
import { CLIENT_PAGE_BOTTOM, clientTopPadding } from '../client/layout';

interface Props {
  menuItems: MenuItem[];
  orderType: OrderType;
  setOrderType: (type: OrderType) => void;
  onSelectItem: (item: MenuItem) => void;
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
      {/* Header: the big hero now lives on the Home page, so the menu starts with the essentials. */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-[28px] sm:text-[32px] font-sans font-semibold tracking-tight text-white mb-1">Meniu</h1>
        <p className="text-[13px] text-zinc-400 mb-5">Apasă un produs pentru a-l personaliza.</p>

        <div className="w-full max-w-[280px] sm:max-w-[320px] relative">
          <SegmentedControl
            id="order-type"
            value={orderType}
            onChange={(val) => {
              triggerVibration(15);
              setOrderType(val as OrderType);
            }}
            options={[
              { label: 'Livrare', value: 'livrare' },
              { label: 'Ridicare', value: 'ridicare' }
            ]}
          />
        </div>

        {/* Quick access to a category. Buttons, not #anchors, so the page URL stays clean. */}
        {categories.length > 1 && (
          <nav aria-label="Categorii" className="mt-5 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 overflow-x-auto no-scrollbar">
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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12">
        {categories.map(category => {
          const items = menuItems.filter(i => i.category === category);
          if (items.length === 0) return null;

          return (
            <div key={category} id={categoryId(category)} className="mb-20 scroll-mt-[96px]">
              <motion.div {...revealOnView} className="flex items-center gap-6 mb-12">
                <motion.div variants={DIVIDER} className="flex-1 h-px bg-zinc-700/60 origin-right" />
                <motion.h2 variants={riseItem} className="text-3xl font-sans font-semibold tracking-tight text-white text-center">{category}</motion.h2>
                <motion.div variants={DIVIDER} className="flex-1 h-px bg-zinc-700/60 origin-left" />
              </motion.div>
              
              {/* Cards come in one after another as the category scrolls into view. */}
              <motion.div variants={staggerGroup(0.05, 0)} {...revealOnView} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
                {items.map(item => (
                  <motion.div
                    variants={riseItem}
                    key={item.id}
                    onClick={() => {
                      if (item.available) {
                        triggerVibration(10);
                        onSelectItem(item);
                      }
                    }}
                    // Press feedback through the CSS `scale` property: it composes with the entrance
                    // transform, which would otherwise take precedence over a Motion whileTap scale.
                    className={`group flex flex-col gap-4 p-2 bg-white/[0.05] glass-edge rounded-card cursor-pointer transition-[background-color,scale] duration-150 ease-out active:scale-[0.98] ${!item.available ? 'opacity-40 grayscale' : 'hover:bg-white/[0.09]'}`}
                  >
                    <div className="w-full h-48 sm:h-64 shrink-0 rounded-tile overflow-hidden bg-zinc-800 relative">
                      <FadeInImage src={item.image} alt={item.name} className="w-full h-full" />
                      {!item.available && (
                        <div className="absolute inset-0 bg-zinc-900/40 flex items-center justify-center backdrop-blur-[2px]">
                          <span className="bg-zinc-900/80 text-white px-4 py-2 rounded-full text-xs font-semibold uppercase tracking-wider">Indisponibil</span>
                        </div>
                      )}
                    </div>
                    
                    <div className="flex-1 flex flex-col px-3 pb-3">
                      <div className="flex justify-between items-baseline mb-2">
                        <h3 className="text-xl sm:text-2xl font-sans font-semibold tracking-tight text-white group-hover:text-[#D4EAE6] transition-colors leading-tight">{item.name}</h3>
                        <span className="text-[#D4EAE6] font-medium whitespace-nowrap ml-4 text-lg">{item.price} RON</span>
                      </div>
                      <p className="text-sm text-zinc-300 leading-relaxed line-clamp-2">{item.description}</p>
                      
                      <div className="mt-4 pt-4 border-t border-zinc-700/40 flex justify-between items-center">
                        <span className="text-xs uppercase tracking-[0.15em] font-semibold text-zinc-400 group-hover:text-[#D4EAE6] transition-colors">
                          {item.available ? 'Apasă pentru a personaliza' : 'Stoc epuizat'}
                        </span>
                        {item.available && (
                          <div className="w-8 h-8 rounded-full bg-[#D4EAE6]/10 flex items-center justify-center text-[#D4EAE6] group-hover:bg-[#D4EAE6] group-hover:text-zinc-900 transition-colors">
                            <Plus size={18} strokeWidth={2.5} />
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
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
