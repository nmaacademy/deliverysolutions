const ALLOWED_SCROLL = '[data-scroll-lock-allow]';

/**
 * Locks the document under a sheet without changing its position. Keeping `body` in place is
 * important: fixed UI such as the bottom navbar must keep the exact same viewport reference while a
 * sheet opens and closes. The non-passive touch guard also covers iOS/PWA versions that ignore
 * `overflow: hidden` on the document; the sheet's own marked scroller remains fully usable.
 */
export function pinPage(): () => void {
  const scrollY = window.scrollY;
  const { body, documentElement } = document;
  const previous = {
    bodyOverflow: body.style.overflow,
    rootOverflow: documentElement.style.overflow,
  };

  const preventBackgroundScroll = (event: TouchEvent | WheelEvent) => {
    const target = event.target as Element | null;
    if (!target?.closest(ALLOWED_SCROLL) && event.cancelable) event.preventDefault();
  };

  documentElement.dataset.pagePinned = 'true';
  documentElement.style.overflow = 'hidden';
  body.style.overflow = 'hidden';
  document.addEventListener('touchmove', preventBackgroundScroll, { passive: false });
  document.addEventListener('wheel', preventBackgroundScroll, { passive: false });

  return () => {
    document.removeEventListener('touchmove', preventBackgroundScroll);
    document.removeEventListener('wheel', preventBackgroundScroll);
    documentElement.style.overflow = previous.rootOverflow;
    body.style.overflow = previous.bodyOverflow;
    delete documentElement.dataset.pagePinned;

    // Normally the offset never changes. Restore only as a safety net, avoiding the redundant
    // scrollTo that previously generated a scroll event and nudged scroll-reactive fixed chrome.
    if (Math.abs(window.scrollY - scrollY) > 1) window.scrollTo(0, scrollY);
  };
}

/** Lets scroll-reactive chrome ignore any browser-generated scroll event while a sheet is open. */
export const isPagePinned = () => document.documentElement.dataset.pagePinned === 'true';
