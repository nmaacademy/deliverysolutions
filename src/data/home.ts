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

/** Products featured in "Meniul zilei", by id. Missing or sold-out ids are skipped, never fatal. */
export const DAILY_MENU_IDS = ['m4', 'm13', 'm6', 'm5'];

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
