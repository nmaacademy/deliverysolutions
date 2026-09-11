import { CartItem, Extra } from '../types';

export const DELIVERY_FEE = 15;

export const extrasTotal = (extras: Extra[]) => extras.reduce((sum, e) => sum + e.price, 0);

export const lineTotal = (item: CartItem) =>
  (item.menuItem.price + extrasTotal(item.selectedExtras)) * item.quantity;

export const cartSubtotal = (cart: CartItem[]) => cart.reduce((sum, item) => sum + lineTotal(item), 0);
