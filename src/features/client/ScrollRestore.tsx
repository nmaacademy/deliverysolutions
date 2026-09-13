import { useEffect, useRef } from 'react';

interface Props {
  /** Offset to jump to. Read once, on mount, so it never fights the visitor's own scrolling. */
  top: number;
}

/**
 * Put this inside a customer page that is keyed by its tab: it mounts with the page, right after the
 * new content is in the DOM, and puts the scroll back where that tab was left. A tab opened for the
 * first time is passed 0, so it starts at the top.
 */
export default function ScrollRestore({ top }: Props) {
  const target = useRef(top);

  useEffect(() => {
    window.scrollTo({ top: target.current, behavior: 'auto' });
  }, []);

  return null;
}
