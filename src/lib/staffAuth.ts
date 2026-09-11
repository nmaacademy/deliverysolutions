// Staff sign-in with an authenticator app (one account per role).
// Frontend-only for now: the secrets ship in the browser bundle, so this gates the screens
// but is not real security. Move the check to a server before handling real data.

export type StaffRole = 'admin' | 'kitchen' | 'courier';

export const STAFF_ROLE_LABELS: Record<StaffRole, string> = {
  kitchen: 'Bucătărie',
  courier: 'Curier',
  admin: 'Manager',
};

/** Name the account is listed under in the authenticator app. */
export const TOTP_ISSUER = 'Restaurant Demo';

// Public demo keys, used until VITE_TOTP_SECRET_<ROLE> (base32) is set.
const DEMO_SECRETS: Record<StaffRole, string> = {
  admin: 'KVKFKRCPNZQUYMLXOVYDSQKJKZDTSRLD',
  kitchen: 'MFRGGZDFMZTWQ2LKNNWG23TPOBYXE43U',
  courier: 'GEZDGNBVGY3TQOJQMNXW24DMMV2GK4TT',
};

const ENV_SECRETS: Record<StaffRole, string | undefined> = {
  admin: import.meta.env.VITE_TOTP_SECRET_ADMIN,
  kitchen: import.meta.env.VITE_TOTP_SECRET_KITCHEN,
  courier: import.meta.env.VITE_TOTP_SECRET_COURIER,
};

export const secretFor = (role: StaffRole) => ENV_SECRETS[role]?.trim() || DEMO_SECRETS[role];

export const usesDemoSecret = (role: StaffRole) => !ENV_SECRETS[role]?.trim();

const SESSION_KEY = 'delivery_app_staff_session';
const SESSION_MS = 12 * 60 * 60 * 1000;

export function readStaffSession(): StaffRole | null {
  try {
    const session = JSON.parse(localStorage.getItem(SESSION_KEY) ?? 'null') as { role: StaffRole; expiresAt: number } | null;
    return session && session.role in STAFF_ROLE_LABELS && session.expiresAt > Date.now() ? session.role : null;
  } catch {
    return null;
  }
}

export const startStaffSession = (role: StaffRole) =>
  localStorage.setItem(SESSION_KEY, JSON.stringify({ role, expiresAt: Date.now() + SESSION_MS }));

export const endStaffSession = () => localStorage.removeItem(SESSION_KEY);

/** Off for now: staff screens open freely until VITE_STAFF_AUTH=true. */
export const STAFF_AUTH_ENABLED = import.meta.env.VITE_STAFF_AUTH === 'true';

/** Managers can open every staff screen; everyone else only their own. */
export const canOpen = (session: StaffRole | null, screen: StaffRole) =>
  !STAFF_AUTH_ENABLED || session === 'admin' || session === screen;
