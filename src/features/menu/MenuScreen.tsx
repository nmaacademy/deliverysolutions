import { useEffect, useMemo } from 'react';
import { motion } from 'motion/react';
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
const categoryId = (category: string) => `meniu-${category.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;

export default function MenuScreen({
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
            <ul className="flex gap-2 w-max">
              {categories.map(category => (
                <li key={category}>
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
                </li>
              ))}
            </ul>
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
              <div className="flex items-center gap-6 mb-12">
                <div className="flex-1 h-px bg-zinc-700/60"></div>
                <h2 className="text-3xl font-sans font-semibold tracking-tight text-white text-center">{category}</h2>
                <div className="flex-1 h-px bg-zinc-700/60"></div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
                {items.map((item, index) => (
                  <motion.div 
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: index * 0.1, ease: "easeOut" }}
                    whileHover={{ y: -4 }}
                    whileTap={{ scale: 0.98 }}
                    key={item.id}
                    onClick={() => {
                      if (item.available) {
                        triggerVibration(10);
                        onSelectItem(item);
                      }
                    }}
                    className={`group flex flex-col gap-4 p-4 sm:p-5 bg-white/5 backdrop-blur-md border-[0.5px] border-white/20 shadow-[inset_0_1px_1px_rgba(255,255,255,0.15),0_8px_32px_rgba(0,0,0,0.3)] rounded-[32px] cursor-pointer transition-all ${!item.available ? 'opacity-40 grayscale' : 'hover:bg-white/10 hover:border-white/30'}`}
                  >
                    <div className="w-full h-48 sm:h-64 shrink-0 rounded-[24px] overflow-hidden bg-zinc-800 border border-zinc-700/50 transition-all duration-500 shadow-[0_8px_30px_rgba(161,161,170,0.15)] group-hover:shadow-[0_12px_40px_rgba(161,161,170,0.3)] relative">
                      <FadeInImage src={item.image} alt={item.name} />
                      {!item.available && (
                        <div className="absolute inset-0 bg-zinc-900/40 flex items-center justify-center backdrop-blur-[2px]">
                          <span className="bg-zinc-900/80 text-white px-4 py-2 rounded-full text-xs font-semibold uppercase tracking-wider">Indisponibil</span>
                        </div>
                      )}
                    </div>
                    
                    <div className="flex-1 flex flex-col px-2">
                      <div className="flex justify-between items-baseline mb-2">
                        <h3 className="text-xl sm:text-2xl font-sans font-semibold tracking-tight text-white group-hover:text-[#D4EAE6] transition-colors leading-tight">{item.name}</h3>
                        <span className="text-[#D4EAE6] font-medium whitespace-nowrap ml-4 text-lg">{item.price} RON</span>
                      </div>
                      <p className="text-sm text-zinc-300 leading-relaxed line-clamp-2">{item.description}</p>
                      
                      <div className="mt-4 pt-4 border-t border-zinc-700/40 flex justify-between items-center">
                        <span className="text-xs uppercase tracking-[0.15em] font-semibold text-zinc-400 group-hover:text-[#D4EAE6] transition-colors">
                          {item.available ? 'Apasa pentru a personaliza' : 'Stoc Epuizat'}
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
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
