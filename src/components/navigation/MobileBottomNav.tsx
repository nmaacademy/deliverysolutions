import { useEffect, useRef, useState, type PointerEvent } from 'react';
import { Home, MapPinned, ShoppingBag, UtensilsCrossed, UserRound, LucideIcon } from 'lucide-react';
import { motion, useMotionValue, useReducedMotion, useSpring, useTransform, useVelocity } from 'motion/react';
import { ClientPage, ClientTab } from '../../lib/routes';
import { triggerVibration } from '../../lib/haptics';
import { SHEET_ENTER, SHEET_EXIT } from '../../lib/motion';
import { isPagePinned } from '../../lib/scrollLock';

const ITEMS: { tab: ClientTab; label: string; icon: LucideIcon }[] = [
  { tab: 'home', label: 'Acasă', icon: Home },
  { tab: 'map', label: 'Hartă', icon: MapPinned },
  { tab: 'menu', label: 'Meniu', icon: UtensilsCrossed },
  { tab: 'cart', label: 'Coș', icon: ShoppingBag },
  { tab: 'profile', label: 'Profil', icon: UserRound },
];

const LAST_INDEX = ITEMS.length - 1;

/** Horizontal travel before a press becomes a drag, so a slightly shaky tap still counts as a tap. */
const DRAG_SLOP_PX = 8;

/** Close to critically damped: the lens arrives quickly, never wobbles, and always settles on a tab. */
const LENS_SPRING = { stiffness: 520, damping: 44, mass: 0.9 };

/**
 * One spring drives the whole compact change (width, height, drop, icons and labels), so every part of
 * the bar moves on the same curve and lands in the same frame. Slightly overdamped: it never wobbles.
 */
const COMPACT_SPRING = { stiffness: 460, damping: 42, mass: 0.8 };

/** Scroll distance in one direction before the bar reacts, so small jitters never make it flicker. */
const COMPACT_AFTER_PX = 24;
const EXPAND_AFTER_PX = 12;

/**
 * Compact while reading down the page, full again on any scroll up, at the top and at the very end.
 * Starts full on every page change.
 */
function useCompactOnScroll(resetKey: string) {
  const [compact, setCompact] = useState(false);

  useEffect(() => {
    setCompact(false);
    // Read after the new page restored its scroll, so the restore itself never counts as scrolling.
    let lastY = window.scrollY;
    let travel = 0;
    let frame = 0;
    let resync = false;

    const update = () => {
      frame = 0;
      const y = window.scrollY;
      // A sheet pinning the page (and releasing it) moves scrollY without the visitor scrolling: the bar
      // keeps its size and only resyncs afterwards.
      if (isPagePinned()) {
        resync = true;
        return;
      }
      if (resync) {
        resync = false;
        lastY = y;
        travel = 0;
        return;
      }
      const delta = y - lastY;
      lastY = y;

      const atEdge = y < 8 || window.innerHeight + y >= document.documentElement.scrollHeight - 8;
      if (atEdge) {
        travel = 0;
        setCompact(false);
        return;
      }

      // A running distance in the current direction; turning around starts it over.
      travel = Math.sign(delta) === Math.sign(travel) ? travel + delta : delta;
      if (travel > COMPACT_AFTER_PX) setCompact(true);
      else if (travel < -EXPAND_AFTER_PX) setCompact(false);
    };

    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      cancelAnimationFrame(frame);
    };
  }, [resetKey]);

  return [compact, setCompact] as const;
}

interface Props {
  page: ClientPage;
  /** Badge on the cart tab. Hidden at zero. */
  cartCount: number;
  /** Called with the chosen tab, including the page already open (used to scroll back to the top). */
  onNavigate: (tab: ClientTab) => void;
}

interface Gesture {
  pointerId: number;
  startX: number;
  /** The track's box, read once per gesture instead of on every move. */
  left: number;
  width: number;
  dragging: boolean;
}

/**
 * The customer app's own navigation: a glass pill floating above the bottom of the screen. The open tab
 * sits under a lens that moves on tap and can also be dragged: it follows the finger across the bar,
 * lights up the tab it is over, and on release always snaps onto a whole tab and opens it. Reading down
 * a page folds the bar into a narrower, lower strip of icons, like Instagram's; scrolling up unfolds it.
 */
export default function MobileBottomNav({ page, cartCount, onNavigate }: Props) {
  const reduceMotion = useReducedMotion();
  const pageIndex = Math.max(0, ITEMS.findIndex(item => item.tab === page));
  const [compact, setCompact] = useCompactOnScroll(page);

  // 0 is the full bar, 1 the compact one. Real sizes are derived from it instead of a scale transform,
  // so the glass, the icons and the labels stay pixel-sharp all the way through and never re-render
  // at a different sharpness when the change ends, which is what used to read as a flicker.
  const progress = useSpring(0, COMPACT_SPRING);
  useEffect(() => {
    if (reduceMotion) progress.jump(compact ? 1 : 0);
    else progress.set(compact ? 1 : 0);
  }, [compact, reduceMotion, progress]);
  const pillWidth = useTransform(progress, [0, 1], ['100%', '80%']);
  const rowHeight = useTransform(progress, [0, 1], [52, 40]);
  const drop = useTransform(progress, [0, 1], [0, 8]);
  // The labels fold away in the first half, and the icons slide down into the room they leave.
  const labelOpacity = useTransform(progress, [0, 0.5], [1, 0]);
  const labelY = useTransform(progress, [0, 1], [0, 4]);
  const iconY = useTransform(progress, [0, 1], [0, 7]);

  // Positions are in tab units (0 is the first tab). `target` is where the lens is headed and `lens`
  // follows it on a spring, so taps and drags share the same smooth motion.
  const target = useMotionValue(pageIndex);
  const lens = useSpring(target, LENS_SPRING);
  const x = useTransform(lens, value => `${value * 100}%`);
  // A slight stretch while it travels, gone again the moment it stops.
  const speed = useVelocity(lens);
  const scaleX = useTransform(speed, [-14, 0, 14], [1.16, 1, 1.16]);
  const scaleY = useTransform(speed, [-14, 0, 14], [0.9, 1, 0.9]);

  const trackRef = useRef<HTMLDivElement>(null);
  const gesture = useRef<Gesture | null>(null);
  const hoveredRef = useRef<number | null>(null);
  // While dragging, the tab under the lens lights up before it is actually opened.
  const [hovered, setHovered] = useState<number | null>(null);
  const [pressed, setPressed] = useState(false);
  const litIndex = hovered ?? pageIndex;

  const moveLens = (index: number) => {
    target.set(index);
    if (reduceMotion) lens.jump(index);
  };

  // Follow page changes made elsewhere (the Back button, a category card), unless a drag is under way.
  useEffect(() => {
    if (!gesture.current?.dragging) moveLens(pageIndex);
  }, [pageIndex]);

  const indexAt = (clientX: number, { left, width }: Gesture) =>
    Math.min(LAST_INDEX, Math.max(0, ((clientX - left) / width) * ITEMS.length - 0.5));

  const select = (index: number) => {
    const { tab } = ITEMS[index];
    // The cart is pushed over the app rather than being a page, so the lens stays on the page below.
    moveLens(tab === 'cart' ? pageIndex : index);
    if (tab !== page && tab !== 'cart') triggerVibration(12);
    onNavigate(tab);
  };

  const finishGesture = () => {
    gesture.current = null;
    hoveredRef.current = null;
    setHovered(null);
    setPressed(false);
  };

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0 || !trackRef.current) return;
    // Read on every press, so positions match the bar at whatever size it currently has.
    const { left, width } = trackRef.current.getBoundingClientRect();
    gesture.current = { pointerId: event.pointerId, startX: event.clientX, left, width, dragging: false };
    event.currentTarget.setPointerCapture(event.pointerId);
    setPressed(true);
  };

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const current = gesture.current;
    if (!current || current.pointerId !== event.pointerId) return;
    if (!current.dragging && Math.abs(event.clientX - current.startX) < DRAG_SLOP_PX) return;
    current.dragging = true;

    const position = indexAt(event.clientX, current);
    target.set(position);
    if (reduceMotion) lens.jump(position);

    const nearest = Math.round(position);
    if (hoveredRef.current !== nearest) {
      // A light tick each time the lens crosses onto another tab.
      if (hoveredRef.current !== null) triggerVibration(6);
      hoveredRef.current = nearest;
      setHovered(nearest);
    }
  };

  const handlePointerUp = (event: PointerEvent<HTMLDivElement>) => {
    const current = gesture.current;
    if (!current || current.pointerId !== event.pointerId) return;
    const index = Math.round(indexAt(event.clientX, current));
    finishGesture();
    select(index);
  };

  // An interrupted gesture (a system swipe, a lost capture) puts the lens back on the open page.
  const handlePointerCancel = () => {
    if (!gesture.current) return;
    finishGesture();
    moveLens(pageIndex);
  };

  return (
    <motion.nav
      aria-label="Navigare principală"
      // Slides below the screen edge while the cart or another screen takes over, and back up when the
      // app returns, on that screen's own timing. Movement only: the glass blur only exists at full
      // opacity, so fading the bar made it flash see-through. Scaling it would blur it, then snap sharp.
      initial={{ transform: 'translateY(140%)' }}
      animate={{ transform: 'translateY(0%)', transition: SHEET_EXIT }}
      exit={{ transform: 'translateY(140%)', transition: SHEET_ENTER }}
      // Keyboard users tabbing into a compact bar get the full one back.
      onFocus={() => setCompact(false)}
      // The nav box is the pill itself, floating clear of the bottom edge rather than a full-width strip
      // glued to it, so the browser's own bottom bar keeps its normal look around it.
      className="fixed left-1/2 -translate-x-1/2 bottom-[max(12px,env(safe-area-inset-bottom))] z-40 w-[calc(100%-24px)] sm:w-[calc(100%-32px)] max-w-[420px]"
    >
      <motion.div style={{ width: pillWidth, y: drop }} className="mx-auto p-1.5 rounded-full bg-zinc-900/75 backdrop-blur-2xl glass-float">
        <motion.div
          ref={trackRef}
          style={{ height: rowHeight }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerCancel}
          onLostPointerCapture={handlePointerCancel}
          className="relative grid grid-cols-5 touch-none select-none [-webkit-touch-callout:none]"
        >
          <motion.span
            aria-hidden
            style={{ x, scaleX, scaleY }}
            className={`pointer-events-none absolute inset-y-0 left-0 w-1/5 rounded-full border-[0.5px] border-white/10 shadow-[inset_0_1px_1px_rgba(255,255,255,0.14)] transition-colors duration-200 ${
              pressed ? 'bg-white/[0.16]' : 'bg-white/[0.1]'
            }`}
          />

          {ITEMS.map(({ tab, label, icon: Icon }, index) => {
            const lit = index === litIndex;
            const isCart = tab === 'cart';

            return (
              <button
                key={tab}
                type="button"
                aria-current={tab === page ? 'page' : undefined}
                aria-label={isCart && cartCount > 0 ? `Coș, ${cartCount} produse` : undefined}
                // Pointer taps are handled by the track; this only answers the keyboard and screen readers.
                onClick={event => {
                  if (event.detail === 0) select(index);
                }}
                className={`relative h-full min-w-0 rounded-full flex flex-col items-center justify-center gap-1 px-0.5 text-[10px] font-semibold uppercase tracking-wide transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D4EAE6] ${
                  lit ? 'text-[#D4EAE6]' : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <motion.span style={{ y: iconY }} className="relative shrink-0">
                  {/* Kept on its own layer, so the small lift of the lit tab never makes the icon shimmer. */}
                  <motion.span
                    className="block will-change-transform"
                    animate={{ scale: lit ? 1.1 : 1 }}
                    transition={{ type: 'spring', stiffness: 520, damping: 36 }}
                  >
                    <Icon size={18} strokeWidth={2} />
                  </motion.span>
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
                </motion.span>

                <motion.span style={{ opacity: labelOpacity, y: labelY }} className="relative leading-none truncate max-w-full">
                  {label}
                </motion.span>
              </button>
            );
          })}
        </motion.div>
      </motion.div>
    </motion.nav>
  );
}
