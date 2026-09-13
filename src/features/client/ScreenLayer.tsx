import { motion, type HTMLMotionProps } from 'motion/react';
import { usePinWhileLeaving } from './PageTransition';

/**
 * One full screen of the app (the customer tabs, the cart, the order page, a staff screen) as a keyed
 * child of the shell's AnimatePresence. While it leaves it stays pinned where it was, so the screen
 * coming in can scroll to its own position underneath without making this one jump.
 */
export default function ScreenLayer({ style, ...props }: HTMLMotionProps<'div'>) {
  const pin = usePinWhileLeaving();
  return <motion.div {...props} style={{ ...style, ...pin }} />;
}
