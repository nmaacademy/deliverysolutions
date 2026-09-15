import { MenuItem } from '../types';

/**
 * Presentation config for the Home page. It never duplicates products: it only points at ids that
 * live in the menu, plus the demo-only figures (rating, prep time) a prototype needs to look real.
 */

export interface HomeCategory {
  id: string;
  /** What the customer reads. May differ from the value stored on the products. */
  label: string;
  /** The exact `MenuItem.category` value this card filters by. */
  menuCategory: string;
  /** Used only when the category has no available product to borrow a photo from. */
  image: string;
}

export const HOME_CATEGORIES: HomeCategory[] = [
  {
    id: 'ciorbe',
    label: 'Ciorbe',
    menuCategory: 'Ciorbe',
    image: 'https://images.unsplash.com/photo-1547592166-23ac45744acd?auto=format&fit=crop&q=80&w=400',
  },
  {
    id: 'principale',
    label: 'Feluri principale',
    menuCategory: 'Feluri principale',
    image: 'https://images.unsplash.com/photo-1558030006-450675393462?auto=format&fit=crop&q=80&w=400',
  },
  {
    id: 'salate',
    label: 'Salate',
    menuCategory: 'Salate',
    image: 'https://images.unsplash.com/photo-1546793665-c74683f339c1?auto=format&fit=crop&q=80&w=400',
  },
  // The products are stored under the older "Desert" category; only the label was modernised.
  {
    id: 'deserturi',
    label: 'Deserturi',
    menuCategory: 'Desert',
    image: 'https://images.unsplash.com/photo-1624353365286-3f8d62daad51?auto=format&fit=crop&q=80&w=400',
  },
  {
    id: 'aperitive',
    label: 'Aperitive',
    menuCategory: 'Aperitive',
    image: 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&q=80&w=400',
  },
  {
    id: 'bauturi',
    label: 'Băuturi',
    menuCategory: 'Băuturi',
    image: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&q=80&w=400',
  },
];

/** A category shows off its own food when it has any, and falls back to the configured photo. */
export function categoryImage(menuItems: MenuItem[], category: HomeCategory) {
  const product = menuItems.find(item => item.category === category.menuCategory && item.available);
  return product?.image ?? category.image;
}

/**
 * The original "Meniul zilei" selection, by id. It is now only the default: the manager owns the
 * selection through `MenuItem.isDailyMenu`, and this list answers for products saved before that
 * flag existed.
 */
export const DAILY_MENU_IDS = ['m4', 'm13', 'm6', 'm5'];

/**
 * The single rule for "is this product in Meniul zilei".
 *
 * The flag lives on the product, so a manager's choice rides the normal menu sync (localStorage →
 * Supabase → Realtime). `undefined` means the product was stored before the flag existed and keeps
 * the original selection; an explicit `false` always wins, so a default product removed in the
 * manager does not come back after a refresh.
 */
export function isDailyMenuItem(item: MenuItem): boolean {
  return item.isDailyMenu ?? DAILY_MENU_IDS.includes(item.id);
}

/**
 * The products "Meniul zilei" shows: every selected one that is on sale, in menu order.
 *
 * Unlike `resolveShowcase` this never tops the list up with products the manager did not pick, and
 * never trims it: a sold-out pick simply drops out until it is available again.
 */
export function dailyMenuItems(menuItems: MenuItem[]): MenuItem[] {
  return menuItems.filter(item => item.available && isDailyMenuItem(item));
}

/** Products featured in "Preparate apreciate", by id. */
export const POPULAR_IDS = ['m1', 'm15', 'm8', 'm9'];

export interface ShowcaseMeta {
  /** Demo figure. There are no reviews, accounts or ratings behind this prototype. */
  rating: number;
  /** Demo figure: roughly how long the kitchen would take. */
  prepMinutes: number;
}

const SHOWCASE_META: Record<string, ShowcaseMeta> = {
  m1: { rating: 4.9, prepMinutes: 15 },
  m4: { rating: 4.8, prepMinutes: 30 },
  m5: { rating: 4.7, prepMinutes: 25 },
  m6: { rating: 4.8, prepMinutes: 22 },
  m8: { rating: 4.9, prepMinutes: 12 },
  m9: { rating: 4.7, prepMinutes: 10 },
  m13: { rating: 4.8, prepMinutes: 20 },
  m15: { rating: 4.7, prepMinutes: 14 },
};

const FALLBACK_RATINGS = [4.7, 4.8, 4.9];
const FALLBACK_MINUTES = [12, 18, 25];

/** Stable stand-in, so a product added later still shows plausible figures instead of blanks. */
export function showcaseMeta(item: MenuItem): ShowcaseMeta {
  const configured = SHOWCASE_META[item.id];
  if (configured) return configured;

  const seed = [...item.id].reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return {
    rating: FALLBACK_RATINGS[seed % FALLBACK_RATINGS.length],
    prepMinutes: FALLBACK_MINUTES[seed % FALLBACK_MINUTES.length],
  };
}

/**
 * "Oferte speciale": three products dressed up as restaurant ads at the end of the Home page.
 *
 * The config never carries a price. The card shows the product's own price, so the advert, the
 * product page and the cart can never disagree — this prototype has no discount pipeline behind it.
 */
export interface SpecialOffer {
  id: string;
  /** The product the card advertises and opens. */
  itemId: string;
  /** Advertising headline. Kept to a few words: it is set large and wraps onto two lines. */
  title: string;
  /** One short line under the headline. */
  description: string;
  /** Small pill above the headline, e.g. "Specialitatea casei". */
  kicker: string;
}

export const SPECIAL_OFFERS: SpecialOffer[] = [
  {
    id: 'vita',
    itemId: 'm4',
    title: 'Vită fragedă la grătar',
    description: 'Sos demiglace și piure de trufe negre.',
    kicker: 'Specialitatea casei',
  },
  {
    id: 'caesar',
    itemId: 'm15',
    title: 'Caesar cu pui crocant',
    description: 'Parmezan ras și dressing clasic de casă.',
    kicker: 'Prânz ușor',
  },
  {
    id: 'lava',
    itemId: 'm8',
    title: 'Lava cake cu ciocolată',
    description: 'Înghețată de vanilie de Madagascar.',
    kicker: 'Dulcele final',
  },
];

/** An offer with the product it advertises already looked up. */
export interface ResolvedOffer extends SpecialOffer {
  item: MenuItem;
}

/**
 * The offers that can actually be ordered right now. An id the manager deleted, or a product that
 * sold out, simply drops out of the section instead of advertising something unavailable.
 */
export function specialOffers(menuItems: MenuItem[]): ResolvedOffer[] {
  return SPECIAL_OFFERS.flatMap(offer => {
    const item = menuItems.find(candidate => candidate.id === offer.itemId);
    return item && item.available ? [{ ...offer, item }] : [];
  });
}

/**
 * Turns a list of configured ids into real products.
 *
 * Ids that no longer exist or are sold out simply drop out, and the list is topped up with the first
 * available products so a section is never left half empty.
 */
export function resolveShowcase(menuItems: MenuItem[], ids: string[], count: number): MenuItem[] {
  const picked = ids
    .map(id => menuItems.find(item => item.id === id))
    .filter((item): item is MenuItem => !!item && item.available);

  const filler = menuItems.filter(item => item.available && !picked.some(chosen => chosen.id === item.id));

  return [...picked, ...filler].slice(0, count);
}
