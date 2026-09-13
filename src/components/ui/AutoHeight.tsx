import { ReactNode, useLayoutEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { EASE_OUT } from '../../lib/motion';

/** Room kept around the content inside the clipping box, so focus rings and glows are not cut off. */
const BLEED_PX = 12;

/**
 * Grows and shrinks smoothly with whatever is inside it, so a card never keeps empty space for content
 * that is not there and never jumps when a step, a map or an extra field appears.
 */
export function AutoHeight({ children }: { children: ReactNode }) {
  const contentRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState<number | null>(null);

  useLayoutEffect(() => {
    const content = contentRef.current;
    if (!content) return;
    const observer = new ResizeObserver(() => setHeight(content.offsetHeight));
    observer.observe(content);
    return () => observer.disconnect();
  }, []);

  return (
    <motion.div
      className="overflow-hidden"
      style={{ margin: -BLEED_PX, padding: BLEED_PX }}
      initial={false}
      animate={{ height: height === null ? 'auto' : height + BLEED_PX * 2 }}
      transition={{ duration: 0.26, ease: EASE_OUT }}
    >
      <div ref={contentRef}>{children}</div>
    </motion.div>
  );
}
