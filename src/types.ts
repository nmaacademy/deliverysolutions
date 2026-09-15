export type OrderType = 'livrare' | 'ridicare';
export type OrderStatus = 'Comandă primită' | 'În preparare' | 'Pe drum' | 'Gata de ridicare' | 'Preluată de curier' | 'Livrată' | 'Ridicată' | 'Refuzată';
export type PaymentMethod = 'card' | 'cash';

/** Who moved the order: used to keep each screen inside its own allowed transitions. */
export type OrderActor = 'client' | 'kitchen' | 'courier' | 'admin';

export interface OrderStatusEvent {
  status: OrderStatus;
  actor: OrderActor;
  at: string;
}

/**
 * Where an extra belongs on the product page. 'ingredient' covers add-ons and the "fără ..."
 * customisations; 'recommended' is the upsell row. Missing group reads as 'ingredient', so extras
 * stored before this field existed (localStorage, saved orders) keep working unchanged.
 */
export type ExtraGroup = 'ingredient' | 'recommended';

export interface Extra {
  id: string;
  name: string;
  price: number;
  /** Optional thumbnail for the visual tile. Without it the tile falls back to an initial badge. */
  image?: string;
  group?: ExtraGroup;
}

export interface MenuItem {
  id: string;
  category: string;
  name: string;
  description: string;
  price: number;
  image: string;
  available: boolean;
  stock: number;
  extras?: Extra[];
  /** Estimated prep time in minutes. Missing values fall back to a fixed demo value. */
  prepTimeMinutes?: number;
  /**
   * Featured in "Meniul zilei" on the Home page, picked by the manager. Missing means the product
   * predates the flag, so it falls back to the original hardcoded selection; see `isDailyMenuItem`.
   */
  isDailyMenu?: boolean;
}

export interface CartItem {
  id: string;
  menuItem: MenuItem;
  quantity: number;
  selectedExtras: Extra[];
}

export interface Order {
  id: string;
  items: CartItem[];
  status: OrderStatus;
  type: OrderType;
  total: number;
  customerName: string;
  customerPhone?: string;
  time: string; // e.g. "Cât mai repede (30–45 min)" or a specific time
  paymentMethod?: PaymentMethod;
  createdAt: Date;
  address?: string;
  coordinates?: {
    lat: number;
    lng: number;
  };
  /** ISO timestamp of the last status change. Older stored orders get it filled in on read. */
  updatedAt?: string;
  /** Every status the order passed through, oldest first. Optional for backwards compatibility. */
  statusHistory?: OrderStatusEvent[];
}
