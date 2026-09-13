import { useRef, useState } from 'react';
import { Clock, Info, Loader2, LocateFixed, Store } from 'lucide-react';
import { motion } from 'motion/react';
import { Order } from '../../types';
import { leafletDocument, RESTAURANT_LOCATION } from '../../components/map/leafletDocument';
import ActiveOrderTracker from '../checkout/ActiveOrderTracker';
import { CLIENT_PAGE_BOTTOM, clientTopPadding } from '../client/layout';

interface Props {
  /** Shown as a compact card over the map while a delivery is on its way. */
  orderOnTheWay: Order | null;
  onOpenOrder: (orderId: string) => void;
}

// Reuses the shared Leaflet document (createMap, createIcon, the dark basemap) rather than setting up
// a second map stack. The parent asks the browser for the location and posts the coordinates in.
const CUSTOMER_MAP_HTML = leafletDocument({
  background: '#121214',
  script: `
    var map = createMap(RESTAURANT, 15, { zoomControl: true });
    L.marker(RESTAURANT, { icon: createIcon('restaurant'), zIndexOffset: 900 })
      .addTo(map)
      .bindPopup('Restaurant Demo');

    var meMarker = null;
    var FLY = { animate: !REDUCED_MOTION, duration: 1.2 };

    window.addEventListener('message', function(event) {
      if (!event.data) return;

      if (event.data.type === 'showMe') {
        var loc = [event.data.lat, event.data.lng];
        if (meMarker) meMarker.setLatLng(loc);
        else meMarker = L.marker(loc, { icon: createIcon('client'), zIndexOffset: 1000 }).addTo(map);
        map.flyTo(loc, 16, FLY);
      }

      if (event.data.type === 'showRestaurant') {
        map.flyTo(RESTAURANT, 15, FLY);
      }
    });
  `,
});

const DEMO_HOURS = [
  { days: 'Luni – Joi', hours: '10:00 – 23:00' },
  { days: 'Vineri – Sâmbătă', hours: '10:00 – 01:00' },
  { days: 'Duminică', hours: '11:00 – 22:00' },
];

type LocateState = 'idle' | 'locating' | 'denied';

export default function CustomerMapScreen({ orderOnTheWay, onOpenOrder }: Props) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [locate, setLocate] = useState<LocateState>('idle');

  const post = (message: Record<string, unknown>) =>
    iframeRef.current?.contentWindow?.postMessage(message, '*');

  const handleLocate = () => {
    if (!navigator.geolocation) {
      setLocate('denied');
      return;
    }
    setLocate('locating');
    navigator.geolocation.getCurrentPosition(
      position => {
        post({ type: 'showMe', lat: position.coords.latitude, lng: position.coords.longitude });
        setLocate('idle');
      },
      () => setLocate('denied'),
      { enableHighAccuracy: true, timeout: 6000, maximumAge: 0 },
    );
  };

  return (
    <div className={CLIENT_PAGE_BOTTOM} style={{ paddingTop: clientTopPadding() }}>
      <div className="max-w-3xl mx-auto px-4 sm:px-6">
        <h1 className="text-[28px] sm:text-[32px] font-sans font-semibold tracking-tight text-white mb-1">Hartă</h1>
        <p className="text-[13px] text-zinc-400 mb-5">Unde ne găsești și unde ajunge comanda ta.</p>

        {/* Only while a courier is actually on the road: tapping it opens the full tracking page. */}
        {orderOnTheWay && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="mb-4"
          >
            <ActiveOrderTracker order={orderOnTheWay} onOpen={() => onOpenOrder(orderOnTheWay.id)} />
          </motion.div>
        )}

        <div className="relative isolate h-[52svh] min-h-[320px] rounded-[32px] overflow-hidden bg-[#121214] border border-white/10 shadow-[inset_0_0_20px_rgba(0,0,0,0.5)]">
          <iframe
            ref={iframeRef}
            srcDoc={CUSTOMER_MAP_HTML}
            title="Harta restaurantului"
            className="absolute inset-0 w-full h-full border-0"
            sandbox="allow-scripts allow-same-origin"
          />

          <div className="absolute bottom-4 right-4 z-10 flex flex-col gap-2">
            <button
              type="button"
              onClick={() => post({ type: 'showRestaurant' })}
              aria-label="Centrează pe restaurant"
              title="Centrează pe restaurant"
              className="w-11 h-11 grid place-items-center rounded-full bg-zinc-800/90 backdrop-blur-md border border-white/10 shadow-[0_4px_16px_rgba(0,0,0,0.5)] text-orange-400 hover:bg-zinc-700/90 active:scale-95 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D4EAE6]"
            >
              <Store size={19} />
            </button>
          </div>
        </div>

        {/* Restaurant card */}
        <section className="mt-4 rounded-[32px] bg-white/[0.06] backdrop-blur-2xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.35)] p-5">
          <div className="flex items-start gap-3">
            <span className="w-11 h-11 shrink-0 grid place-items-center rounded-full bg-orange-400/10 text-orange-400">
              <Store size={20} />
            </span>
            <div className="min-w-0 flex-1">
              <h2 className="text-[18px] font-semibold tracking-tight text-white">Restaurant Demo</h2>
              <p className="text-[13px] text-zinc-400 mt-0.5">Calea Victoriei, București · locație demo</p>
            </div>
          </div>

          <div className="mt-5 pt-5 border-t border-white/10">
            <div className="flex items-center gap-2 mb-3">
              <Clock size={15} className="text-[#D4EAE6] shrink-0" />
              <h3 className="text-[13px] font-semibold text-zinc-300">Program demo</h3>
            </div>
            <ul className="space-y-1.5">
              {DEMO_HOURS.map(({ days, hours }) => (
                <li key={days} className="flex items-baseline justify-between gap-4 text-[13px]">
                  <span className="text-zinc-400">{days}</span>
                  <span className="text-zinc-200 tabular-nums">{hours}</span>
                </li>
              ))}
            </ul>
          </div>

          <button
            type="button"
            onClick={handleLocate}
            disabled={locate === 'locating'}
            className="mt-5 w-full min-h-[48px] inline-flex items-center justify-center gap-2 rounded-full bg-white/[0.08] border border-white/10 text-[14px] font-medium text-zinc-100 hover:bg-white/[0.12] transition-colors active:scale-[0.99] disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D4EAE6] focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-900"
          >
            {locate === 'locating' ? <Loader2 size={17} className="animate-spin" /> : <LocateFixed size={17} />}
            {locate === 'locating' ? 'Se caută locația…' : 'Locația mea'}
          </button>

          {locate === 'denied' && (
            <p role="status" className="mt-2.5 text-[12px] text-amber-300/90 text-center">
              Nu am putut afla locația. Verifică permisiunile browserului.
            </p>
          )}
        </section>

        <p className="mt-4 flex items-start gap-2 text-[12px] text-zinc-500 leading-relaxed px-1">
          <Info size={14} className="shrink-0 mt-0.5" />
          Hartă demonstrativă. Locația restaurantului ({RESTAURANT_LOCATION.lat.toFixed(4)},{' '}
          {RESTAURANT_LOCATION.lng.toFixed(4)}) și programul sunt date de test, iar poziția curierului nu este urmărită
          în timp real.
        </p>
      </div>
    </div>
  );
}
