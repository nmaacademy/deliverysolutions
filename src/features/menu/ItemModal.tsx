import { startTransition, useEffect, useId, useMemo, useRef, useState } from 'react';
import { ArrowLeft, Check } from 'lucide-react';
import { motion, AnimatePresence, animate, useMotionValue, useReducedMotion, type Variants } from 'motion/react';
import { MenuItem, Extra } from '../../types';
import { triggerVibration } from '../../lib/haptics';
import { extrasTotal } from '../../lib/pricing';
import { EASE_OUT, ENTER, EXIT, SHEET_ENTER, SHEET_EXIT, SWAP, revealOnMount, slideItem, staggerGroup } from '../../lib/motion';
import { pinPage } from '../../lib/scrollLock';
import { FadeInImage } from '../../components/ui/FadeInImage';
import { SheetBackdrop } from '../../components/ui/SheetBackdrop';
import ExtraOptionRow, { isRemoval } from './ExtraOptionRow';
import QuantityControl from './QuantityControl';
import UpsellTile from './UpsellTile';

interface Props {
  item: MenuItem;
  onClose: () => void;
  onAdd: (item: MenuItem, quantity: number, extras: Extra[]) => void;
}

const FOCUSABLE = 'button:not([disabled]), [href], input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])';

/** Pull distance or flick speed (px/ms) past which letting go closes the sheet instead of snapping it back. */
const DISMISS_DISTANCE_PX = 120;
const DISMISS_VELOCITY = 0.6;

/**
 * How each block of the details comes in: it rises a little further and a little slower than the
 * page-wide riseItem, so the motion still reads against the sheet travelling up and lands just after it.
 */
const DETAIL_RISE: Variants = {
  hidden: { opacity: 0, transform: 'translateY(24px)' },
  show: {
    opacity: 1,
    transform: 'translateY(0px)',
    transitionEnd: { transform: 'none' },
    transition: { duration: 0.42, ease: EASE_OUT },
  },
};

const isDesktopViewport = () => typeof window !== 'undefined' && window.matchMedia('(min-width: 640px)').matches;

/**
 * The product page. On a phone it is a sheet that rises from the bottom and stops just under the
 * status bar, so a strip of the blurred page stays visible above it; pulling it down from the top
 * closes it. On a wide screen it is a centered card. Inside: the round photo of the dish leaning over
 * the details, the customisations as a checklist, the add-ons as a row of large photos, and a bar
 * pinned at the bottom with the quantity and a button that carries the running total.
 */
export default function ItemModal({ item, onClose, onAdd }: Props) {
  const [quantity, setQuantity] = useState(1);
  const [selectedExtras, setSelectedExtras] = useState<Extra[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [desktop] = useState(isDesktopViewport);
  // On a phone the sheet is built light, so it starts rising in the very first frame; the heavier part
  // (the checklist and the add-on photos) is built right after, as a transition, while the rise already
  // runs on the compositor. Built together, they held the start of the animation back by a few hundred
  // ms on a mid-range phone. A wide screen builds everything at once, since the card grows to its content.
  const [detailsReady, setDetailsReady] = useState(desktop);
  const dialogRef = useRef<HTMLDivElement>(null);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  // How far the sheet is being pulled down by the finger.
  const pullY = useMotionValue(0);
  const reduceMotion = useReducedMotion();
  const titleId = useId();
  const descriptionId = useId();

  const soldOut = !item.available || item.stock <= 0;
  const maxQuantity = Math.max(1, item.stock);
  const total = (item.price + extrasTotal(selectedExtras)) * quantity;
  const selectedIds = new Set(selectedExtras.map(extra => extra.id));

  // Extras without a group predate the field and are treated as ingredients, so older products
  // and anything restored from localStorage keep rendering in the customisation list.
  const { ingredients, recommended } = useMemo(() => {
    const all = item.extras ?? [];
    return {
      ingredients: all.filter(e => (e.group ?? 'ingredient') === 'ingredient'),
      recommended: all.filter(e => e.group === 'recommended'),
    };
  }, [item.extras]);

  // A product whose customisations are mostly removals is not really "adding" anything.
  const ingredientsTitle = useMemo(() => {
    const removals = ingredients.filter(e => isRemoval(e.name)).length;
    return removals > ingredients.length / 2 ? 'Personalizează preparatul' : 'Alege ce vrei să adaugi';
  }, [ingredients]);

  useEffect(() => {
    if (detailsReady) return;
    let frame = requestAnimationFrame(() => {
      frame = requestAnimationFrame(() => startTransition(() => setDetailsReady(true)));
    });
    return () => cancelAnimationFrame(frame);
  }, [detailsReady]);

  // The page behind stays exactly where it was while the details are open.
  useEffect(() => pinPage(), []);

  // Focus moves into the dialog on open and returns to whatever opened it on close.
  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    dialogRef.current?.querySelector<HTMLElement>(FOCUSABLE)?.focus({ preventScroll: true });
    return () => opener?.focus?.({ preventScroll: true });
  }, []);

  // Escape closes; Tab cycles inside the dialog instead of reaching the page behind it.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        onClose();
        return;
      }
      if (event.key !== 'Tab' || !dialogRef.current) return;

      const focusable = Array.from(dialogRef.current.querySelectorAll<HTMLElement>(FOCUSABLE));
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;

      if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      } else if (event.shiftKey && (active === first || !dialogRef.current.contains(active))) {
        event.preventDefault();
        last.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown, true);
    return () => document.removeEventListener('keydown', onKeyDown, true);
  }, [onClose]);

  // Pull to close, phone only. A downward swipe that starts while the content is scrolled to the top
  // moves the whole sheet instead of bouncing the content; letting go far enough, or with a flick,
  // closes it, anything less springs it back. Touch events rather than pointer events, because only a
  // non-passive touchmove can stop the browser from scrolling at the same time.
  useEffect(() => {
    const sheet = dialogRef.current;
    if (!sheet || desktop) return;
    let startX = 0;
    let startY = 0;
    let lastY = 0;
    let lastTime = 0;
    let velocity = 0;
    let pulling = false;

    const onStart = (event: TouchEvent) => {
      startX = event.touches[0].clientX;
      startY = lastY = event.touches[0].clientY;
      lastTime = event.timeStamp;
      velocity = 0;
      pulling = false;
    };
    const onMove = (event: TouchEvent) => {
      const { clientX, clientY } = event.touches[0];
      const dy = clientY - startY;
      const atTop = (scrollerRef.current?.scrollTop ?? 0) <= 0;
      if (!pulling && atTop && dy > 6 && dy > Math.abs(clientX - startX)) pulling = true;
      if (!pulling) return;
      event.preventDefault();
      pullY.set(Math.max(0, dy));
      velocity = (clientY - lastY) / Math.max(1, event.timeStamp - lastTime);
      lastY = clientY;
      lastTime = event.timeStamp;
    };
    const onEnd = () => {
      if (!pulling) return;
      pulling = false;
      if (pullY.get() > DISMISS_DISTANCE_PX || velocity > DISMISS_VELOCITY) {
        triggerVibration(10);
        onCloseRef.current();
      } else {
        animate(pullY, 0, { type: 'spring', stiffness: 420, damping: 36 });
      }
    };

    sheet.addEventListener('touchstart', onStart, { passive: true });
    sheet.addEventListener('touchmove', onMove, { passive: false });
    sheet.addEventListener('touchend', onEnd);
    sheet.addEventListener('touchcancel', onEnd);
    return () => {
      sheet.removeEventListener('touchstart', onStart);
      sheet.removeEventListener('touchmove', onMove);
      sheet.removeEventListener('touchend', onEnd);
      sheet.removeEventListener('touchcancel', onEnd);
    };
  }, [desktop, pullY]);

  const toggleExtra = (extra: Extra) => {
    triggerVibration(10);
    setSelectedExtras(prev =>
      prev.find(e => e.id === extra.id)
        ? prev.filter(e => e.id !== extra.id)
        : [...prev, extra]
    );
  };

  const handleQuantityChange = (next: number) => {
    triggerVibration(15);
    setQuantity(next);
  };

  const handleAdd = async () => {
    if (isAdding || soldOut) return;

    // Apple-style double haptic feedback for success
    triggerVibration([15, 30, 15]);

    setIsAdding(true);

    // Hold the success state briefly to show the animation
    await new Promise(resolve => setTimeout(resolve, 400));

    onAdd(item, quantity, selectedExtras);
  };

  const upsellPrice = (extra: Extra) => (extra.price > 0 ? `+${extra.price} RON` : 'Gratuit');

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end sm:items-center sm:justify-center sm:p-6">
      {/* Tapping the blurred page around the sheet closes it, on a phone as on a desktop. */}
      <SheetBackdrop
        onClick={onClose}
        blur={16}
        tint={desktop ? 0.6 : 0.5}
        enter={desktop ? ENTER : SHEET_ENTER}
        exit={desktop ? EXIT : SHEET_EXIT}
      />

      <motion.div
        initial={desktop ? { opacity: 0, transform: 'translateY(16px) scale(0.96)' } : { transform: 'translateY(100%)' }}
        animate={desktop ? { opacity: 1, transform: 'translateY(0px) scale(1)' } : { transform: 'translateY(0%)' }}
        exit={
          desktop
            ? { opacity: 0, transform: 'translateY(8px) scale(0.98)', transition: EXIT }
            : { transform: 'translateY(100%)', transition: SHEET_EXIT }
        }
        transition={desktop ? ENTER : SHEET_ENTER}
        className="relative w-full h-[calc(100%-env(safe-area-inset-top)-10px)] sm:h-auto sm:max-w-[480px]"
      >
        <motion.div
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          aria-describedby={descriptionId}
          style={{ y: pullY }}
          className="relative isolate flex flex-col h-full sm:h-auto sm:max-h-[min(88svh,780px)] bg-white/[0.05] overflow-hidden rounded-t-sheet sm:rounded-sheet border-t-[0.5px] border-white/15 shadow-[inset_0_1px_1px_rgba(255,255,255,0.12),0_-24px_60px_rgba(0,0,0,0.5)] sm:glass-float"
        >
          {/* Grab handle: the visible hint that the sheet can be pulled down. */}
          <span aria-hidden className="sm:hidden absolute top-2 left-1/2 -translate-x-1/2 z-20 w-9 h-[5px] rounded-full bg-white/25" />

          {/* Back button: outside the scroller, so it stays reachable and never crops the dish photo. */}
          <motion.button
            type="button"
            onClick={onClose}
            aria-label="Înapoi"
            title="Înapoi"
            whileTap={reduceMotion ? undefined : { scale: 0.9 }}
            className="absolute left-4 top-4 z-20 w-11 h-11 grid place-items-center rounded-full bg-zinc-900/60 backdrop-blur-xl glass-float text-zinc-100 transition-colors hover:bg-zinc-800/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D4EAE6]"
          >
            <ArrowLeft size={20} />
          </motion.button>

          <div ref={scrollerRef} data-scroll-lock-allow className="flex-1 min-h-0 flex flex-col overflow-y-auto overscroll-contain no-scrollbar">
            {/* Hero: the circular crop of the dish on the sheet's glass, where the blurred page shows through. */}
            <div className="relative z-10 h-[296px] sm:h-[248px] shrink-0 pointer-events-none">
              {/* The glass above the details closes the sheet when tapped, like the page around it. */}
              <div aria-hidden onClick={onClose} className="absolute inset-x-0 top-0 bottom-[76px] sm:bottom-[64px] pointer-events-auto cursor-pointer" />
              <motion.div
                initial={reduceMotion ? false : { opacity: 0, transform: 'scale(0.85)', filter: 'blur(8px)' }}
                animate={{ opacity: 1, transform: 'scale(1)', filter: 'blur(0px)', transitionEnd: { filter: 'none' } }}
                // The photo pops into focus while the sheet rises and comes to rest with it. One spring for
                // all three values, so they land together, and all three still run on the compositor.
                transition={{ type: 'spring', duration: 0.5, bounce: 0.25 }}
                // Taking taps, so one on the photo doesn't reach the glass behind it and close the sheet.
                className="pointer-events-auto absolute left-1/2 -translate-x-1/2 top-[52px] sm:top-[44px] w-[220px] h-[220px] sm:w-[200px] sm:h-[200px] rounded-full overflow-hidden ring-1 ring-white/15 shadow-[0_16px_40px_rgba(0,0,0,0.45)]"
              >
                <FadeInImage src={item.image} alt={item.name} className="w-full h-full" imageClassName={soldOut ? 'grayscale' : ''} />
              </motion.div>
            </div>

            {/* Details on a solid card, lifted so the bottom third of the photo leans over them. Each block
                rises in turn while the sheet travels: title, description, the checklist row by row, then
                the add-ons. */}
            <motion.div
              variants={staggerGroup(0.05, 0.1)}
              {...revealOnMount}
              className="relative z-0 flex-1 -mt-[76px] pt-[92px] sm:-mt-[64px] sm:pt-[84px] rounded-t-sheet bg-[#212124] shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)] px-5 sm:px-6 pb-8"
            >
              <motion.div variants={DETAIL_RISE} className="flex items-start justify-between gap-4">
                <h2 id={titleId} className="text-[22px] sm:text-2xl font-semibold tracking-tight text-white leading-tight min-w-0">
                  {item.name}
                </h2>
                <span className="text-[#D4EAE6] text-lg font-medium whitespace-nowrap shrink-0 tabular-nums">{item.price} RON</span>
              </motion.div>

              <motion.p variants={DETAIL_RISE} id={descriptionId} className="mt-2.5 text-[14px] leading-relaxed text-zinc-400">
                {item.description}
              </motion.p>

              {soldOut && (
                <motion.p variants={DETAIL_RISE} className="mt-4 inline-flex items-center min-h-[32px] px-3 rounded-full bg-red-500/10 border-[0.5px] border-red-400/30 text-[12px] text-red-200">
                  Indisponibil momentan
                </motion.p>
              )}

              {detailsReady && ingredients.length > 0 && (
                <motion.section variants={staggerGroup(0.035, 0.12)} {...revealOnMount} className="mt-8" aria-labelledby={`${titleId}-custom`}>
                  <motion.div variants={DETAIL_RISE} className="flex items-baseline justify-between gap-3">
                    <h3 id={`${titleId}-custom`} className="text-[17px] font-semibold tracking-tight text-white">
                      {ingredientsTitle}
                    </h3>
                    <span className="shrink-0 text-[12px] text-zinc-500">Opțional</span>
                  </motion.div>

                  <ul className="mt-1 divide-y divide-white/[0.06]">
                    {ingredients.map(extra => (
                      <motion.li key={extra.id} variants={DETAIL_RISE}>
                        <ExtraOptionRow
                          extra={extra}
                          selected={selectedIds.has(extra.id)}
                          disabled={soldOut}
                          onToggle={toggleExtra}
                        />
                      </motion.li>
                    ))}
                  </ul>
                </motion.section>
              )}

              {detailsReady && recommended.length > 0 && (
                <motion.section variants={staggerGroup(0.045, 0.22)} {...revealOnMount} className="mt-8" aria-labelledby={`${titleId}-upsell`}>
                  <motion.div variants={DETAIL_RISE}>
                    <h3 id={`${titleId}-upsell`} className="text-[17px] font-semibold tracking-tight text-white">
                      Ți-ar plăcea și astea
                    </h3>
                    <p className="mt-0.5 text-[12px] text-zinc-500">Se adaugă la acest preparat</p>
                  </motion.div>

                  <div
                    role="group"
                    aria-labelledby={`${titleId}-upsell`}
                    className="mt-3 -mx-5 sm:-mx-6 px-5 sm:px-6 py-1 flex gap-3 overflow-x-auto no-scrollbar snap-x snap-mandatory scroll-px-5 sm:scroll-px-6"
                  >
                    {recommended.map(extra => (
                      <motion.div key={extra.id} variants={slideItem} className="shrink-0 snap-start">
                        <UpsellTile
                          image={extra.image}
                          name={extra.name}
                          priceLabel={upsellPrice(extra)}
                          label={`${extra.name}, ${upsellPrice(extra)}`}
                          selected={selectedIds.has(extra.id)}
                          disabled={soldOut}
                          onPress={() => toggleExtra(extra)}
                        />
                      </motion.div>
                    ))}
                  </div>
                </motion.section>
              )}
            </motion.div>
          </div>

          {/* Quantity and the running total, pinned under the scroller so the last option is never covered.
              It travels with the sheet rather than fading in on its own, so the button never shows up as a
              pale pill ahead of the sheet. */}
          <div className="shrink-0 flex items-center gap-3 px-4 sm:px-6 pt-3 pb-[max(12px,env(safe-area-inset-bottom))] sm:pb-4 bg-zinc-900 border-t border-white/[0.06]">
            <div className="shrink-0" role="group" aria-label="Cantitate">
              <QuantityControl
                quantity={quantity}
                max={maxQuantity}
                onChange={handleQuantityChange}
                disabled={soldOut}
              />
            </div>

            <motion.button
              type="button"
              whileTap={reduceMotion || soldOut ? undefined : { scale: 0.97 }}
              onClick={handleAdd}
              disabled={isAdding || soldOut}
              className="flex-1 min-w-0 h-[52px] rounded-full bg-[#D4EAE6] text-zinc-900 font-semibold text-[15px] px-4 transition-colors hover:bg-[#B8D6D1] glow-opal disabled:bg-zinc-700 disabled:text-zinc-400 disabled:shadow-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D4EAE6] focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-900"
            >
              <AnimatePresence mode="wait" initial={false}>
                {soldOut ? (
                  <span key="soldout" className="block truncate text-center">Indisponibil momentan</span>
                ) : isAdding ? (
                  <motion.span
                    key="adding"
                    initial={reduceMotion ? false : { opacity: 0, scale: 0.9, filter: 'blur(2px)' }}
                    animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
                    exit={reduceMotion ? undefined : { opacity: 0, scale: 0.95, filter: 'blur(2px)' }}
                    transition={SWAP}
                    className="flex items-center justify-center gap-2 whitespace-nowrap"
                  >
                    <Check size={18} strokeWidth={3} />
                    Adăugat în coș
                  </motion.span>
                ) : (
                  <motion.span
                    key="add"
                    initial={reduceMotion ? false : { opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={reduceMotion ? undefined : { opacity: 0 }}
                    transition={SWAP}
                    // Label and total sit together in the middle, split by a dot, rather than at the two ends.
                    className="flex items-center justify-center gap-2 leading-5"
                  >
                    <span className="truncate">Adaugă în coș</span>
                    <span aria-hidden className="shrink-0 w-1 h-1 rounded-full bg-zinc-900/40" />
                    {/* The total rolls to its new value whenever the quantity or an extra changes. */}
                    <span className="relative shrink-0 h-5 overflow-hidden tabular-nums">
                      <AnimatePresence mode="popLayout" initial={false}>
                        <motion.span
                          key={total}
                          initial={reduceMotion ? false : { y: 14, opacity: 0, filter: 'blur(2px)' }}
                          animate={{ y: 0, opacity: 1, filter: 'blur(0px)' }}
                          exit={reduceMotion ? undefined : { y: -14, opacity: 0, filter: 'blur(2px)' }}
                          transition={SWAP}
                          className="block leading-5"
                        >
                          {total} RON
                        </motion.span>
                      </AnimatePresence>
                    </span>
                  </motion.span>
                )}
              </AnimatePresence>
            </motion.button>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}
