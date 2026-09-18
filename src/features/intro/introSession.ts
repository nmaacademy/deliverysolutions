import type { Route } from '../../lib/routes';

/**
 * The "once per tab" rule for the opening clip.
 *
 * `sessionStorage`, not `localStorage`: the intro should come back on the next visit, just not on
 * every navigation or refresh inside the one the visitor is already in. Closing the tab clears it.
 *
 * The key carries a version so a future change to the clip or the intro itself can show again to
 * people whose tab is still open, by bumping the suffix.
 */
const SEEN_KEY = 'retetar_intro_seen_v2';

/**
 * Whether the clip should play for this arrival.
 *
 * Staff open their screens directly and often many times a day, so the intro belongs only to the
 * customer pages. The route comes from the shell's own `routeFromUrl()` result; this never looks at
 * the URL itself, so there is still exactly one router.
 */
export function shouldPlayIntro(route: Route): boolean {
  if (route.staff) return false;

  try {
    return sessionStorage.getItem(SEEN_KEY) === null;
  } catch {
    // Private mode or storage blocked: show it, rather than breaking the arrival over a preference.
    return true;
  }
}

/**
 * Records that the visitor has been through it. Called when the intro finishes or is skipped, never
 * when it starts, so a reload part way through still gets the full opening.
 */
export function markIntroSeen(): void {
  try {
    sessionStorage.setItem(SEEN_KEY, '1');
  } catch {
    // Without storage the intro repeats on the next page load. Harmless, and nothing to recover.
  }
}
