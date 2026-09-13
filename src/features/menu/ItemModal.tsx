import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { ArrowLeft, Check } from 'lucide-react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import { MenuItem, Extra } from '../../types';
import { triggerVibration } from '../../lib/haptics';
import { FadeInImage } from '../../components/ui/FadeInImage';
import ExtraOptionTile from './ExtraOptionTile';
import QuantityControl from './QuantityControl';

interface Props {
  item: MenuItem;
  onClose: () => void;
  onAdd: (item: MenuItem, quantity: number, extras: Extra[]) => void;
}

/** A "fără ..." extra takes something out of the dish instead of adding to it. */
const isRemoval = (name: string) => /^f[aă]r[aă]\b/i.test(name.trim());

const FOCUSABLE = 'button:not([disabled]), [href], input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])';

export default function ItemModal({ item, onClose, onAdd }: Props) {
  const [quantity, setQuantity] = useState(1);
  const [selectedExtras, setSelectedExtras] = useState<Extra[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();
  const titleId = useId();
  const descriptionId = useId();

  const soldOut = !item.available || item.stock <= 0;
  const maxQuantity = Math.max(1, item.stock);

  // Extras without a group predate the field and are treated as ingredients, so older products
  // and anything restored from localStorage keep rendering in the customisation row.
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

  // Body scroll is pinned with position:fixed rather than overflow:hidden, so the offset survives
  // iOS Safari and the page comes back exactly where it was when the details close.
  useEffect(() => {
    const scrollY = window.scrollY;
    const { body } = document;
    const previous = {
      position: body.style.position,
      top: body.style.top,
      left: body.style.left,
      right: body.style.right,
      width: body.style.width,
    };
    body.style.position = 'fixed';
    body.style.top = `-${scrollY}px`;
    body.style.left = '0';
    body.style.right = '0';
    body.style.width = '100%';

    return () => {
      body.style.position = previous.position;
      body.style.top = previous.top;
      body.style.left = previous.left;
      body.style.right = previous.right;
      body.style.width = previous.width;
      window.scrollTo(0, scrollY);
    };
  }, []);

  // Focus moves into the dialog on open and returns to whatever opened it on close.
  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    dialogRef.current?.querySelector<HTMLElement>(FOCUSABLE)?.focus();
    return () => opener?.focus?.();
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

  /** The backdrop is only a close target on desktop, where the details are a centered modal. */
  const handleBackdropClick = () => {
    if (typeof window !== 'undefined' && window.matchMedia('(min-width: 640px)').matches) onClose();
  };

  const sectionTitle = 'text-[15px] font-semibold tracking-tight text-white';

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: reduceMotion ? 0 : 0.25 }}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-zinc-950/80 backdrop-blur-xl"
      onClick={handleBackdropClick}
    >
      <motion.div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 32, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 32, scale: 0.98 }}
        transition={{ type: 'spring', stiffness: 380, damping: 34, opacity: { duration: 0.18, ease: 'easeOut' } }}
        onClick={(e) => e.stopPropagation()}
        className="relative isolate flex flex-col w-full h-[100dvh] sm:h-auto sm:max-h-[88svh] sm:max-w-lg bg-zinc-900 overflow-hidden sm:rounded-[36px] sm:border-[0.5px] sm:border-white/10 shadow-[0_-8px_40px_rgba(0,0,0,0.6)]"
      >
        {/* Back button: outside the scroller, so it stays reachable and never crops the dish photo. */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Înapoi"
          title="Înapoi"
          className="absolute left-4 top-[calc(env(safe-area-inset-top)+12px)] sm:top-4 z-20 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-full bg-zinc-800/60 backdrop-blur-2xl border-[0.5px] border-white/20 text-zinc-100 shadow-[inset_0_1px_1px_rgba(255,255,255,0.15),0_4px_24px_rgba(0,0,0,0.35)] transition-colors hover:bg-zinc-700/70 hover:text-white active:bg-zinc-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D4EAE6]"
        >
          <ArrowLeft size={20} />
        </button>

        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain no-scrollbar">
          {/* Hero: nothing but the circular crop of the dish, on the dialog's own background. */}
          <div className="relative z-10 h-[300px] sm:h-[248px] shrink-0 pointer-events-none">
            <motion.div
              initial={reduceMotion ? false : { scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 260, damping: 26, delay: 0.05 }}
              className="absolute left-1/2 -translate-x-1/2 top-[72px] sm:top-[44px] w-[220px] h-[220px] sm:w-[200px] sm:h-[200px] rounded-full overflow-hidden border-[0.5px] border-white/15 shadow-[0_12px_28px_rgba(0,0,0,0.3)]"
            >
              <FadeInImage src={item.image} alt={item.name} className="w-full h-full" />
            </motion.div>
          </div>

          {/* Information panel, lifted so the bottom third of the photo leans over the grey. The top
              padding is that overlap plus breathing room, so the title never runs under the circle. */}
          <motion.div
            initial={reduceMotion ? false : { y: 16, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.3, ease: 'easeOut', delay: 0.05 }}
            className="relative z-0 -mt-[76px] pt-[92px] sm:-mt-[64px] sm:pt-[84px] rounded-t-[40px] bg-white/[0.05] backdrop-blur-2xl border-t border-white/10 shadow-[inset_0_1px_1px_rgba(255,255,255,0.08)] px-5 pb-8"
          >
            <div className="flex items-start justify-between gap-4">
              <h2 id={titleId} className="text-[22px] sm:text-2xl font-sans font-semibold tracking-tight text-white leading-tight min-w-0">
                {item.name}
              </h2>
              <span className="text-[#D4EAE6] text-lg font-medium whitespace-nowrap shrink-0">{item.price} RON</span>
            </div>

            <p id={descriptionId} className="mt-2.5 text-[13px] leading-relaxed text-zinc-400">
              {item.description}
            </p>

            {soldOut && (
              <p className="mt-4 inline-flex items-center min-h-[32px] px-3 rounded-full bg-red-500/10 border-[0.5px] border-red-400/30 text-[12px] text-red-200">
                Indisponibil momentan
              </p>
            )}

            {ingredients.length > 0 && (
              <section className="mt-8" aria-label={ingredientsTitle}>
                <h3 className={sectionTitle}>{ingredientsTitle}</h3>
                <p className="mt-1 text-[12px] text-zinc-500">Selectează ingredientele preferate</p>

                <div
                  role="group"
                  aria-label={ingredientsTitle}
                  className="mt-4 -mx-5 px-5 flex gap-3 overflow-x-auto no-scrollbar snap-x snap-mandatory"
                >
                  {ingredients.map(extra => (
                    <ExtraOptionTile
                      key={extra.id}
                      extra={extra}
                      variant="ingredient"
                      selected={!!selectedExtras.find(e => e.id === extra.id)}
                      onToggle={toggleExtra}
                    />
                  ))}
                </div>
              </section>
            )}

            {recommended.length > 0 && (
              <section className="mt-8" aria-label="Îți recomandăm">
                <h3 className={sectionTitle}>Îți recomandăm</h3>
                <p className="mt-1 text-[12px] text-zinc-500">Se adaugă la acest preparat</p>

                <div
                  role="group"
                  aria-label="Îți recomandăm"
                  className="mt-4 -mx-5 px-5 flex gap-3 overflow-x-auto no-scrollbar snap-x snap-mandatory"
                >
                  {recommended.map(extra => (
                    <ExtraOptionTile
                      key={extra.id}
                      extra={extra}
                      variant="recommended"
                      selected={!!selectedExtras.find(e => e.id === extra.id)}
                      onToggle={toggleExtra}
                    />
                  ))}
                </div>
              </section>
            )}
          </motion.div>
        </div>

        {/* Actions, pinned under the scroller so the last tile row is never covered. */}
        <div className="shrink-0 flex items-center justify-between gap-2 sm:gap-3 px-3 sm:px-5 pt-3 border-t border-white/10 bg-zinc-900/70 backdrop-blur-2xl shadow-[0_-8px_30px_rgba(0,0,0,0.45)] pb-[calc(env(safe-area-inset-bottom)+12px)]">
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
            className="flex-1 min-w-0 max-w-[176px] h-[52px] rounded-full bg-[#D4EAE6] text-zinc-900 font-medium text-[14px] sm:text-[15px] flex items-center justify-center px-3 transition-colors hover:bg-[#B8D6D1] shadow-[0_8px_32px_rgba(212,234,230,0.2)] disabled:bg-zinc-700 disabled:text-zinc-400 disabled:shadow-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D4EAE6] focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-900"
          >
            <AnimatePresence mode="wait" initial={false}>
              {soldOut ? (
                <span key="soldout" className="truncate">Indisponibil momentan</span>
              ) : isAdding ? (
                <motion.span
                  key="adding"
                  initial={reduceMotion ? false : { scale: 0.6, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={reduceMotion ? undefined : { scale: 1.3, opacity: 0 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                  className="flex items-center gap-2 whitespace-nowrap"
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
                  className="whitespace-nowrap"
                >
                  Adaugă în coș
                </motion.span>
              )}
            </AnimatePresence>
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
}
