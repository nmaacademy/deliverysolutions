/**
 * Shared vertical measurements for the customer pages, so the fixed navbar and the pinned order
 * trackers never end up covering content. The bottom side is a CSS variable instead
 * (--client-nav-space in index.css), because it has to include env(safe-area-inset-bottom).
 */

/** Vertical slot one active-order tracker pill takes up when pinned above a page. */
export const TRACKER_SLOT_PX = 72;

/** Breathing room between the top of the screen and a page's first element. */
const TOP_GAP_PX = 16;

/** At most two trackers are allowed to push content down; the rest stack behind them. */
export const trackerInset = (trackerCount = 0) => Math.min(trackerCount, 2) * TRACKER_SLOT_PX;

/**
 * Top padding for a customer page: the notch, a small gap, and room for any trackers pinned above.
 * Returned as a CSS value so env(safe-area-inset-top) survives into the inline style.
 */
export const clientTopPadding = (trackerCount = 0) =>
  `calc(env(safe-area-inset-top) + ${TOP_GAP_PX + trackerInset(trackerCount)}px)`;

/** Where the pinned trackers themselves start. Same origin the pages pad against. */
export const TRACKER_TOP = 'top-[calc(env(safe-area-inset-top)+16px)]';

/** Bottom padding for a customer page, so the last item clears the fixed navbar. */
export const CLIENT_PAGE_BOTTOM = 'pb-[calc(var(--client-nav-space)+32px)]';
