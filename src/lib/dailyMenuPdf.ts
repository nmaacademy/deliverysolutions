import type { Content, CustomTableLayout, TDocumentDefinitions } from 'pdfmake/interfaces';
import { MenuItem } from '../types';
import { showcaseMeta } from '../data/home';
import { formatTime } from './format';
import { toRasterImage, type RasterImage } from './imageData';

/**
 * Builds and downloads the "Meniul zilei" PDF.
 *
 * The document is written declaratively and handed to pdfmake, which paginates it — no print
 * dialog, no screenshot of the page. pdfmake and its embedded Roboto fonts weigh about 2MB
 * together, so they are imported on the first export instead of riding along in the app's initial
 * bundle. Roboto carries the Romanian diacritics (ă â î ș ț), which the PDF standard fonts do not.
 */

// A4 portrait, in points, the unit pdfmake lays out in.
const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const MARGIN_X = 48;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN_X * 2;

// Print palette: paper stays near-white, ink stays dark, and the app's mint appears as an accent.
// #D4EAE6 itself is far too light to read as text, so text accents use a deeper shade of it.
const PAPER = '#FDFCFA';
const CARD_BG = '#F7F6F2';
const INK = '#1C1C21';
const INK_SOFT = '#55555F';
const INK_MUTED = '#8C8C96';
const ACCENT = '#D4EAE6';
const ACCENT_INK = '#2F6B62';

/** Thumbnail box, in points. Photos are fitted inside it; they never fill it by stretching. */
const THUMB = 84;

type PdfMake = typeof import('pdfmake/build/pdfmake');

let pdfMakePromise: Promise<PdfMake> | null = null;

async function importPdfMake(): Promise<PdfMake> {
  const [makeModule, vfsModule] = await Promise.all([
    import('pdfmake/build/pdfmake'),
    import('pdfmake/build/vfs_fonts'),
  ]);

  // Both files are UMD builds, so the bundler may hand them back on `default` or as the namespace.
  const pdfMake = (makeModule as { default?: PdfMake }).default ?? makeModule;
  const vfs = (vfsModule as unknown as { default?: unknown }).default ?? vfsModule;

  pdfMake.addVirtualFileSystem(vfs as Parameters<PdfMake['addVirtualFileSystem']>[0]);
  return pdfMake;
}

/**
 * Loaded once per session. A rejected load is not kept here, so a failure that happened after the
 * chunk arrived (the virtual file system, say) can be retried by clicking again.
 *
 * A failure to *fetch* the chunk cannot be undone from here: the browser records the module as
 * errored in its module map and every later `import()` of the same URL rejects with the cached
 * error. That is why the message shown in the manager asks for a reload.
 */
function loadPdfMake(): Promise<PdfMake> {
  if (!pdfMakePromise) {
    pdfMakePromise = importPdfMake().catch(error => {
      pdfMakePromise = null;
      throw error;
    });
  }
  return pdfMakePromise;
}

/** "Marți, 15 septembrie 2026" — `ro-RO` starts the weekday lowercase, the heading wants it capital. */
function formatRomanianDate(date: Date): string {
  const text = new Intl.DateTimeFormat('ro-RO', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date);
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** "35 RON", and "35,50 RON" for the rare price that is not a round number. */
function formatPrice(price: number): string {
  const rounded = Math.round(price * 100) / 100;
  const text = Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(2).replace('.', ',');
  return `${text} RON`;
}

function fileNameFor(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, '0');
  return `meniul-zilei-${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}.pdf`;
}

/** No borders, a cream body and a mint spine down the left edge of every product. */
const CARD_LAYOUT: CustomTableLayout = {
  hLineWidth: () => 0,
  vLineWidth: () => 0,
  fillColor: (_rowIndex, _node, columnIndex) => (columnIndex === 0 ? ACCENT : CARD_BG),
  paddingLeft: columnIndex => (columnIndex === 0 ? 0 : 14),
  paddingRight: columnIndex => (columnIndex === 2 ? 16 : 0),
  paddingTop: () => 14,
  paddingBottom: () => 14,
};

/**
 * Stands in for a photo that could not be read: the product's initial on a mint tile.
 *
 * It is drawn on a canvas and embedded as an image rather than assembled out of pdfmake nodes,
 * because that is the one way to get text centred on a filled square that always occupies exactly
 * the same box as a real photo would.
 */
function placeholderThumb(item: MenuItem): string | null {
  const initial = (item.name.trim().charAt(0) || '?').toUpperCase();
  // Twice the 84pt box, so the letter is still crisp when the page is printed.
  const size = THUMB * 2;

  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;

  try {
    const context = canvas.getContext('2d');
    if (!context) return null;

    context.fillStyle = ACCENT;
    context.fillRect(0, 0, size, size);

    context.fillStyle = ACCENT_INK;
    context.font = `600 ${Math.round(size * 0.42)}px "Segoe UI", Roboto, system-ui, sans-serif`;
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText(initial, size / 2, size / 2 + size * 0.02);

    return canvas.toDataURL('image/png');
  } catch {
    return null;
  } finally {
    canvas.width = 0;
    canvas.height = 0;
  }
}

/**
 * One product, as an unbreakable block so a card is never split across a page boundary.
 *
 * The name takes the leftover width and wraps; the price is measured from its own content and sits
 * to the right of it, so a long name pushes the text down a line instead of running under the price.
 */
function productCard(item: MenuItem, image: RasterImage | null): Content {
  const prepMinutes = item.prepTimeMinutes ?? showcaseMeta(item).prepMinutes;
  // A photo that could not be read falls back to the tile; if even that fails, the card keeps its
  // thumbnail column as empty space rather than collapsing into a different shape.
  const thumb = image?.dataUrl ?? placeholderThumb(item);

  const details: Content[] = [
    {
      columns: [
        { width: '*', text: item.name, fontSize: 13.5, bold: true, color: INK, lineHeight: 1.15 },
        {
          width: 'auto',
          text: formatPrice(item.price),
          // Without this a long product name squeezes the column until "120 RON" breaks in two.
          noWrap: true,
          fontSize: 13,
          bold: true,
          color: ACCENT_INK,
          alignment: 'right',
          margin: [14, 1, 0, 0],
        },
      ],
      columnGap: 0,
    },
    {
      text: item.category.toUpperCase(),
      fontSize: 7.5,
      characterSpacing: 1.2,
      color: INK_MUTED,
      margin: [0, 6, 0, 0],
    },
    { text: item.description, fontSize: 9.5, color: INK_SOFT, lineHeight: 1.35, margin: [0, 7, 0, 0] },
  ];

  if (prepMinutes > 0) {
    details.push({
      text: `Timp de preparare · ${prepMinutes} min`,
      fontSize: 8.5,
      color: INK_MUTED,
      margin: [0, 8, 0, 0],
    });
  }

  return {
    unbreakable: true,
    margin: [0, 0, 0, 12],
    table: {
      // The 3pt first column is the mint spine; it has no content, only a fill.
      widths: [3, THUMB, '*'],
      body: [[
        '',
        // `fit` scales the photo into the box on both axes at once, so it is never distorted.
        thumb ? { image: thumb, fit: [THUMB, THUMB] } : { text: '' },
        { stack: details },
      ]],
    },
    layout: CARD_LAYOUT,
  };
}

function documentHeader(now: Date): Content {
  const centre = CONTENT_WIDTH / 2;
  return {
    stack: [
      {
        text: 'RESTAURANT DEMO',
        fontSize: 8.5,
        characterSpacing: 3.4,
        color: INK_MUTED,
        alignment: 'center',
      },
      {
        text: 'MENIUL ZILEI',
        fontSize: 30,
        bold: true,
        characterSpacing: 2.5,
        color: INK,
        alignment: 'center',
        margin: [0, 12, 0, 0],
      },
      {
        // A hairline rule broken by a small mint lozenge in the middle.
        canvas: [
          { type: 'line', x1: centre - 100, y1: 4, x2: centre - 12, y2: 4, lineWidth: 0.9, lineColor: ACCENT },
          { type: 'ellipse', x: centre, y: 4, r1: 3, r2: 3, color: ACCENT },
          { type: 'line', x1: centre + 12, y1: 4, x2: centre + 100, y2: 4, lineWidth: 0.9, lineColor: ACCENT },
        ],
        margin: [0, 16, 0, 0],
      },
      {
        text: formatRomanianDate(now),
        fontSize: 11,
        color: INK_SOFT,
        alignment: 'center',
        margin: [0, 14, 0, 0],
      },
      {
        text: 'Preparate disponibile astăzi',
        fontSize: 9,
        color: INK_MUTED,
        alignment: 'center',
        margin: [0, 5, 0, 28],
      },
    ],
  };
}

function buildDocument(items: MenuItem[], images: (RasterImage | null)[], now: Date): TDocumentDefinitions {
  const generatedAt = `${formatRomanianDate(now)}, ${formatTime(now)}`;

  return {
    pageSize: 'A4',
    pageOrientation: 'portrait',
    pageMargins: [MARGIN_X, 56, MARGIN_X, 54],
    defaultStyle: { font: 'Roboto', fontSize: 10, color: INK },
    info: {
      title: `Meniul zilei · ${formatRomanianDate(now)}`,
      author: 'Restaurant Demo',
      subject: 'Meniul zilei',
    },
    background: () => ({
      canvas: [{ type: 'rect', x: 0, y: 0, w: PAGE_WIDTH, h: PAGE_HEIGHT, color: PAPER }],
    }),
    content: [documentHeader(now), ...items.map((item, index) => productCard(item, images[index]))],
    footer: (currentPage: number, pageCount: number) => ({
      margin: [MARGIN_X, 18, MARGIN_X, 0],
      columns: [
        { width: '*', text: `Meniul zilei · generat la ${generatedAt}`, fontSize: 7.5, color: INK_MUTED },
        {
          width: 'auto',
          text: `Pagina ${currentPage} din ${pageCount}`,
          fontSize: 7.5,
          color: INK_MUTED,
          alignment: 'right',
        },
      ],
    }),
  };
}

/**
 * Renders the given products and starts the download.
 *
 * Callers pass the list they already resolved with `dailyMenuItems(menuItems)`, so the file always
 * matches what the Home page is showing at that moment. Nothing here reads or writes the menu.
 */
export async function exportDailyMenuPdf(items: MenuItem[]): Promise<void> {
  if (items.length === 0) throw new Error('Nu există produse disponibile în meniul zilei');

  const now = new Date();

  // The library and the photos are independent, and no photo can reject: a broken one resolves to
  // `null` and becomes a placeholder, so one dead link never costs the whole export.
  const [pdfMake, images] = await Promise.all([
    loadPdfMake(),
    Promise.all(items.map(item => toRasterImage(item.image))),
  ]);

  // `download` saves the blob straight to disk; it never opens the browser's print dialog.
  await pdfMake.createPdf(buildDocument(items, images, now)).download(fileNameFor(now));
}
