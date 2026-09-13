import { CSSProperties, ReactNode, useRef } from 'react';
import { motion, useIsPresent, type Variants } from 'motion/react';
import { ENTER, EXIT } from '../../lib/motion';

interface Props {
  children: ReactNode;
  /** 1 when this page sits to the right of the previous one on the navbar, -1 when it sits to the left. */
  direction: number;
}

/**
 * Pins a screen that is on its way out exactly where it was on screen. The next screen then restores
 * its own scroll without dragging the leaving one along, so neither of them jumps. Must be used inside
 * a keyed child of an AnimatePresence.
 */
export function usePinWhileLeaving(): CSSProperties | undefined {
  const isPresent = useIsPresent();
  // Read in the render where the screen starts leaving, which is before the next screen scrolls.
  const leavingFrom = useRef<number | null>(null);
  if (isPresent) {
    leavingFrom.current = null;
    return undefined;
  }
  if (leavingFrom.current === null) leavingFrom.current = window.scrollY;
  return {
    position: 'fixed',
    top: -leavingFrom.current,
    left: 0,
    right: 0,
    pointerEvents: 'none',
    // Scale around the middle of what is on screen, not the middle of the whole (much taller) page.
    transformOrigin: `50% ${leavingFrom.current + window.innerHeight / 2}px`,
  };
}

const TRAVEL_PX = 20;

/** The incoming page reads `direction` from its own `custom`; the outgoing one gets the latest from AnimatePresence. */
const variants: Variants = {
  enter: (direction: number) => ({ opacity: 0, transform: `translateX(${direction * TRAVEL_PX}px)` }),
  center: {
    opacity: 1,
    transform: 'translateX(0px)',
    // Left on, a transform would make the page the containing block of its fixed elements.
    transitionEnd: { transform: 'none' },
    transition: ENTER,
  },
  exit: (direction: number) => ({
    opacity: 0,
    transform: `translateX(${direction * -TRAVEL_PX}px)`,
    transition: EXIT,
  }),
};

/**
 * One customer page inside the tab transition. It must be the keyed child of an AnimatePresence.
 * Pages slide a short way in the direction the navbar lens travels while cross-fading, and the outgoing
 * page drifts the other way, pinned in place. Opacity and transform only, both on one curve, so the
 * slide and the fade land on the same frame and neither waits for the main thread.
 */
export default function PageTransition({ children, direction }: Props) {
  const pin = usePinWhileLeaving();

  return (
    <motion.div
      variants={variants}
      custom={direction}
      initial="enter"
      animate="center"
      exit="exit"
      className="min-w-0"
      style={pin}
    >
      {children}
    </motion.div>
  );
}
