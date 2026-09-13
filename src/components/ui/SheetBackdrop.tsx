import { motion, type Transition } from 'motion/react';
import { SHEET_ENTER, SHEET_EXIT } from '../../lib/motion';

interface Props {
  className?: string;
  /** Blur radius in px. */
  blur?: number;
  /** Darkening, 0..1. */
  tint?: number;
  /** Timing in and out. Defaults to the sheet timing, so the backdrop lands with the sheet it sits behind. */
  enter?: Transition;
  exit?: Transition;
  onClick?: () => void;
}

/**
 * The layer behind every sheet. The blur radius and the tint are fixed and the layer itself fades, so
 * the page underneath still softens gradually. Fading opacity runs on the compositor; growing the blur
 * radius frame by frame would redo the blur on the main thread and stutter under the moving sheet.
 */
export function SheetBackdrop({ className = '', blur = 18, tint = 0.55, enter = SHEET_ENTER, exit = SHEET_EXIT, onClick }: Props) {
  const filter = `blur(${blur}px)`;
  return (
    <motion.div
      aria-hidden
      onClick={onClick}
      className={`fixed inset-0 ${className}`}
      style={{ backgroundColor: `rgba(9, 9, 11, ${tint})`, backdropFilter: filter, WebkitBackdropFilter: filter }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1, transition: enter }}
      exit={{ opacity: 0, transition: exit }}
    />
  );
}
