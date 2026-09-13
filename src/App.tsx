import { useCallback, useRef, useState, useEffect } from 'react';
import { Check } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { initialMenu, mockOrders } from './data/mock';
import { MenuItem, Order, CartItem, OrderActor, OrderType, OrderStatus, Extra } from './types';
import { triggerVibration } from './lib/haptics';
import { addOrder, updateMenu, updateOrderStatus, useLiveMenu, useLiveOrders } from './lib/liveStore';
import { readMyOrderIds, saveMyOrderIds } from './lib/storage';
import { ClientPage, ClientTab, clientUrl, routeFromUrl, staffUrl } from './lib/routes';
import MobileBottomNav from './components/navigation/MobileBottomNav';
import ScrollRestore from './features/client/ScrollRestore';
import { TRACKER_TOP } from './features/client/layout';
import HomeScreen from './features/home/HomeScreen';
import HomeSearch from './features/home/HomeSearch';
import CustomerMapScreen from './features/map/CustomerMapScreen';
import ProfileScreen from './features/profile/ProfileScreen';
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

/**
 * The shell decides *what kind of screen* is on top. The customer app is one of those kinds, and its
 * four tabs live in `clientPage` — so pages of the customer app never get mixed up with the cart,
 * the order tracking screen or the staff screens.
 */
type ViewState = 'client' | 'cart' | 'confirmation' | 'admin' | 'kitchen' | 'courier';

/** Short and low-travel: page swaps should read as a tab change, not as a screen push. */
const PAGE_TRANSITION = { duration: 0.2, ease: 'easeOut' } as const;

/** How many of each menu item an order contains, for the stock bookkeeping. */
function countByMenuItem(items: CartItem[]) {
  const counts = new Map<string, number>();
  items.forEach(cartItem => {
    counts.set(cartItem.menuItem.id, (counts.get(cartItem.menuItem.id) ?? 0) + cartItem.quantity);
  });
  return counts;
}

export default function App() {
  const [initialRoute] = useState(routeFromUrl);
  const [currentView, setCurrentView] = useState<ViewState>(initialRoute.staff ?? 'client');
  const [clientPage, setClientPage] = useState<ClientPage>(initialRoute.page);
  // Each customer page remembers where it was scrolled to; a page never visited starts at the top.
  const scrollByPage = useRef(new Map<ClientPage, number>());

  // Tidy the address bar once, so a legacy link (/#courier, /menu) settles on its canonical path.
  useEffect(() => {
    const path = initialRoute.staff ? staffUrl(initialRoute.staff) : clientUrl(initialRoute.page);
    if (window.location.pathname !== path || window.location.hash) {
      history.replaceState(null, '', path + window.location.search);
    }
  }, [initialRoute]);

  /** Customer tabs are real history entries, so the browser's Back button walks between them. */
  const goToClientPage = useCallback((page: ClientPage) => {
    setCurrentView('client');

    if (page === clientPage) {
      // Tapping the tab you are already on takes you back to the top of it.
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    scrollByPage.current.set(clientPage, window.scrollY);
    if (window.location.pathname !== clientUrl(page)) {
      history.pushState(null, '', clientUrl(page) + window.location.search);
    }
    setClientPage(page);
  }, [clientPage]);

  /** The navbar's cart tab pushes the cart screen; every other tab is a real page. */
  const goToClientTab = useCallback((tab: ClientTab) => {
    if (tab === 'cart') {
      triggerVibration(20);
      setCurrentView('cart');
      return;
    }
    goToClientPage(tab);
  }, [goToClientPage]);

  /** A category card marks the category and opens the Menu page already scrolled to it. */
  const openCategory = useCallback((category: string) => {
    setMenuCategory(category);
    setCategoryJump(category);
    // The Menu page scrolls itself to the category, so the remembered offset must not fight it.
    scrollByPage.current.set('menu', 0);
    goToClientPage('menu');
  }, [goToClientPage]);

  const handleScrolledToCategory = useCallback(() => setCategoryJump(null), []);

  // Back/forward between customer tabs. Staff screens are separate documents, so they are left alone.
  useEffect(() => {
    const onPopState = () => {
      const route = routeFromUrl();
      if (route.staff) return;
      setClientPage(route.page);
      setCurrentView('client');
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  // Staff screens sit behind an authenticator-code login; the session lives in sessionStorage.
  const [staffRole, setStaffRole] = useState<StaffRole | null>(readStaffSession);
  const handleStaffLogin = (role: StaffRole) => {
    startStaffSession(role);
    setStaffRole(role);
  };
  const handleStaffLogout = () => {
    endStaffSession();
    setStaffRole(null);
    goToClientPage('home');
  };
  const staffLogin = (role: StaffRole) => (
    <StaffLogin role={role} onSuccess={() => handleStaffLogin(role)} onBack={() => goToClientPage('home')} />
  );

  // Orders and the menu live in localStorage and are shared live with the kitchen and courier tabs.
  const orders = useLiveOrders(mockOrders);
  const menuItems = useLiveMenu(initialMenu);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [orderType, setOrderType] = useState<OrderType>('livrare');

  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  // One source of truth for the chosen category: the Home carousel marks it, the Menu page marks it.
  const [menuCategory, setMenuCategory] = useState<string | null>(null);
  // Separate from the selection above: a one-shot "open the menu at this category" intent.
  const [categoryJump, setCategoryJump] = useState<string | null>(null);
  // The customer's own orders are tracked by id and always read from `orders`, so status
  // changes made in the kitchen or courier tabs show up here through the storage sync.
  const [myOrderIds, setMyOrderIds] = useState<string[]>(readMyOrderIds);
  const [trackedOrderId, setTrackedOrderId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; id: number } | null>(null);

  const activeOrder = orders.find(o => o.id === trackedOrderId) ?? null;
  const myOrders = orders
    .filter(o => myOrderIds.includes(o.id))
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  useEffect(() => saveMyOrderIds(myOrderIds), [myOrderIds]);

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
    updateMenu(prev => {
      const itemsToDeduct = countByMenuItem(newOrder.items);

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

    addOrder(newOrder);
    setMyOrderIds(prev => [newOrder.id, ...prev]);
    setTrackedOrderId(newOrder.id);
    setCart([]);
    setCurrentView('confirmation');
  };

  /**
   * Every status change goes through the store, which checks the transition against what this role
   * is allowed to do. A click on stale data (another tab moved the order first) is simply dropped.
   */
  const applyStatus = useCallback((orderId: string, status: OrderStatus, actor: OrderActor) => {
    const result = updateOrderStatus(orderId, status, actor);
    if (!result.ok) return;

    // A refused order is never cooked, so its items go back into stock.
    if (result.order.status === 'Refuzată') {
      const returned = countByMenuItem(result.order.items);
      updateMenu(prev => prev.map(item =>
        returned.has(item.id) ? { ...item, stock: item.stock + returned.get(item.id)! } : item
      ));
    }
  }, []);

  const kitchenUpdateStatus = useCallback((orderId: string, status: OrderStatus) => applyStatus(orderId, status, 'kitchen'), [applyStatus]);
  const courierUpdateStatus = useCallback((orderId: string, status: OrderStatus) => applyStatus(orderId, status, 'courier'), [applyStatus]);
  const adminUpdateStatus = useCallback((orderId: string, status: OrderStatus) => applyStatus(orderId, status, 'admin'), [applyStatus]);

  /** A search hit opens the normal product modal, so extras and quantity still get chosen. */
  const handleSearchSelect = (item: MenuItem) => {
    setSearchOpen(false);
    setSelectedItem(item);
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
    goToClientPage('menu');
  };

  const showToast = useCallback((message: string) => setToast({ message, id: Date.now() }), []);

  // The compact status card on the Map page only makes sense while someone is actually driving.
  const orderOnTheWay = myOrders.find(order => order.status === 'Pe drum') ?? null;

  const handleToggleAvailability = (itemId: string) => {
    updateMenu(prev => prev.map(item =>
      item.id === itemId ? { ...item, available: !item.available } : item
    ));
  };

  const handleUpdateMenuItem = (updatedItem: MenuItem) => {
    updateMenu(prev => prev.map(item =>
      item.id === updatedItem.id ? updatedItem : item
    ));
  };

  const handleAddMenuItem = (newItem: MenuItem) => {
    updateMenu(prev => [...prev, newItem]);
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

      {/* Active Order Trackers, pinned at the top of the Menu page. The Home page renders the same
          trackers inline instead, so they can never cover its search button. */}
      <div className={`fixed ${TRACKER_TOP} inset-x-0 z-40 flex flex-col items-center gap-2 px-4 pointer-events-none`}>
        <AnimatePresence>
          {currentView === 'client' && clientPage === 'menu' && !selectedItem && myOrders.map(order => (
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
      {/* One stacking cell for every screen. The column is pinned to minmax(0,1fr): left on `auto`, a
          grid track grows to its content's max-content width, which the horizontal carousels would
          blow far past the viewport, and overflow-x-hidden would then silently clip the rest. */}
      <main className="grid grid-cols-[minmax(0,1fr)] [grid-template-areas:'main'] relative min-h-[100svh]">
        <AnimatePresence>
          {currentView === 'client' && (
            <motion.div
              key="client"
              className="[grid-area:main] bg-zinc-900 w-full min-h-[100svh]"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={PAGE_TRANSITION}
            >
              {/* The customer app's four tabs. Both pages are mounted for the length of the swap and
                  share a single grid cell, so they cross-fade in place instead of stacking. That
                  overlap is also what makes the scroll restore land: the outgoing page holds the
                  document height up while the incoming one mounts, so scrolling back to a remembered
                  offset is not clamped by a momentarily short page. */}
              <div className="grid grid-cols-[minmax(0,1fr)] [grid-template-areas:'page']">
                <AnimatePresence initial={false}>
                  <motion.div
                    key={clientPage}
                    className="[grid-area:page] min-w-0"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={PAGE_TRANSITION}
                  >
                    <ScrollRestore top={scrollByPage.current.get(clientPage) ?? 0} />

                    {clientPage === 'home' && (
                      <HomeScreen
                        menuItems={menuItems}
                        orderType={orderType}
                        setOrderType={setOrderType}
                        onSelectItem={setSelectedItem}
                        onOpenMenu={() => goToClientPage('menu')}
                        onOpenCategory={openCategory}
                        onOpenSearch={() => setSearchOpen(true)}
                        selectedCategory={menuCategory}
                        myOrders={myOrders}
                        onOpenOrder={openTrackedOrder}
                      />
                    )}

                    {clientPage === 'map' && (
                      <CustomerMapScreen orderOnTheWay={orderOnTheWay} onOpenOrder={openTrackedOrder} />
                    )}

                    {clientPage === 'menu' && (
                      <MenuScreen
                        menuItems={menuItems}
                        orderType={orderType}
                        setOrderType={setOrderType}
                        onSelectItem={setSelectedItem}
                        trackerCount={myOrders.length}
                        selectedCategory={menuCategory}
                        scrollToCategory={categoryJump}
                        onScrolledToCategory={handleScrolledToCategory}
                      />
                    )}

                    {clientPage === 'profile' && (
                      <ProfileScreen myOrders={myOrders} onOpenOrder={openTrackedOrder} onDemoAction={showToast} />
                    )}
                  </motion.div>
                </AnimatePresence>
              </div>
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
                onBack={() => setCurrentView('client')}
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
                  onUpdateOrderStatus={adminUpdateStatus}
                  onToggleItemAvailability={handleToggleAvailability}
                  onUpdateMenuItem={handleUpdateMenuItem}
                  onAddMenuItem={handleAddMenuItem}
                  onBack={() => goToClientPage('home')}
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
                  onUpdateOrderStatus={kitchenUpdateStatus}
                  onBack={() => goToClientPage('home')}
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
                  onUpdateOrderStatus={courierUpdateStatus}
                  onBack={() => goToClientPage('home')}
                  onLogout={STAFF_AUTH_ENABLED ? handleStaffLogout : undefined}
                />
              ) : staffLogin('courier')}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* The customer app's own navigation. Hidden behind the cart, checkout, tracking and staff
          screens, and while a product modal is open, so it is never part of those flows. */}
      {currentView === 'client' && !selectedItem && !searchOpen && (
        <MobileBottomNav page={clientPage} cartCount={cartItemsCount} onNavigate={goToClientTab} />
      )}

      {/* Search sits above the navbar but below the product modal, so a hit can open the modal
          without losing the results underneath. */}
      <AnimatePresence>
        {searchOpen && (
          <HomeSearch menuItems={menuItems} onSelectItem={handleSearchSelect} onClose={() => setSearchOpen(false)} />
        )}
      </AnimatePresence>

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
