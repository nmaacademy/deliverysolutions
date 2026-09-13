import { Home, MapPinned, ShoppingBag, UtensilsCrossed, UserRound, LucideIcon } from 'lucide-react';
import { motion } from 'motion/react';
import { ClientPage, ClientTab } from '../../lib/routes';
import { triggerVibration } from '../../lib/haptics';

const ITEMS: { tab: ClientTab; label: string; icon: LucideIcon }[] = [
  { tab: 'home', label: 'Acasă', icon: Home },
  { tab: 'map', label: 'Hartă', icon: MapPinned },
  { tab: 'menu', label: 'Meniu', icon: UtensilsCrossed },
  { tab: 'cart', label: 'Coș', icon: ShoppingBag },
  { tab: 'profile', label: 'Profil', icon: UserRound },
];

interface Props {
  page: ClientPage;
  /** Badge on the cart tab. Hidden at zero. */
  cartCount: number;
  /** Called with the tapped tab, including the page already open (used to scroll back to the top). */
  onNavigate: (tab: ClientTab) => void;
}

/**
 * The customer app's own navigation: a fixed pill at the bottom of the screen, borrowing the glass
 * look of the demo bar at the top. The five cells are equal width and the labels are always shown,
 * so the bar keeps exactly the same size whichever tab is active.
 */
export default function MobileBottomNav({ page, cartCount, onNavigate }: Props) {
  return (
    <nav
      aria-label="Navigare principală"
      className="fixed inset-x-0 bottom-0 z-40 flex justify-center px-3 sm:px-4 pb-[calc(env(safe-area-inset-bottom)+12px)] pointer-events-none"
    >
      <div className="pointer-events-auto w-full max-w-[440px] grid grid-cols-5 gap-0.5 p-1.5 rounded-full bg-zinc-900/80 backdrop-blur-2xl border-[0.5px] border-white/20 shadow-[0_8px_32px_rgba(0,0,0,0.5)]">
        {ITEMS.map(({ tab, label, icon: Icon }) => {
          // The cart is a screen pushed over the app, so it is never the "current page".
          const active = tab === page;
          const isCart = tab === 'cart';

          return (
            <button
              key={tab}
              type="button"
              aria-current={active ? 'page' : undefined}
              aria-label={isCart && cartCount > 0 ? `Coș, ${cartCount} produse` : undefined}
              onClick={() => {
                if (!active) triggerVibration(12);
                onNavigate(tab);
              }}
              className={`relative min-h-[52px] min-w-0 rounded-full flex flex-col items-center justify-center gap-1 px-0.5 text-[9.5px] font-semibold uppercase tracking-wide transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D4EAE6] focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-900 ${
                active ? 'text-[#D4EAE6]' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              {active && (
                <motion.span
                  aria-hidden
                  layoutId="client-nav-active"
                  className="absolute inset-0 rounded-full bg-white/10 border border-white/10"
                  transition={{ duration: 0.2, ease: 'easeOut' }}
                />
              )}

              <span className="relative shrink-0">
                <Icon size={18} strokeWidth={2} />
                {isCart && cartCount > 0 && (
                  <motion.span
                    key={cartCount}
                    initial={{ scale: 0.6 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 600, damping: 22 }}
                    aria-hidden
                    className="absolute -top-1.5 -right-2 min-w-[16px] h-[16px] px-1 grid place-items-center rounded-full bg-[#D4EAE6] text-zinc-900 text-[9px] font-bold leading-none tabular-nums ring-2 ring-zinc-900"
                  >
                    {cartCount > 9 ? '9+' : cartCount}
                  </motion.span>
                )}
              </span>

              <span className="relative leading-none truncate max-w-full">{label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
