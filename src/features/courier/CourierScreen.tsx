import { useState, useEffect, useRef, useMemo, useCallback, ReactNode } from 'react';
import { ChevronLeft, Map as MapIcon, List, PackageOpen, Bike, LogOut, LucideIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Order, OrderStatus } from '../../types';
import { leafletDocument } from '../../components/map/leafletDocument';
import CourierOrderCard from './CourierOrderCard';
import OrderDetailsSheet from './OrderDetailsSheet';

interface Props {
  orders: Order[];
  onUpdateOrderStatus: (orderId: string, newStatus: OrderStatus) => void;
  onBack: () => void;
  /** Only passed while staff login is enabled. */
  onLogout?: () => void;
}

const COURIER_MAP_HTML = leafletDocument({
  script: `
    var map = createMap(RESTAURANT, 13, { zoomControl: true });
    var layerGroup = L.layerGroup().addTo(map);
    var userMarker = null;
    var hasGpsHeading = false;
    var currentMarkers = [];
    var renderId = 0;

    L.marker(RESTAURANT, { icon: createIcon('restaurant'), zIndexOffset: 900 }).addTo(map);

    if (navigator.geolocation) {
      navigator.geolocation.watchPosition(function(pos) {
        var loc = [pos.coords.latitude, pos.coords.longitude];
        var firstFix = !userMarker;
        if (userMarker) {
          userMarker.setLatLng(loc);
        } else {
          userMarker = L.marker(loc, { icon: createIcon('courier'), zIndexOffset: 1000 }).addTo(map);
        }
        if (pos.coords.heading != null && !isNaN(pos.coords.heading)) {
          hasGpsHeading = true;
          setCourierHeading(userMarker, pos.coords.heading);
        }
        // Routes start at the courier once we know where they are.
        if (firstFix) render();
      }, function() {}, { enableHighAccuracy: true });
    }

    function popupContent(m) {
      var el = document.createElement('div');
      var title = document.createElement('b');
      title.style.color = '#000';
      title.textContent = m.id;
      var name = document.createElement('div');
      name.style.color = '#333';
      name.textContent = m.name;
      el.appendChild(title);
      el.appendChild(name);
      return el;
    }

    var FIT = { paddingTopLeft: [48, 72], paddingBottomRight: [48, 120], maxZoom: 16, animate: false };

    // Client pins plus a road route from the courier (or the restaurant) to each active order.
    function render() {
      var id = ++renderId;
      layerGroup.clearLayers();
      if (currentMarkers.length === 0) return;

      var origin = userMarker ? [userMarker.getLatLng().lat, userMarker.getLatLng().lng] : RESTAURANT;
      var bounds = [origin];
      currentMarkers.forEach(function(m) {
        L.marker([m.lat, m.lng], { icon: createIcon('client') }).bindPopup(popupContent(m)).addTo(layerGroup);
        bounds.push([m.lat, m.lng]);
      });
      map.fitBounds(bounds, FIT);

      Promise.all(currentMarkers.map(function(m) { return fetchRoute(origin, [m.lat, m.lng]); })).then(function(routes) {
        if (id !== renderId) return; // a newer update replaced these markers
        var routeBounds = bounds.slice();
        routes.forEach(function(r) { if (r) routeBounds = routeBounds.concat(r.latlngs); });
        map.fitBounds(routeBounds, FIT);
        routes.forEach(function(r, i) {
          if (r) drawRouteLine(layerGroup, r.latlngs);
          else drawFallbackLine(layerGroup, origin, [currentMarkers[i].lat, currentMarkers[i].lng]);
        });
        if (userMarker && !hasGpsHeading && routes[0]) setCourierHeading(userMarker, routeHeading(routes[0].latlngs));
      });
    }

    window.addEventListener('message', function(event) {
      if (!event.data || event.data.type !== 'updateMarkers') return;
      var next = event.data.markers;
      if (JSON.stringify(next) === JSON.stringify(currentMarkers)) return; // polling resends unchanged data
      currentMarkers = next;
      render();
    });
  `,
});

// Ready orders first, then the ones still in the kitchen.
const AVAILABLE_PRIORITY: Partial<Record<OrderStatus, number>> = { 'Gata de ridicare': 0, 'În preparare': 1 };
const MY_STATUSES: OrderStatus[] = ['Preluată de curier', 'Pe drum'];

const TABS: { id: 'list' | 'map'; label: string; icon: LucideIcon }[] = [
  { id: 'list', label: 'Comenzi', icon: List },
  { id: 'map', label: 'Hartă', icon: MapIcon },
];

function SectionHeader({ title, count }: { title: string; count: number }) {
  return (
    <div className="flex items-baseline justify-between px-1 mb-3">
      <h2 className="text-[13px] font-semibold text-zinc-400">{title}</h2>
      <span className="text-[13px] text-zinc-500 tabular-nums">{count}</span>
    </div>
  );
}

function EmptyState({ icon: Icon, children }: { icon: LucideIcon; children: ReactNode }) {
  return (
    <div className="rounded-[32px] border border-dashed border-white/10 bg-white/[0.02] px-6 py-8 flex flex-col items-center text-center gap-2">
      <Icon size={22} className="text-zinc-600" />
      <p className="text-[14px] text-zinc-500">{children}</p>
    </div>
  );
}

export default function CourierScreen({ orders, onUpdateOrderStatus, onBack, onLogout }: Props) {
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const { availableOrders, myOrders } = useMemo(() => {
    const byAge = (a: Order, b: Order) => a.createdAt.getTime() - b.createdAt.getTime();
    const deliveryOrders = orders.filter(o => o.type === 'livrare');
    return {
      myOrders: deliveryOrders.filter(o => MY_STATUSES.includes(o.status)).sort(byAge),
      availableOrders: deliveryOrders
        .filter(o => AVAILABLE_PRIORITY[o.status] !== undefined)
        .sort((a, b) => AVAILABLE_PRIORITY[a.status]! - AVAILABLE_PRIORITY[b.status]! || byAge(a, b)),
    };
  }, [orders]);

  // Keep the sheet in sync with live order updates (status changes, polling).
  const selectedOrder = orders.find(o => o.id === selectedOrderId) ?? null;
  const readyCount = availableOrders.filter(o => o.status === 'Gata de ridicare').length;

  const postMarkers = useCallback(() => {
    const markers = myOrders
      .filter(o => o.coordinates)
      .map(o => ({ id: o.id, name: o.customerName, lat: o.coordinates!.lat, lng: o.coordinates!.lng }));
    iframeRef.current?.contentWindow?.postMessage({ type: 'updateMarkers', markers }, '*');
  }, [myOrders]);

  useEffect(() => {
    if (viewMode === 'map') postMarkers();
  }, [viewMode, postMarkers]);

  const openOrder = useCallback((order: Order) => setSelectedOrderId(order.id), []);
  const closeOrder = useCallback(() => setSelectedOrderId(null), []);

  return (
    <div className="relative isolate min-h-[100svh] flex flex-col bg-zinc-950 text-zinc-100 font-sans">
      {/* Soft opal glow so the frosted-glass cards have something to blur. */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(70%_45%_at_10%_0%,rgba(212,234,230,0.2),transparent_70%),radial-gradient(60%_40%_at_100%_55%,rgba(212,234,230,0.12),transparent_70%),radial-gradient(50%_35%_at_0%_100%,rgba(251,146,60,0.07),transparent_70%)]"
      />

      {/* Top bar */}
      <header className="sticky top-0 z-30 bg-zinc-950/70 backdrop-blur-2xl border-b border-white/[0.06] px-4 pt-[calc(env(safe-area-inset-top)+20px)] pb-4">
        <div className="max-w-6xl mx-auto flex items-center gap-3">
          <button
            onClick={onBack}
            aria-label="Înapoi"
            className="h-11 w-11 shrink-0 grid place-items-center rounded-full bg-white/[0.06] text-zinc-300 hover:bg-white/10 hover:text-white transition-colors active:scale-95"
          >
            <ChevronLeft size={20} />
          </button>
          <div className="min-w-0 flex-1">
            <h1 className="text-[17px] font-semibold tracking-tight text-white">Curier</h1>
            <p className="text-[12px] text-zinc-500 tabular-nums truncate">
              {myOrders.length} {myOrders.length === 1 ? 'cursă activă' : 'curse active'} · {readyCount} gata de ridicare
            </p>
          </div>
          {onLogout && (
            <button
              onClick={onLogout}
              aria-label="Deconectare"
              title="Deconectare"
              className="h-11 w-11 shrink-0 grid place-items-center rounded-full bg-white/[0.06] text-zinc-400 hover:bg-white/10 hover:text-white transition-colors active:scale-95"
            >
              <LogOut size={18} />
            </button>
          )}
        </div>
      </header>

      <main className="flex-1 relative">
        {viewMode === 'map' ? (
          <div className="absolute inset-0">
            <iframe
              ref={iframeRef}
              srcDoc={COURIER_MAP_HTML}
              title="Harta curselor"
              className="w-full h-full border-0"
              sandbox="allow-scripts allow-same-origin"
              allow="geolocation"
              onLoad={postMarkers}
            />
            {myOrders.length === 0 && (
              <div className="absolute top-6 inset-x-4 mx-auto max-w-sm bg-zinc-900/90 backdrop-blur-xl px-5 py-4 rounded-[24px] border border-white/10 shadow-2xl flex items-center gap-3">
                <Bike size={20} className="text-zinc-500 shrink-0" />
                <p className="text-zinc-300 text-[14px]">Nu ai nicio cursă activă. Preia o comandă din listă.</p>
              </div>
            )}
          </div>
        ) : (
          <div className="max-w-6xl mx-auto px-4 pt-6 pb-[calc(env(safe-area-inset-bottom)+112px)] grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
            <section aria-label="Cursele mele">
              <SectionHeader title="Cursele mele" count={myOrders.length} />
              {myOrders.length === 0 ? (
                <EmptyState icon={Bike}>Nu ai nicio cursă în desfășurare.</EmptyState>
              ) : (
                <div className="flex flex-col gap-4">
                  <AnimatePresence mode="popLayout">
                    {myOrders.map((order, i) => (
                      <CourierOrderCard key={order.id} order={order} index={i} isActiveRun onOpen={openOrder} onAdvance={onUpdateOrderStatus} />
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </section>

            <section aria-label="Comenzi disponibile">
              <SectionHeader title="Disponibile" count={availableOrders.length} />
              {availableOrders.length === 0 ? (
                <EmptyState icon={PackageOpen}>Nu există comenzi noi.</EmptyState>
              ) : (
                <div className="flex flex-col gap-4">
                  <AnimatePresence mode="popLayout">
                    {availableOrders.map((order, i) => (
                      <CourierOrderCard key={order.id} order={order} index={i} isActiveRun={false} onOpen={openOrder} onAdvance={onUpdateOrderStatus} />
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </section>
          </div>
        )}
      </main>

      {/* Bottom tab bar */}
      <nav className="fixed inset-x-0 bottom-0 z-40 flex justify-center px-4 pb-[calc(env(safe-area-inset-bottom)+16px)] pointer-events-none">
        <div className="pointer-events-auto flex gap-1 p-1 rounded-full bg-zinc-900/90 backdrop-blur-xl border border-white/10 shadow-[0_12px_32px_rgba(0,0,0,0.5)]">
          {TABS.map(({ id, label, icon: Icon }) => {
            const active = viewMode === id;
            return (
              <button
                key={id}
                type="button"
                aria-pressed={active}
                onClick={() => setViewMode(id)}
                className={`relative h-11 min-w-[124px] px-5 rounded-full inline-flex items-center justify-center gap-2 text-[14px] font-medium transition-colors ${active ? 'text-white' : 'text-zinc-400 hover:text-zinc-200'}`}
              >
                {active && (
                  <motion.span
                    layoutId="courier-tab"
                    className="absolute inset-0 rounded-full bg-white/10 border border-white/10"
                    transition={{ type: 'spring', stiffness: 500, damping: 40 }}
                  />
                )}
                <Icon size={18} className="relative" />
                <span className="relative">{label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      <OrderDetailsSheet order={selectedOrder} onClose={closeOrder} />
    </div>
  );
}
