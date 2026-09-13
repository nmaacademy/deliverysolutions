import { useState } from 'react';
import { useMotionValueEvent, useScroll } from 'motion/react';
import { isPagePinned } from '../../lib/scrollLock';

/** Blur layers: faint over the whole strip, a little stronger only right at the screen edge. */
const BLUR_LAYERS = [
  'backdrop-blur-[1px] [mask-image:linear-gradient(to_bottom,black_30%,transparent)]',
  'backdrop-blur-[3px] [mask-image:linear-gradient(to_bottom,black_15%,transparent_60%)]',
  'backdrop-blur-[6px] [mask-image:linear-gradient(to_bottom,black,transparent_35%)]',
];

/** The tint follows an eased curve, so it thins out gradually and never ends on a visible line. */
const TINT =
  'bg-[linear-gradient(to_bottom,rgb(24_24_27/0.78)_0%,rgb(24_24_27/0.66)_16%,rgb(24_24_27/0.5)_34%,rgb(24_24_27/0.32)_52%,rgb(24_24_27/0.17)_70%,rgb(24_24_27/0.06)_86%,rgb(24_24_27/0)_100%)]';

/**
 * Where the page slides under the top of the screen: a tall, soft strip of tint and light blur that
 * fades in once the page starts scrolling, so nothing is dimmed at rest.
 */
export default function TopEdgeFade() {
  const { scrollY } = useScroll();
  const [scrolled, setScrolled] = useState(() => window.scrollY > 8);
  // Only flips at the threshold, so scrolling itself re-renders nothing and the fade is a CSS transition.
  // A sheet pinning the page drops scrollY to 0 without the visitor scrolling. The fade holds; lifting
  // it for that moment lit up whatever sat under it at the top of the page, right as the sheet opened.
  useMotionValueEvent(scrollY, 'change', y => {
    if (!isPagePinned()) setScrolled(y > 8);
  });

  // Faded per layer rather than on a wrapper: an ancestor below full opacity would cut the layers'
  // backdrop blur off from the page behind them.
  const fade = `absolute inset-0 transition-opacity duration-300 ease-[cubic-bezier(0.23,1,0.32,1)] ${scrolled ? 'opacity-100' : 'opacity-0'}`;

  return (
    <div aria-hidden className="pointer-events-none fixed inset-x-0 top-0 z-30 h-[calc(env(safe-area-inset-top)+88px)]">
      {BLUR_LAYERS.map(layer => (
        <div key={layer} className={`${fade} ${layer}`} />
      ))}
      <div className={`${fade} ${TINT}`} />
    </div>
  );
}
