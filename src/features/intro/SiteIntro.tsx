import { useCallback, useEffect, useRef, useState } from 'react';
import { motion, useReducedMotion, type Variants } from 'motion/react';
import { pinPage } from '../../lib/scrollLock';
import { EASE_OUT } from '../../lib/motion';

/**
 * The fullscreen clip that plays once when a visitor arrives on the customer side.
 *
 * It owns everything about the video: autoplay, the loader, the skip control and every way playback
 * can fail. The shell only decides whether it is on screen and what happens when it is done, so the
 * rule for "has this been seen" lives next to it in `introSession.ts` rather than inside App.
 *
 * Nothing here is allowed to trap the visitor. Autoplay refused, a missing file, a decode error or a
 * connection too slow to start within `START_TIMEOUT_MS` all end the same way: the intro hands over
 * and the site appears. Once playback has actually begun the timeout is dropped, so a long clip is
 * never cut off part way through.
 */

/** Copy the clip to `public/videos/intro.mp4`; it is served from here, never bundled. */
const VIDEO_SRC = '/videos/intro.mp4';

/**
 * Framing for `object-fit: cover`. A wide clip loses its sides on a phone held upright; move this to
 * `'50% 30%'` or `'left center'` to keep the part that matters, rather than forking the component.
 */
const VIDEO_OBJECT_POSITION = 'center';

/** The skip control fades in only after the opening moment, so it never competes with it. */
const SKIP_AFTER_MS = 1500;
/** How long the visitor may be held on the loader before the site is shown regardless. */
const START_TIMEOUT_MS = 5000;
/** With reduced motion there is no clip at all, just a still frame long enough not to flash. */
const REDUCED_MOTION_HOLD_MS = 400;

const FADE_IN = { duration: 0.4, ease: EASE_OUT } as const;

/**
 * The overlay fades while the clip pushes in very slightly, which reads as the site coming forward
 * rather than the video being switched off. Children follow the parent's `exit`, so both land together.
 */
const OVERLAY: Variants = {
  visible: { opacity: 1 },
  hidden: { opacity: 0 },
};

const MEDIA: Variants = {
  visible: { transform: 'scale(1)' },
  hidden: { transform: 'scale(1.04)' },
};

export interface SiteIntroProps {
  /**
   * Called exactly once, when the clip ends or the visitor leaves it early. It fires as the exit
   * animation starts, so the shell can reveal the site underneath at the same time.
   */
  onComplete: () => void;
}

export default function SiteIntro({ onComplete }: SiteIntroProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  // Guards the one-shot handover: `ended`, `error` and the timeout can all land in the same tick,
  // and StrictMode runs every effect twice.
  const completedRef = useRef(false);

  const [hasStarted, setHasStarted] = useState(false);
  const [canSkip, setCanSkip] = useState(false);

  const reducedMotion = useReducedMotion();

  const complete = useCallback(() => {
    if (completedRef.current) return;
    completedRef.current = true;
    onComplete();
  }, [onComplete]);

  // The page must not scroll behind the overlay. `pinPage` hands back its own undo, and the overlay
  // stays mounted through the exit animation, so scrolling returns only once it is really gone.
  useEffect(() => pinPage(), []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') complete();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [complete]);

  // Reduced motion: no clip, no movement. Hold the plate briefly, then hand over.
  useEffect(() => {
    if (!reducedMotion) return;
    const timer = window.setTimeout(complete, REDUCED_MOTION_HOLD_MS);
    return () => window.clearTimeout(timer);
  }, [reducedMotion, complete]);

  useEffect(() => {
    if (reducedMotion) return;
    const timer = window.setTimeout(() => setCanSkip(true), SKIP_AFTER_MS);
    return () => window.clearTimeout(timer);
  }, [reducedMotion]);

  // The escape hatch for a file that never arrives. It is dropped the moment playback begins, so a
  // clip longer than the timeout still plays to its end.
  useEffect(() => {
    if (reducedMotion || hasStarted) return;
    const timer = window.setTimeout(complete, START_TIMEOUT_MS);
    return () => window.clearTimeout(timer);
  }, [reducedMotion, hasStarted, complete]);

  /**
   * `autoPlay` already asks the browser to start; this asks again where the answer is observable.
   * A refusal (a policy that wants a gesture first) rejects the promise, which would otherwise be an
   * uncaught error in the console and a visitor stuck on the loader for the full timeout.
   */
  const startPlayback = useCallback(() => {
    const video = videoRef.current;
    if (!video || !video.paused) return;

    const attempt = video.play() as Promise<void> | undefined;
    attempt?.catch(() => complete());
  }, [complete]);

  useEffect(() => {
    if (reducedMotion) return;
    startPlayback();
  }, [reducedMotion, startPlayback]);

  const showLoader = !reducedMotion && !hasStarted;

  return (
    <motion.div
      variants={OVERLAY}
      initial="visible"
      animate="visible"
      exit="hidden"
      transition={{ duration: 0.5, ease: EASE_OUT }}
      // Above every sheet, toast and navbar. Opaque, so the app behind it cannot be seen or clicked.
      className="fixed inset-0 z-[200] h-[100dvh] w-full overflow-hidden bg-zinc-900"
    >
      {!reducedMotion && (
        <motion.div variants={MEDIA} transition={{ duration: 0.7, ease: EASE_OUT }} className="absolute inset-0">
          <video
            ref={videoRef}
            src={VIDEO_SRC}
            autoPlay
            muted
            playsInline
            preload="auto"
            // Decorative: it carries no information and has no sound, so it is not exposed or focusable.
            aria-hidden="true"
            tabIndex={-1}
            disablePictureInPicture
            // Two more chances to start, for a browser that ignored `autoPlay` because nothing was
            // buffered yet. Both no-op once playback is under way, so the clip never restarts.
            onLoadedData={startPlayback}
            onCanPlay={startPlayback}
            onPlaying={() => setHasStarted(true)}
            onEnded={complete}
            onError={complete}
            style={{ objectPosition: VIDEO_OBJECT_POSITION }}
            className="h-full w-full object-cover"
          />
        </motion.div>
      )}

      {/* Keeps the skip control legible over a bright frame, without dimming the clip itself. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-gradient-to-b from-zinc-900/45 via-transparent to-zinc-900/35"
      />

      {showLoader && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={FADE_IN}
          role="status"
          className="absolute inset-0 flex flex-col items-center justify-center gap-4 text-zinc-300"
        >
          <span
            aria-hidden="true"
            className="h-7 w-7 animate-spin rounded-full border-2 border-white/15 border-t-[#D4EAE6]"
          />
          <span className="text-[13px] font-medium tracking-wide">Pregătim experiența...</span>
        </motion.div>
      )}

      {canSkip && (
        <motion.button
          type="button"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={FADE_IN}
          onClick={complete}
          // Clears the notch and the rounded corner in both orientations.
          style={{
            top: 'calc(env(safe-area-inset-top) + 12px)',
            right: 'calc(env(safe-area-inset-right) + 12px)',
            outlineColor: '#D4EAE6',
          }}
          className="absolute inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full border-[0.5px] border-white/15 bg-black/40 px-5 text-[10px] font-bold uppercase tracking-[0.15em] text-white/90 backdrop-blur-md transition hover:bg-black/60 hover:text-white active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2"
        >
          Sari peste
        </motion.button>
      )}
    </motion.div>
  );
}
