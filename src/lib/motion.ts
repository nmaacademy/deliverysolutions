import type { Transition, Variants } from 'motion/react';

/**
 * The customer app's motion vocabulary, in one place so every screen moves the same way.
 *
 * House rules:
 * - Cards and rows never just appear: a group of them enters in sequence, 30-50ms apart.
 * - One element, one timing. Opacity, position and scale share a duration and a curve, so they land
 *   together. A fade that finishes while the element is still travelling is what reads as lag.
 * - Entrances animate opacity and a full `transform` string only. Motion can hand those to the
 *   compositor, so they stay smooth while the new screen is still mounting on the main thread.
 * - No blur filter on cards or pages: it repaints the whole layer on every frame. Blur is kept for
 *   small text swaps, where it hides the crossfade.
 * - No scale on content that enters with a page. A scaled layer is drawn soft and sharpens again when
 *   the animation ends, which reads as the items still settling after they have arrived.
 * - Content inside a page rises; only the page itself travels sideways. Two sideways motions would
 *   run against each other whenever the page comes in from the left.
 * - Exits are shorter than entrances.
 */

/** Strong ease-out: moves at once, lands softly. For everything that enters or leaves. */
export const EASE_OUT = [0.23, 1, 0.32, 1] as const;
/** Strong ease-in-out, for things changing in place on screen (a progress bar, a height). */
export const EASE_IN_OUT = [0.77, 0, 0.175, 1] as const;
/** The iOS sheet curve, for sheets rising over the app. */
export const EASE_DRAWER = [0.32, 0.72, 0, 1] as const;

export const ENTER: Transition = { duration: 0.28, ease: EASE_OUT };
export const EXIT: Transition = { duration: 0.18, ease: EASE_OUT };
/** A small swap inside an element: a number rolling, a label changing. */
export const SWAP: Transition = { duration: 0.2, ease: EASE_OUT };
/** A sheet and everything choreographed with it: its backdrop and the app stepping back behind it. */
export const SHEET_ENTER: Transition = { duration: 0.4, ease: EASE_DRAWER };
export const SHEET_EXIT: Transition = { duration: 0.26, ease: EASE_DRAWER };

/** Presses and toggles stay on a spring, so a quick second tap retargets instead of restarting. */
export const SPRING_SNAPPY: Transition = { type: 'spring', stiffness: 520, damping: 32 };

/** Parent of a staggered group. `delay` leaves room for the page itself to start arriving first. */
export const staggerGroup = (stagger = 0.03, delay = 0): Variants => ({
  hidden: {},
  show: { transition: { staggerChildren: stagger, delayChildren: delay } },
});

/** A card or row rising into place from slightly below. */
export const riseItem: Variants = {
  hidden: { opacity: 0, transform: 'translateY(8px)' },
  show: {
    opacity: 1,
    transform: 'translateY(0px)',
    // Left on, a transform would make the item the containing block of anything fixed inside it.
    transitionEnd: { transform: 'none' },
    transition: ENTER,
  },
};

/** A tile in a horizontal row inside a sheet, sliding in from the side the row scrolls towards. */
export const slideItem: Variants = {
  hidden: { opacity: 0, transform: 'translateX(12px)' },
  show: {
    opacity: 1,
    transform: 'translateX(0px)',
    transitionEnd: { transform: 'none' },
    transition: ENTER,
  },
};

/**
 * Spread on the parent of a staggered group: the sequence starts when the group scrolls into view and
 * plays once per visit to the page.
 */
export const revealOnView = {
  initial: 'hidden',
  whileInView: 'show',
  viewport: { once: true, amount: 0.12 },
} as const;

/** Spread on the parent of a staggered group that is on screen from the start (a sheet, a dialog). */
export const revealOnMount = {
  initial: 'hidden',
  animate: 'show',
} as const;
