import { memo } from 'react';
import { Search } from 'lucide-react';
import { OrderType } from '../../types';
import { triggerVibration } from '../../lib/haptics';
import { SegmentedControl } from '../ui/SegmentedControl';

interface ClientHeaderControlsProps {
  orderType: OrderType;
  setOrderType: (type: OrderType) => void;
  onOpenSearch: () => void;
}

/**
 * The compact header every customer page starts with: order type on the left, search on the right,
 * both 44px tall so they line up. It lives here rather than in each page so the Home and Menu tabs
 * cannot drift apart visually. The order type is the same value the Menu page and checkout read.
 */
function ClientHeaderControls({ orderType, setOrderType, onOpenSearch }: ClientHeaderControlsProps) {
  return (
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
  );
}

export default memo(ClientHeaderControls);
