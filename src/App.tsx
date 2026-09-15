import { useCallback, useRef, useState, useEffect } from 'react';
import { Check } from 'lucide-react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import { initialMenu, mockOrders } from './data/mock';
import { MenuItem, Order, CartItem, OrderActor, OrderType, OrderStatus, Extra } from './types';
import { triggerVibration } from './lib/haptics';
import { addOrder, updateMenu, updateOrderStatus, useLiveMenu, useLiveOrders } from './lib/liveStore';
import { readMyOrderIds, saveMyOrderIds } from './lib/storage';
import { ClientPage, ClientTab, clientUrl, routeFromUrl, staffUrl } from './lib/routes';
import MobileBottomNav from './components/navigation/MobileBottomNav';
import ScrollRestore from './features/client/ScrollRestore';
import PageTransition from './features/client/PageTransition';
import ScreenLayer from './features/client/ScreenLayer';
import TopEdgeFade from './features/client/TopEdgeFade';
import { SheetBackdrop } from './components/ui/SheetBackdrop';
import { TRACKER_TOP } from './features/client/layout';
import { EASE_OUT, ENTER, EXIT, SHEET_ENTER, SHEET_EXIT } from './lib/motion';
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
import SiteIntro from './features/intro/SiteIntro';
import { markIntroSeen, shouldPlayIntro } from './features/intro/introSession';
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

/**
 * The customer app stepping back, dimmed and a little smaller, while the cart or another screen comes
 * over it. It moves on the sheet's own timing, so the sheet, its backdrop and the app read as one motion.
 */
const APP_RECEDED = { opacity: 0.4, transform: 'scale(0.94)' };
// The transform is dropped once the app is back, or it would become the containing block of fixed elements.
const APP_PRESENT = { opacity: 1, transform: 'scale(1)', transitionEnd: { transform: 'none' } };

/**
 * How the site comes out from behind the opening clip: it settles forward into focus while the
 * overlay fades, so the two read as one movement rather than a cut.
 *
 * Both the transform and the filter are dropped on arrival. Left in place they would make this
 * element the containing block for every `position: fixed` child — the navbar, the toast, the order
 * trackers — and pin them to the app instead of the viewport.
 */
const SITE_HIDDEN = { opacity: 0, filter: 'blur(6px)', transform: 'translateY(6px) scale(0.985)' };
const SITE_SHOWN = {
  opacity: 1,
  filter: 'blur(0px)',
  transform: 'translateY(0px) scale(1)',
  transitionEnd: { transform: 'none', filter: 'none' },
};
/** Reduced motion gets the same handover with nothing moving or blurring. */
const SITE_HIDDEN_PLAIN = { opacity: 0 };
const SITE_SHOWN_PLAIN = { opacity: 1 };
const SITE_REVEAL = { duration: 0.7, ease: EASE_OUT };

/** Tab order along the navbar, so a page change knows which way to slide. */
const CLIENT_PAGE_ORDER: ClientPage[] = ['home', 'map', 'menu', 'profile'];

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
  /**
   * Decided once, from the route this tab opened on: 'playing' while the clip is up, 'revealing'
   * once it has handed over, 'off' when there was never an intro to begin with (a staff screen, or
   * a tab that has already seen it). The app renders behind it the whole time, so the menu, the
   * orders and the photos are already loading while the clip runs.
   */
  const [introPhase, setIntroPhase] = useState<'playing' | 'revealing' | 'off'>(() =>
    shouldPlayIntro(initialRoute) ? 'playing' : 'off',
  );
  const [currentView, setCurrentView] = useState<ViewState>(initialRoute.staff ?? 'client');
  const [clientPage, setClientPage] = useState<ClientPage>(initialRoute.page);
  // Each customer page remembers where it was scrolled to; a page never visited starts at the top.
  const scrollByPage = useRef(new Map<ClientPage, number>());
  // Which way the last tab change went along the navbar: 1 to the right, -1 to the left. Worked out
  // here rather than in each navigation path, so the Back button slides the right way too.
  const previousPage = useRef(clientPage);
  const pageDirection = useRef(1);
  if (previousPage.current !== clientPage) {
    pageDirection.current =
      CLIENT_PAGE_ORDER.indexOf(clientPage) > CLIENT_PAGE_ORDER.indexOf(previousPage.current) ? 1 : -1;
    previousPage.current = clientPage;
  }

  // Tidy the address bar once, so a legacy link (/#courier, /menu) settles on its canonical path.
  useEffect(() => {
    const path = initialRoute.staff ? staffUrl(initialRoute.staff) : clientUrl(initialRoute.page);
    if (window.location.pathname !== path || window.location.hash) {
      history.replaceState(null, '', path + window.location.search);
    }
  }, [initialRoute]);

  /** Remembers where the open customer page was scrolled, before something replaces or covers it. */
  const rememberScroll = useCallback(() => {
    if (currentView === 'client') scrollByPage.current.set(clientPage, window.scrollY);
  }, [currentView, clientPage]);

  /** Customer tabs are real history entries, so the browser's Back button walks between them. */
  const goToClientPage = useCallback((page: ClientPage) => {
    if (window.location.pathname !== clientUrl(page)) {
      history.pushState(null, '', clientUrl(page) + window.location.search);
    }

    if (currentView !== 'client') {
      // Back from the cart, an order or a staff screen: the page reopens where it was left.
      setCurrentView('client');
      setClientPage(page);
      return;
    }

    if (page === clientPage) {
      // Tapping the tab you are already on takes you back to the top of it.
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    rememberScroll();
    setClientPage(page);
  }, [clientPage, currentView, rememberScroll]);

  /** The navbar's cart tab pushes the cart screen; every other tab is a real page. */
  const goToClientTab = useCallback((tab: ClientTab) => {
    if (tab === 'cart') {
      triggerVibration(20);
      rememberScroll();
      setCurrentView('cart');
      return;
    }
    goToClientPage(tab);
  }, [goToClientPage, rememberScroll]);

  /** A category card marks the category and opens the Menu page already scrolled to it. */
  const openCategory = useCallback((category: string) => {
    setMenuCategory(category);
    setCategoryJump(category);
    // The Menu page scrolls itself to the category, so the remembered offset must not fight it.
    scrollByPage.current.set('menu', 0);
    goToClientPage('menu');
  }, [goToClientPage]);

  const handleScrolledToCategory = useCallback(() => setCategoryJump(null), []);
  // Stable, so the memoised Home page isn't rebuilt whenever App re-renders.
  const openMenuPage = useCallback(() => goToClientPage('menu'), [goToClientPage]);
  const openSearch = useCallback(() => setSearchOpen(true), []);

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

  // Orders and menu stay instant in localStorage and mirror through Supabase across devices.
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
    rememberScroll();
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

  // Active orders stay pinned at the top of every customer tab. A product sheet or the search simply
  // covers them, so they are not taken away and brought back every time one opens and closes.
  const showTrackers = currentView === 'client';

  // The app grows back from behind a closing sheet around the middle of the screen it returns to.
  const clientOrigin = `50% ${(scrollByPage.current.get(clientPage) ?? 0) + window.innerHeight / 2}px`;

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

  /**
   * "Meniul zilei" is a flag on the product, so it persists through the same path as stock and
   * availability: localStorage first, then Supabase and Realtime when they are configured.
   */
  const handleToggleDailyMenu = (itemId: string, isDailyMenu: boolean) => {
    updateMenu(prev => prev.map(item =>
      item.id === itemId ? { ...item, isDailyMenu } : item
    ));
  };

  /**
   * The clip is over, or the visitor left it early. `SiteIntro` calls this exactly once, so the tab
   * is marked here rather than when the intro mounts: a reload part way through still gets it.
   */
  const handleIntroComplete = useCallback(() => {
    markIntroSeen();
    setIntroPhase('revealing');
  }, []);

  /** The reveal has landed: the shell goes back to being a plain, full-height, scrolling page. */
  const endReveal = useCallback(() => {
    setIntroPhase(phase => (phase === 'revealing' ? 'off' : phase));
  }, []);

  /**
   * Backstop for `onAnimationComplete`. The shell is held at viewport height while it is revealed
   * (see `introHolds`), so a callback that never arrived would leave the page unable to scroll.
   */
  useEffect(() => {
    if (introPhase !== 'revealing') return;
    const timer = window.setTimeout(endReveal, 1500);
    return () => window.clearTimeout(timer);
  }, [introPhase, endReveal]);

  const reducedMotion = useReducedMotion();
  const introRunning = introPhase === 'playing';
  /**
   * While the shell carries a transform or a filter it becomes the containing block for its own
   * `position: fixed` children, and the navbar and order trackers would anchor to the bottom of the
   * whole scrolling page instead of the viewport — visibly snapping into place when the reveal ends.
   * Holding the shell at exactly one viewport keeps them where they belong. Nothing is lost: the
   * page is pinned at the top throughout, so the clipped part is off screen anyway.
   */
  const introHolds = introPhase !== 'off';
  const [siteHidden, siteShown] = reducedMotion
    ? [SITE_HIDDEN_PLAIN, SITE_SHOWN_PLAIN]
    : [SITE_HIDDEN, SITE_SHOWN];

  return (
    <>
    {/* The app itself. It is never unmounted for the intro: the clip plays over it while everything
        behind carries on loading, and the reveal only changes how this element is painted. With no
        intro ('off') no animation props are passed at all, so the shell stays a plain container. */}
    <motion.div
      className={`min-h-[100svh] w-full overflow-x-clip bg-zinc-900 font-sans text-zinc-100 ${introHolds ? 'h-[100svh] overflow-hidden' : ''}`}
      onAnimationComplete={endReveal}
      /* Takes the whole app out of the tab order and out of reach of a tap while the clip is up, so
         the skip control is the first thing a keyboard lands on. `inert` does this without hiding
         anything, which `display: none` would — and that would throw away the loading going on. */
      inert={introRunning}
      initial={introPhase === 'off' ? false : siteHidden}
      animate={introPhase === 'revealing' ? siteShown : introPhase === 'playing' ? siteHidden : undefined}
      transition={SITE_REVEAL}
    >

      {/* The soft edge where the page slides under the top of the screen. */}
      {currentView === 'client' && <TopEdgeFade />}

      {/* Global Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, transform: 'translateY(-24px) scale(0.95)' }}
            animate={{ opacity: 1, transform: 'translateY(0px) scale(1)' }}
            exit={{ opacity: 0, transform: 'translateY(-12px) scale(0.97)', transition: EXIT }}
            transition={ENTER}
            className="fixed top-[calc(env(safe-area-inset-top)+12px)] left-1/2 -translate-x-1/2 z-[100] flex items-center gap-3 bg-zinc-800/90 backdrop-blur-xl glass-float text-white px-5 py-3 rounded-full text-sm font-medium whitespace-nowrap"
          >
            <div className="w-6 h-6 rounded-full bg-[#D4EAE6] flex items-center justify-center text-zinc-900">
              <Check size={14} strokeWidth={3} />
            </div>
            {toast.message}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Active order trackers, pinned at the top of every customer tab. Each page pads its header by the
          same amount (clientTopPadding), so the pills never cover a title or the search button. */}
      <div className={`fixed ${TRACKER_TOP} inset-x-0 z-40 flex flex-col items-center px-4 pointer-events-none`}>
        <AnimatePresence initial={false}>
          {showTrackers && myOrders.map(order => (
            // No `layout` here: on a fixed element it reads every scroll change between two renders (a tab
            // change, a restored scroll) as the pill moving, and flies it back in from off screen.
            // The height animation lets a second pill slide into place when the first comes or goes.
            <motion.div
              key={`track-${order.id}`}
              initial={{ opacity: 0, height: 0, transform: 'scale(0.95)' }}
              animate={{ opacity: 1, height: 'auto', transform: 'scale(1)' }}
              exit={{ opacity: 0, height: 0, transform: 'scale(0.95)', transition: EXIT }}
              transition={ENTER}
              className="w-full max-w-[340px] pointer-events-auto"
            >
              <div className="pb-2">
                <ActiveOrderTracker order={order} onOpen={() => openTrackedOrder(order.id)} />
              </div>
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
            <ScreenLayer
              key="client"
              className="[grid-area:main] bg-zinc-900 w-full min-h-[100svh]"
              style={{ transformOrigin: clientOrigin }}
              initial={APP_RECEDED}
              animate={APP_PRESENT}
              // Stepping back happens while a sheet rises, coming back while it drops away.
              exit={{ ...APP_RECEDED, transition: SHEET_ENTER }}
              transition={SHEET_EXIT}
            >
              {/* The customer app's four tabs: the pages cross-fade while sliding a short way in the
                  direction the navbar lens moves. PageTransition keeps the outgoing page pinned in place
                  while the incoming one restores its scroll, so neither of them jumps. */}
              <AnimatePresence initial={false} custom={pageDirection.current}>
                <PageTransition key={clientPage} direction={pageDirection.current}>
                  <ScrollRestore top={scrollByPage.current.get(clientPage) ?? 0} />

                  {clientPage === 'home' && (
                    <HomeScreen
                      menuItems={menuItems}
                      orderType={orderType}
                      setOrderType={setOrderType}
                      onSelectItem={setSelectedItem}
                      onOpenMenu={openMenuPage}
                      onOpenCategory={openCategory}
                      onOpenSearch={openSearch}
                      selectedCategory={menuCategory}
                      trackerCount={myOrders.length}
                    />
                  )}

                  {clientPage === 'map' && <CustomerMapScreen trackerCount={myOrders.length} />}

                  {clientPage === 'menu' && (
                    <MenuScreen
                      menuItems={menuItems}
                      orderType={orderType}
                      setOrderType={setOrderType}
                      onSelectItem={setSelectedItem}
                      onOpenSearch={openSearch}
                      trackerCount={myOrders.length}
                      selectedCategory={menuCategory}
                      scrollToCategory={categoryJump}
                      onScrolledToCategory={handleScrolledToCategory}
                    />
                  )}

                  {clientPage === 'profile' && (
                    <ProfileScreen
                      myOrders={myOrders}
                      onOpenOrder={openTrackedOrder}
                      onDemoAction={showToast}
                      trackerCount={myOrders.length}
                    />
                  )}
                </PageTransition>
              </AnimatePresence>
            </ScreenLayer>
          )}

          {/* The cart is a sheet: it rises over the app, which steps back while a blur builds up over it. */}
          {currentView === 'cart' && <SheetBackdrop key="cart-backdrop" className="z-[29] pointer-events-none" />}
          {currentView === 'cart' && (
            <ScreenLayer
              key="cart"
              className="[grid-area:main] bg-zinc-900 z-30 w-full min-h-[100svh] shadow-[0_-24px_60px_rgba(0,0,0,0.5)]"
              initial={{ transform: 'translateY(100vh)' }}
              animate={{ transform: 'translateY(0vh)', transitionEnd: { transform: 'none' } }}
              exit={{ transform: 'translateY(100vh)', transition: SHEET_EXIT }}
              transition={SHEET_ENTER}
            >
              <CartScreen
                cart={cart}
                setCart={setCart}
                orderType={orderType}
                onBack={() => setCurrentView('client')}
                onPlaceOrder={handlePlaceOrder}
                menuItems={menuItems}
                onAddSuggestion={item => handleAddToCart(item, 1, [])}
              />
            </ScreenLayer>
          )}

          {currentView === 'confirmation' && activeOrder && (
            <ScreenLayer
              key="confirmation"
              className="[grid-area:main] bg-zinc-900 z-40 w-full min-h-[100svh]"
              // Opacity only: a transform here would make the page's pinned bottom button scroll with it
              // until the entrance ended. The blocks inside rise in sequence instead.
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, transition: EXIT }}
              transition={ENTER}
            >
              {/* The order page always opens at its top, whatever page it was opened from. */}
              <ScrollRestore top={0} />
              <ConfirmationScreen
                order={activeOrder}
                onBackToMenu={handleLeaveConfirmation}
              />
            </ScreenLayer>
          )}

          {currentView === 'admin' && (
            <ScreenLayer
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
                  onToggleDailyMenu={handleToggleDailyMenu}
                  onBack={() => goToClientPage('home')}
                  onLogout={STAFF_AUTH_ENABLED ? handleStaffLogout : undefined}
                />
              ) : staffLogin('admin')}
            </ScreenLayer>
          )}
          {currentView === 'kitchen' && (
            <ScreenLayer
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
            </ScreenLayer>
          )}

          {currentView === 'courier' && (
            <ScreenLayer
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
            </ScreenLayer>
          )}
        </AnimatePresence>
      </main>

      {/* The customer app's own navigation. It slides away behind the cart, checkout, tracking and
          staff screens. A product sheet or the search simply covers it: taking it out there made it
          rise back in, see-through, every time a sheet closed. */}
      <AnimatePresence>
        {currentView === 'client' && (
          <MobileBottomNav key="nav" page={clientPage} cartCount={cartItemsCount} onNavigate={goToClientTab} />
        )}
      </AnimatePresence>

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

    </motion.div>

    {/* Outside the app container, so the overlay does not fade along with what it is revealing.
        AnimatePresence keeps it mounted through its exit, which is also what keeps the page pinned
        until the handover is really finished. */}
    <AnimatePresence>
      {introRunning && <SiteIntro key="site-intro" onComplete={handleIntroComplete} />}
    </AnimatePresence>
    </>
  );
}
