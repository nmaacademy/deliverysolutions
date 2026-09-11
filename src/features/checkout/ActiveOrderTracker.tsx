import { ChevronRight } from 'lucide-react';
import { Order } from '../../types';
import { FadeInImage } from '../../components/ui/FadeInImage';
import { STATUS_ICONS, statusLabel, trackerSubtitle, trackerProgress, TRACKER_PHASE_COUNT } from './orderStatus';

interface Props {
  order: Order;
  onOpen: () => void;
}

/** Glass pill pinned over the menu (same look as the cart button) that keeps a placed order one tap away. */
export default function ActiveOrderTracker({ order, onOpen }: Props) {
  const refused = order.status === 'Refuzată';
  const progress = trackerProgress(order);
  const Icon = STATUS_ICONS[order.status];
  const shortId = order.id.replace('ORD-', '');
  const image = order.items[0]?.menuItem.image;

  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={`Comanda #${shortId}: ${statusLabel(order)}. Vezi detalii`}
      className="w-full flex items-center gap-3 pl-2 pr-4 py-2 rounded-full text-left text-white bg-zinc-800/90 backdrop-blur-2xl border-[0.5px] border-white/20 shadow-[inset_0_1px_1px_rgba(255,255,255,0.15),0_8px_32px_rgba(0,0,0,0.3)] hover:bg-zinc-700/90 transition active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D4EAE6]"
    >
      <span className="relative shrink-0">
        {image ? (
          <FadeInImage src={image} alt="" className="w-12 h-12 rounded-full bg-zinc-700" imageClassName={refused ? 'grayscale opacity-60' : ''} />
        ) : (
          <span className="block w-12 h-12 rounded-full bg-zinc-700" />
        )}
        <span
          aria-hidden
          className={`absolute -bottom-0.5 -right-0.5 w-5 h-5 grid place-items-center rounded-full ring-2 ring-zinc-800 ${
            refused ? 'bg-red-500 text-white' : 'bg-[#D4EAE6] text-zinc-900'
          }`}
        >
          <Icon size={11} strokeWidth={2.75} />
        </span>
      </span>

      <span className="flex-1 min-w-0">
        <span className="block text-[15px] font-semibold leading-tight truncate">{statusLabel(order)}</span>
        <span className={`block text-[12px] mt-0.5 truncate ${refused ? 'text-red-300' : 'text-zinc-400'}`}>{trackerSubtitle(order)}</span>
        {!refused && (
          <span aria-hidden className="mt-1.5 flex gap-1.5">
            {Array.from({ length: TRACKER_PHASE_COUNT }, (_, i) => (
              <span key={i} className="relative h-[3px] flex-1 rounded-full bg-white/15 overflow-hidden">
                {i < progress.phase && <span className="absolute inset-0 bg-[#D4EAE6]" />}
                {i === progress.phase && (
                  <>
                    {/* The phase in progress keeps filling; steps already done inside it stay solid. */}
                    <span className="absolute inset-0 origin-left bg-[#D4EAE6]/50 animate-tracker-fill motion-reduce:animate-none motion-reduce:scale-x-50" />
                    {progress.fraction > 0 && (
                      <span className="absolute inset-y-0 left-0 bg-[#D4EAE6] rounded-full" style={{ width: `${progress.fraction * 100}%` }} />
                    )}
                  </>
                )}
              </span>
            ))}
          </span>
        )}
      </span>

      <span className="shrink-0 flex items-center gap-0.5 text-zinc-500">
        <span className="text-[10px] font-bold uppercase tracking-wider tabular-nums">#{shortId}</span>
        <ChevronRight size={18} />
      </span>
    </button>
  );
}
