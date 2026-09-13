import { Search } from 'lucide-react';
import { MenuItem, Order, OrderType } from '../../types';
import { triggerVibration } from '../../lib/haptics';
import { SegmentedControl } from '../../components/ui/SegmentedControl';
import ActiveOrderTracker from '../checkout/ActiveOrderTracker';
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
  /** Orders placed from this browser, shown inline so nothing has to float over the header. */
  myOrders: Order[];
  onOpenOrder: (orderId: string) => void;
}

/**
 * The customer's dashboard. The important things start near the top: a compact greeting with search,
 * the order type, the category carousel, then today's picks and the popular list. The old full-height
 * hero is gone, so the categories are visible without scrolling on a phone.
 */
export default function HomeScreen({
  menuItems,
  orderType,
  setOrderType,
  onSelectItem,
  onOpenMenu,
  onOpenCategory,
  onOpenSearch,
  selectedCategory,
  myOrders,
  onOpenOrder,
}: Props) {
  return (
    <div className={CLIENT_PAGE_BOTTOM} style={{ paddingTop: clientTopPadding() }}>
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
            className="w-11 h-11 shrink-0 grid place-items-center rounded-full bg-zinc-800/80 backdrop-blur-2xl border-[0.5px] border-white/20 shadow-[0_8px_32px_rgba(0,0,0,0.5)] text-zinc-200 hover:text-white hover:bg-zinc-700/80 transition-colors active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D4EAE6] focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-900"
          >
            <Search size={19} />
          </button>
        </header>

        {/* Active orders sit in the page flow, so they can never cover the search button. */}
        {myOrders.length > 0 && (
          <section aria-label="Comenzile tale active" className="-mt-4 flex flex-col gap-2">
            {myOrders.map(order => (
              <ActiveOrderTracker key={order.id} order={order} onOpen={() => onOpenOrder(order.id)} />
            ))}
          </section>
        )}

        <CategoryCarousel menuItems={menuItems} selectedCategory={selectedCategory} onOpenCategory={onOpenCategory} />

        <DailyMenuSection menuItems={menuItems} onSelectItem={onSelectItem} onSeeAll={onOpenMenu} />

        <PopularItemsSection menuItems={menuItems} onSelectItem={onSelectItem} onSeeAll={onOpenMenu} />
      </div>
    </div>
  );
}
