import { useState, useEffect } from 'react';
import { LayoutDashboard, ChefHat, Check, Package } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { initialMenu, mockOrders } from './data/mock';
import { MenuItem, Order, CartItem, OrderType, OrderStatus, Extra } from './types';
import { triggerVibration } from './lib/haptics';
import { cartSubtotal } from './lib/pricing';
import { getNextStatus } from './lib/orderFlow';
import { readMenu, readOrders, saveMenu, saveOrders, readMyOrderIds, saveMyOrderIds } from './lib/storage';
import MenuScreen from './features/menu/MenuScreen';
import ItemModal from './features/menu/ItemModal';
import CartScreen from './features/checkout/CartScreen';
import ConfirmationScreen from './features/checkout/ConfirmationScreen';
import ActiveOrderTracker from './features/checkout/ActiveOrderTracker';
import { isFinished } from './features/checkout/orderStatus';
import AdminScreen from './features/admin/AdminScreen';
import KitchenScreen from './features/kitchen/KitchenScreen';
import CourierScreen from './features/courier/CourierScreen';
import StaffLogin from './features/auth/StaffLogin';
import { StaffRole, STAFF_AUTH_ENABLED, canOpen, endStaffSession, readStaffSession, startStaffSession } from './lib/staffAuth';

type ViewState = 'menu' | 'cart' | 'confirmation' | 'admin' | 'kitchen' | 'courier';

// Staff screens can be opened directly by URL (e.g. /curier). vercel.json serves index.html for these paths.
const VIEW_PATHS: Partial<Record<ViewState, string>> = { admin: 'admin', kitchen: 'bucatarie', courier: 'curier' };

function viewFromUrl(): ViewState {
  // Older links used English names or a hash (/#courier); keep accepting them.
  const segment = window.location.pathname.replace(/^\/+|\/+$/g, '') || window.location.hash.slice(1);
  const view = (Object.keys(VIEW_PATHS) as ViewState[]).find(v => VIEW_PATHS[v] === segment || v === segment);
  return view ?? 'menu';
}

export default function App() {
  const [currentView, setCurrentView] = useState<ViewState>(viewFromUrl);

  useEffect(() => {
    const path = `/${VIEW_PATHS[currentView] ?? ''}`;
    if (window.location.pathname !== path || window.location.hash) {
      history.replaceState(null, '', path + window.location.search);
    }
  }, [currentView]);
  // Staff screens sit behind an authenticator-code login; the session lives in localStorage.
  const [staffRole, setStaffRole] = useState<StaffRole | null>(readStaffSession);
  const handleStaffLogin = (role: StaffRole) => {
    startStaffSession(role);
    setStaffRole(role);
  };
  const handleStaffLogout = () => {
    endStaffSession();
    setStaffRole(null);
    setCurrentView('menu');
  };
  const staffLogin = (role: StaffRole) => (
    <StaffLogin role={role} onSuccess={() => handleStaffLogin(role)} onBack={() => setCurrentView('menu')} />
  );

  const [menuItems, setMenuItems] = useState<MenuItem[]>(() => readMenu() ?? initialMenu);
  const [orders, setOrders] = useState<Order[]>(() => readOrders() ?? mockOrders);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [orderType, setOrderType] = useState<OrderType>('livrare');

  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
  // The customer's own orders are tracked by id and always read from `orders`, so status
  // changes made in the kitchen or courier tabs show up here through the storage sync.
  const [myOrderIds, setMyOrderIds] = useState<string[]>(readMyOrderIds);
  const [trackedOrderId, setTrackedOrderId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; id: number } | null>(null);

  const activeOrder = orders.find(o => o.id === trackedOrderId) ?? null;
  const myOrders = orders
    .filter(o => myOrderIds.includes(o.id))
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  useEffect(() => saveMenu(menuItems), [menuItems]);
  useEffect(() => saveOrders(orders), [orders]);
  useEffect(() => saveMyOrderIds(myOrderIds), [myOrderIds]);

  // Poll storage to simulate a realtime backend between tabs (client / kitchen / courier)
  useEffect(() => {
    const syncData = () => {
      const storedOrders = readOrders();
      if (storedOrders) {
        setOrders(prev => JSON.stringify(prev) !== JSON.stringify(storedOrders) ? storedOrders : prev);
      }
      const storedMenu = readMenu();
      if (storedMenu) {
        setMenuItems(prev => JSON.stringify(prev) !== JSON.stringify(storedMenu) ? storedMenu : prev);
      }
    };

    const interval = setInterval(syncData, 3000);
    window.addEventListener('storage', syncData);

    return () => {
      clearInterval(interval);
      window.removeEventListener('storage', syncData);
    };
  }, []);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const cartItemsCount = cart.reduce((acc, item) => acc + item.quantity, 0);

  const handleAddToCart = (item: MenuItem, quantity: number, extras: Extra[]) => {
    const cartItemId = `${item.id}-${extras.map(e => e.id).sort().join('-')}`;

    setCart(prev => {
      const existing = prev.find(i => i.id === cartItemId);
      if (existing) {
        return prev.map(i => i.id === cartItemId ? { ...i, quantity: i.quantity + quantity } : i);
      }
      return [...prev, { id: cartItemId, menuItem: item, quantity, selectedExtras: extras }];
    });
    setSelectedItem(null);
    setToast({ message: `${quantity}x ${item.name} adăugat în coș`, id: Date.now() });
  };

  const handlePlaceOrder = (orderData: Partial<Order>) => {
    let id: string;
    do {
      id = `ORD-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`;
    } while (orders.some(o => o.id === id));

    const newOrder: Order = {
      id,
      items: orderData.items || [],
      status: 'Comandă primită',
      type: orderData.type || 'livrare',
      total: orderData.total || 0,
      customerName: orderData.customerName || '',
      customerPhone: orderData.customerPhone || '',
      address: orderData.address,
      coordinates: orderData.coordinates,
      time: orderData.time || '',
      paymentMethod: orderData.paymentMethod,
      createdAt: new Date()
    };

    // Deduct stock for ordered items
    setMenuItems(prev => {
      const itemsToDeduct = new Map<string, number>();
      newOrder.items.forEach(cartItem => {
        itemsToDeduct.set(cartItem.menuItem.id, (itemsToDeduct.get(cartItem.menuItem.id) || 0) + cartItem.quantity);
      });

      return prev.map(item => {
        if (itemsToDeduct.has(item.id)) {
          const newStock = Math.max(0, item.stock - itemsToDeduct.get(item.id)!);
          return {
            ...item,
            stock: newStock,
            available: newStock > 0 ? item.available : false
          };
        }
        return item;
      });
    });

    setOrders(prev => [newOrder, ...prev]);
    setMyOrderIds(prev => [newOrder.id, ...prev]);
    setTrackedOrderId(newOrder.id);
    setCart([]);
    setCurrentView('confirmation');
  };

  const handleUpdateOrderStatus = (orderId: string, status: OrderStatus) => {
    const order = orders.find(o => o.id === orderId);
    // A refused order is never cooked, so its items go back into stock.
    if (status === 'Refuzată' && order && order.status !== 'Refuzată') {
      const returned = new Map<string, number>();
      order.items.forEach(cartItem => {
        returned.set(cartItem.menuItem.id, (returned.get(cartItem.menuItem.id) || 0) + cartItem.quantity);
      });
      setMenuItems(prev => prev.map(item =>
        returned.has(item.id) ? { ...item, stock: item.stock + returned.get(item.id)! } : item
      ));
    }

    setOrders(prev => prev.map(o =>
      o.id === orderId ? { ...o, status } : o
    ));
  };

  const openTrackedOrder = (orderId: string) => {
    triggerVibration(20);
    setTrackedOrderId(orderId);
    setCurrentView('confirmation');
  };

  // Leaving a finished order's page means the customer has seen the outcome: stop tracking it.
  const handleLeaveConfirmation = () => {
    if (activeOrder && isFinished(activeOrder)) {
      setMyOrderIds(prev => prev.filter(id => id !== activeOrder.id));
    }
    setTrackedOrderId(null);
    setCurrentView('menu');
  };

  const handleSimulateProgress = () => {
    if (!activeOrder) return;
    const nextStatus = getNextStatus(activeOrder.type, activeOrder.status);
    if (nextStatus) handleUpdateOrderStatus(activeOrder.id, nextStatus);
  };

  const handleToggleAvailability = (itemId: string) => {
    setMenuItems(prev => prev.map(item =>
      item.id === itemId ? { ...item, available: !item.available } : item
    ));
  };

  const handleUpdateMenuItem = (updatedItem: MenuItem) => {
    setMenuItems(prev => prev.map(item =>
      item.id === updatedItem.id ? updatedItem : item
    ));
  };

  const handleAddMenuItem = (newItem: MenuItem) => {
    setMenuItems(prev => [...prev, newItem]);
  };

  return (
    <div className="min-h-[100svh] w-full max-w-[100vw] overflow-x-hidden bg-zinc-900 font-sans text-zinc-100">

      {/* Global Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, y: -50, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: -20, x: '-50%' }}
            className="fixed top-6 left-1/2 z-[100] flex items-center gap-3 bg-zinc-800/90 backdrop-blur-md border-[0.5px] border-white/20 shadow-[0_8px_32px_rgba(0,0,0,0.5)] text-white px-5 py-3 rounded-full text-sm font-medium whitespace-nowrap"
          >
            <div className="w-6 h-6 rounded-full bg-[#D4EAE6] flex items-center justify-center text-zinc-900">
              <Check size={14} strokeWidth={3} />
            </div>
            {toast.message}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Top Admin Navigation */}
      <AnimatePresence>
        {currentView === 'menu' && (
          <motion.div
            key="admin-btn"
            initial={{ opacity: 0, y: -20, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: -20, x: '-50%' }}
            transition={{
              type: "spring",
              stiffness: 400,
              damping: 30,
              opacity: { duration: 0.15, ease: "easeOut" }
            }}
            className="fixed top-4 left-1/2 z-40 flex items-center gap-1 bg-zinc-900/80 backdrop-blur-2xl border-[0.5px] border-white/20 shadow-[0_8px_32px_rgba(0,0,0,0.5)] p-1.5 rounded-full whitespace-nowrap"
          >
            <button
              onClick={() => setCurrentView('courier')}
              title="Curier"
              className="flex items-center justify-center gap-1.5 text-zinc-400 hover:text-white hover:bg-white/10 px-3 sm:px-4 py-2 min-h-[36px] rounded-full text-[10px] sm:text-xs uppercase tracking-wider font-semibold transition"
            >
              <Package size={16} />
              <span className="hidden sm:inline-block">Curier</span>
            </button>
            <div className="w-[1px] h-4 bg-white/10" />
            <button
              onClick={() => setCurrentView('kitchen')}
              title="Bucătărie (KDS)"
              className="flex items-center justify-center gap-1.5 text-amber-500 hover:text-amber-400 hover:bg-amber-500/10 px-3 sm:px-4 py-2 min-h-[36px] rounded-full text-[10px] sm:text-xs uppercase tracking-wider font-semibold transition"
            >
              <ChefHat size={16} />
              <span className="hidden sm:inline-block">Bucătărie</span>
            </button>
            <div className="w-[1px] h-4 bg-white/10" />
            <button
              onClick={() => setCurrentView('admin')}
              title="Manager"
              className="flex items-center justify-center gap-1.5 text-[#D4EAE6] hover:text-[#B8D6D1] hover:bg-[#D4EAE6]/10 px-3 sm:px-4 py-2 min-h-[36px] rounded-full text-[10px] sm:text-xs uppercase tracking-wider font-semibold transition"
            >
              <LayoutDashboard size={16} />
              <span className="hidden sm:inline-block">Manager</span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Active Order Trackers: pinned under the staff nav, so the bottom stays free for the cart.
          Shows every order placed from this browser until the customer has seen its outcome. */}
      <div className="fixed top-[76px] inset-x-0 z-40 flex flex-col items-center gap-2 px-4 pointer-events-none">
        <AnimatePresence>
          {currentView === 'menu' && myOrders.map(order => (
            <motion.div
              key={`track-${order.id}`}
              layout
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.95 }}
              transition={{
                type: "spring", stiffness: 400, damping: 30,
                opacity: { duration: 0.15, ease: "easeOut" }
              }}
              className="w-full max-w-sm pointer-events-auto"
            >
              <ActiveOrderTracker order={order} onOpen={() => openTrackedOrder(order.id)} />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Main Content Area */}
      <main className="grid [grid-template-areas:'main'] relative min-h-[100svh]">
        <AnimatePresence>
          {currentView === 'menu' && (
            <motion.div
              key="menu"
              className="[grid-area:main] bg-zinc-900 w-full min-h-[100svh]"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ type: "spring", stiffness: 300, damping: 30, opacity: { duration: 0.2, ease: "easeOut" } }}
              style={{ overflow: currentView === 'menu' ? 'visible' : 'hidden', maxHeight: currentView === 'menu' ? 'none' : '100svh' }}
            >
              <MenuScreen
                menuItems={menuItems}
                orderType={orderType}
                setOrderType={setOrderType}
                onSelectItem={setSelectedItem}
                trackerCount={myOrders.length}
              />
            </motion.div>
          )}

          {currentView === 'cart' && (
            <motion.div
              key="cart"
              className="[grid-area:main] bg-zinc-900 z-30 w-full min-h-[100svh]"
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: "spring", stiffness: 350, damping: 35, mass: 0.8, opacity: { duration: 0.2, ease: "easeOut" } }}
            >
              <CartScreen
                cart={cart}
                setCart={setCart}
                orderType={orderType}
                onBack={() => setCurrentView('menu')}
                onPlaceOrder={handlePlaceOrder}
              />
            </motion.div>
          )}

          {currentView === 'confirmation' && activeOrder && (
            <motion.div
              key="confirmation"
              className="[grid-area:main] bg-zinc-900 z-40 w-full min-h-[100svh]"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 30, opacity: { duration: 0.2, ease: "easeOut" } }}
            >
              <ConfirmationScreen
                order={activeOrder}
                onSimulateProgress={handleSimulateProgress}
                onBackToMenu={handleLeaveConfirmation}
              />
            </motion.div>
          )}

          {currentView === 'admin' && (
            <motion.div
              key="admin"
              className="[grid-area:main] bg-zinc-900 z-50 w-full min-h-[100svh]"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              transition={{ type: "spring", stiffness: 300, damping: 30, opacity: { duration: 0.2, ease: "easeOut" } }}
            >
              {canOpen(staffRole, 'admin') ? (
                <AdminScreen
                  orders={orders}
                  menuItems={menuItems}
                  onUpdateOrderStatus={handleUpdateOrderStatus}
                  onToggleItemAvailability={handleToggleAvailability}
                  onUpdateMenuItem={handleUpdateMenuItem}
                  onAddMenuItem={handleAddMenuItem}
                  onBack={() => setCurrentView('menu')}
                  onLogout={STAFF_AUTH_ENABLED ? handleStaffLogout : undefined}
                />
              ) : staffLogin('admin')}
            </motion.div>
          )}
          {currentView === 'kitchen' && (
            <motion.div
              key="kitchen"
              className="[grid-area:main] bg-zinc-950 z-50 w-full min-h-[100svh]"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
            >
              {canOpen(staffRole, 'kitchen') ? (
                <KitchenScreen
                  orders={orders}
                  onUpdateOrderStatus={handleUpdateOrderStatus}
                  onBack={() => setCurrentView('menu')}
                  onLogout={STAFF_AUTH_ENABLED ? handleStaffLogout : undefined}
                />
              ) : staffLogin('kitchen')}
            </motion.div>
          )}

          {currentView === 'courier' && (
            <motion.div
              key="courier"
              className="[grid-area:main] bg-zinc-950 z-50 w-full min-h-[100svh]"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
            >
              {canOpen(staffRole, 'courier') ? (
                <CourierScreen
                  orders={orders}
                  onUpdateOrderStatus={handleUpdateOrderStatus}
                  onBack={() => setCurrentView('menu')}
                  onLogout={STAFF_AUTH_ENABLED ? handleStaffLogout : undefined}
                />
              ) : staffLogin('courier')}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Floating Bottom Actions (Order Status & Cart) */}
      <div className="fixed bottom-6 left-0 right-0 z-40 flex flex-col items-center gap-3 px-4 pointer-events-none pb-[env(safe-area-inset-bottom)]">

        {/* Floating Cart Button */}
        <AnimatePresence>
          {currentView === 'menu' && cartItemsCount > 0 && (
            <motion.div
              key="floating-cart"
              initial={{ opacity: 0, y: 30, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 30, scale: 0.9 }}
              transition={{
                type: "spring", stiffness: 400, damping: 30,
                opacity: { duration: 0.15, ease: "easeOut" }
              }}
              className="w-full max-w-sm pointer-events-auto"
            >
              <button
                onClick={() => {
                  triggerVibration(20);
                  setCurrentView('cart');
                }}
                className="flex items-center justify-between gap-4 bg-zinc-800/90 backdrop-blur-2xl border-[0.5px] border-white/20 shadow-[inset_0_1px_1px_rgba(255,255,255,0.15),0_8px_32px_rgba(0,0,0,0.3)] text-white px-6 py-4 rounded-full hover:bg-zinc-700/90 transition active:scale-[0.98] w-full"
              >
                <div className="flex items-center gap-4">
                  <div className="bg-[#D4EAE6] text-zinc-900 rounded-full w-8 h-8 flex items-center justify-center font-bold text-sm shadow-inner leading-none">
                    {cartItemsCount}
                  </div>
                  <span className="font-semibold uppercase tracking-wider text-xs text-[#D4EAE6]">Vezi coșul</span>
                </div>
                <span className="font-sans font-semibold tracking-tight text-lg">
                  {cartSubtotal(cart)} RON
                </span>
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Item Selection Modal */}
      <AnimatePresence>
        {selectedItem && (
          <ItemModal
            item={selectedItem}
            onClose={() => setSelectedItem(null)}
            onAdd={handleAddToCart}
          />
        )}
      </AnimatePresence>

    </div>
  );
}
