import { StaffRole } from './staffAuth';

/**
 * Two separate kinds of destination live behind the URL:
 *
 * - the customer's four pages, which are tabs of one app and swap without a reload;
 * - the staff screens, which each open in their own browser tab.
 *
 * Cart, checkout and order tracking are screens pushed over the customer app, not pages of their
 * own, so they keep the URL of the page they were opened from.
 */
export type ClientPage = 'home' | 'map' | 'menu' | 'profile';

/**
 * What the bottom navbar can point at. The cart is a screen pushed over the customer app rather than
 * a page of it, so it gets a tab but no URL of its own.
 */
export type ClientTab = ClientPage | 'cart';

/** URL segment for each customer page. Home is the site root. */
export const CLIENT_ROUTES: Record<ClientPage, string> = {
  home: '',
  map: 'harta',
  menu: 'meniu',
  profile: 'profil',
};

/**
 * URL segment each staff screen lives at, so the customer, kitchen and courier screens can be opened
 * in three separate tabs. vercel.json serves index.html for these paths, so a refresh keeps working.
 */
export const STAFF_ROUTES: Record<StaffRole, string> = { kitchen: 'bucatarie', courier: 'curier', admin: 'admin' };

export const staffUrl = (role: StaffRole) => `/${STAFF_ROUTES[role]}`;

export const clientUrl = (page: ClientPage) => `/${CLIENT_ROUTES[page]}`;

export interface Route {
  /** Set only when the URL points at a staff screen. */
  staff: StaffRole | null;
  page: ClientPage;
}

function currentSegment() {
  // Older links used English names or a hash (/#courier); keep accepting them.
  return window.location.pathname.replace(/^\/+|\/+$/g, '') || window.location.hash.replace(/^#\/?/, '');
}

/** Where the current URL points. Anything unknown lands on the customer home page. */
export function routeFromUrl(): Route {
  const segment = currentSegment();

  const staff = (Object.keys(STAFF_ROUTES) as StaffRole[]).find(
    role => STAFF_ROUTES[role] === segment || role === segment,
  );
  if (staff) return { staff, page: 'home' };

  const page = (Object.keys(CLIENT_ROUTES) as ClientPage[]).find(
    value => CLIENT_ROUTES[value] === segment || value === segment,
  );
  return { staff: null, page: page ?? 'home' };
}
