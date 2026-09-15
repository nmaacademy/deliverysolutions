/**
 * Turns product photos into data URLs that can be embedded in a generated file.
 *
 * Product images come from three places in this demo: an external URL (Unsplash), a data URL pasted
 * in by the manager's upload, or nothing at all. Anything that can go wrong on the way — a dead
 * link, a host without CORS headers, a request that never answers — has to end as a `null` the
 * caller can draw a placeholder for, never as a thrown error.
 */

/** A decoded picture: the embeddable data URL plus the pixel size it was written at. */
export interface RasterImage {
  dataUrl: string;
  width: number;
  height: number;
}

/** Long enough for a slow phone connection, short enough that one dead host cannot hang an export. */
const LOAD_TIMEOUT_MS = 8000;
/** Longest edge in pixels. A menu thumbnail is ~85pt wide, so this stays sharp at print density. */
const DEFAULT_MAX_EDGE = 360;
const JPEG_QUALITY = 0.82;

/**
 * Decodes one image, with a timeout and without leaving the element or its request behind.
 *
 * `crossOrigin` is what makes a remote photo readable back off the canvas: without it the canvas is
 * tainted and `toDataURL` throws. Hosts that do not send the CORS header simply fail to load here,
 * which is the outcome we want anyway.
 */
function decodeImage(src: string, timeoutMs: number): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    let timer = 0;

    const cleanup = () => {
      window.clearTimeout(timer);
      image.onload = null;
      image.onerror = null;
    };

    image.onload = () => {
      cleanup();
      resolve(image);
    };

    image.onerror = () => {
      cleanup();
      // Drop the src so the browser abandons a request that is still in flight.
      image.src = '';
      reject(new Error(`image failed to load: ${src.slice(0, 64)}`));
    };

    timer = window.setTimeout(() => {
      cleanup();
      image.src = '';
      reject(new Error(`image timed out: ${src.slice(0, 64)}`));
    }, timeoutMs);

    if (!src.startsWith('data:')) image.crossOrigin = 'anonymous';
    image.src = src;
  });
}

/**
 * Scales a photo down to `maxEdge` and returns it as a JPEG data URL.
 *
 * The scale is the same on both axes, so the photo is never stretched; the caller decides how much
 * room to give it. Returns `null` for anything that could not be read, so a single broken picture
 * costs one placeholder rather than the whole document.
 */
export async function toRasterImage(
  src: string | undefined,
  maxEdge: number = DEFAULT_MAX_EDGE,
  timeoutMs: number = LOAD_TIMEOUT_MS,
): Promise<RasterImage | null> {
  if (!src) return null;

  let image: HTMLImageElement;
  try {
    image = await decodeImage(src, timeoutMs);
  } catch {
    return null;
  }

  const sourceWidth = image.naturalWidth || image.width;
  const sourceHeight = image.naturalHeight || image.height;
  if (sourceWidth === 0 || sourceHeight === 0) return null;

  // Never scale up: a small photo stays small rather than being blown out into a blurry one.
  const scale = Math.min(1, maxEdge / Math.max(sourceWidth, sourceHeight));
  const width = Math.max(1, Math.round(sourceWidth * scale));
  const height = Math.max(1, Math.round(sourceHeight * scale));

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  try {
    const context = canvas.getContext('2d');
    if (!context) return null;

    // JPEG has no alpha channel, so a transparent PNG would otherwise flatten onto black.
    context.fillStyle = '#FFFFFF';
    context.fillRect(0, 0, width, height);
    context.drawImage(image, 0, 0, width, height);

    // Throws a SecurityError if the host served the photo without CORS headers.
    return { dataUrl: canvas.toDataURL('image/jpeg', JPEG_QUALITY), width, height };
  } catch {
    return null;
  } finally {
    // Release the decoded bitmap and the canvas backing store instead of waiting for the GC.
    canvas.width = 0;
    canvas.height = 0;
    image.src = '';
  }
}
