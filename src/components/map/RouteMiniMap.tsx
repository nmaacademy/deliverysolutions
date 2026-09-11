import { useEffect, useMemo, useRef } from 'react';
import { leafletDocument } from './leafletDocument';

export interface RouteInfo {
  minutes: number;
  km: number;
}

// Static preview (no dragging/zoom) so it never traps page scrolling. Routes from the courier's
// live position when geolocation is allowed, otherwise from the restaurant, and reports ETA/distance
// to the parent via postMessage.
function routeMapHtml(lat: number, lng: number) {
  return leafletDocument({
    script: `
      var clientLoc = [${lat}, ${lng}];
      var map = createMap(clientLoc, 14, {
        dragging: false, touchZoom: false, scrollWheelZoom: false,
        doubleClickZoom: false, boxZoom: false, keyboard: false
      });
      // Pins rise ~50px above their point and the courier disc is 44px wide, so pad for both.
      var FIT = { paddingTopLeft: [32, 58], paddingBottomRight: [32, 30], maxZoom: 16, animate: false };

      L.marker(clientLoc, { icon: createIcon('client'), zIndexOffset: 800, interactive: false }).addTo(map);
      map.fitBounds(L.latLngBounds([RESTAURANT, clientLoc]), FIT);

      var started = false;
      function showRoute(from, originType) {
        if (started) return;
        started = true;
        var origin = L.marker(from, { icon: createIcon(originType), zIndexOffset: 1000, interactive: false }).addTo(map);
        fetchRoute(from, clientLoc).then(function(route) {
          if (!route) {
            map.fitBounds(L.latLngBounds([from, clientLoc]), FIT);
            drawFallbackLine(map, from, clientLoc);
            return;
          }
          map.fitBounds(L.latLngBounds(route.latlngs.concat([from, clientLoc])), FIT);
          drawRouteLine(map, route.latlngs);
          if (originType === 'courier') setCourierHeading(origin, routeHeading(route.latlngs));
          parent.postMessage({ type: 'route-info', minutes: Math.max(1, Math.round(route.duration / 60)), km: route.distance / 1000 }, '*');
        });
      }

      function fromRestaurant() { showRoute(RESTAURANT, 'restaurant'); }
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(function(pos) {
          showRoute([pos.coords.latitude, pos.coords.longitude], 'courier');
        }, fromRestaurant, { timeout: 5000, maximumAge: 60000 });
      } else {
        fromRestaurant();
      }
    `,
  });
}

interface Props {
  lat: number;
  lng: number;
  className?: string;
  onRouteInfo?: (info: RouteInfo) => void;
}

export function RouteMiniMap({ lat, lng, className = '', onRouteInfo }: Props) {
  const html = useMemo(() => routeMapHtml(lat, lng), [lat, lng]);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    if (!onRouteInfo) return;
    const onMessage = (event: MessageEvent) => {
      if (event.source !== iframeRef.current?.contentWindow || event.data?.type !== 'route-info') return;
      onRouteInfo({ minutes: event.data.minutes, km: event.data.km });
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [onRouteInfo]);

  return (
    <iframe
      ref={iframeRef}
      srcDoc={html}
      title="Traseu către client"
      className={`block w-full border-0 ${className}`}
      allow="geolocation"
      loading="lazy"
    />
  );
}
