import { memo } from 'react';
import { MenuItem, OrderType } from '../../types';
import ClientHeaderControls from '../../components/navigation/ClientHeaderControls';
import { CLIENT_PAGE_BOTTOM, clientTopPadding } from '../client/layout';
import CategoryCarousel from './CategoryCarousel';
import DailyMenuSection from './DailyMenuSection';
import PopularItemsSection from './PopularItemsSection';
import SpecialOffersSection from './SpecialOffersSection';

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
        <ClientHeaderControls orderType={orderType} setOrderType={setOrderType} onOpenSearch={onOpenSearch} />

        <CategoryCarousel menuItems={menuItems} selectedCategory={selectedCategory} onOpenCategory={onOpenCategory} />

        <DailyMenuSection menuItems={menuItems} onSelectItem={onSelectItem} onSeeAll={onOpenMenu} />

        <PopularItemsSection menuItems={menuItems} onSelectItem={onSelectItem} onSeeAll={onOpenMenu} />

        <SpecialOffersSection menuItems={menuItems} onSelectItem={onSelectItem} />
      </div>
    </div>
  );
}

// Memoised: opening a product sheet, the search or the 5-second order poll re-renders App, and
// rebuilding every card of the page in that same frame held back the first frame of the sheet.
export default memo(HomeScreen);
