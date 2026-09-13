import { memo } from 'react';
import { Search } from 'lucide-react';
import { MenuItem, OrderType } from '../../types';
import { triggerVibration } from '../../lib/haptics';
import { SegmentedControl } from '../../components/ui/SegmentedControl';
import { CLIENT_PAGE_BOTTOM, clientTopPadding } from '../client/layout';
import CategoryCarousel from './CategoryCarousel';
import DailyMenuSection from './DailyMenuSection';
import PopularItemsSection from './PopularItemsSection';

interface Props {
  menuItems: MenuItem[];
  orderType: OrderType;
  setOrderType: (type: OrderType) => void;
  onSelectItem: (item: MenuItem) => void;
  onOpenMenu: () => void;
  onOpenCategory: (menuCategory: string) => void;
  onOpenSearch: () => void;
  /** The category last chosen from the carousel; shared with the Menu page, never duplicated here. */
  selectedCategory: string | null;
  /** Order trackers pinned above the page; the header starts below them. */
  trackerCount?: number;
}

/**
 * The customer's dashboard. The important things start near the top: a compact header with the order
 * type and search, the category row, then today's picks and the popular list. The old full-height
 * hero is gone, so the categories are visible without scrolling on a phone.
 */
function HomeScreen({
  menuItems,
  orderType,
  setOrderType,
  onSelectItem,
  onOpenMenu,
  onOpenCategory,
  onOpenSearch,
  selectedCategory,
  trackerCount = 0,
}: Props) {
  return (
    <div className={CLIENT_PAGE_BOTTOM} style={{ paddingTop: clientTopPadding(trackerCount) }}>
      <div className="max-w-3xl lg:max-w-5xl mx-auto px-4 sm:px-6 flex flex-col gap-8">
        {/* Header: order type on the left, search on the right, both 44px tall so they line up.
            The order type is the same value the Menu page and checkout read. */}
        <header className="flex items-center justify-between gap-3">
          <div className="min-w-0 flex-1 max-w-[240px] sm:max-w-[260px]">
            <SegmentedControl
              id="order-type"
              size="sm"
              value={orderType}
              onChange={val => {
                triggerVibration(15);
                setOrderType(val as OrderType);
              }}
              options={[
                { label: 'Livrare', value: 'livrare' },
                { label: 'Ridicare', value: 'ridicare' },
              ]}
            />
          </div>

          <button
            type="button"
            onClick={() => {
              triggerVibration(12);
              onOpenSearch();
            }}
            aria-label="Caută preparate"
            title="Caută preparate"
            className="w-11 h-11 shrink-0 grid place-items-center rounded-full bg-zinc-800/80 glass-float text-zinc-200 hover:text-white hover:bg-zinc-700/80 transition-colors active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D4EAE6] focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-900"
          >
            <Search size={19} />
          </button>
        </header>

        <CategoryCarousel menuItems={menuItems} selectedCategory={selectedCategory} onOpenCategory={onOpenCategory} />

        <DailyMenuSection menuItems={menuItems} onSelectItem={onSelectItem} onSeeAll={onOpenMenu} />

        <PopularItemsSection menuItems={menuItems} onSelectItem={onSelectItem} onSeeAll={onOpenMenu} />
      </div>
    </div>
  );
}

// Memoised: opening a product sheet, the search or the 5-second order poll re-renders App, and
// rebuilding every card of the page in that same frame held back the first frame of the sheet.
export default memo(HomeScreen);
