// Maps render inside srcdoc iframes so Leaflet stays out of the React bundle.
// Every document exposes: RESTAURANT, createMap(), createIcon('restaurant' | 'courier' | 'client'),
// fetchRoute(), drawRouteLine(), drawFallbackLine(), routeHeading() and setCourierHeading().

const LEAFLET_CDN = 'https://unpkg.com/leaflet@1.9.4/dist';

export const RESTAURANT_LOCATION = { lat: 44.4412, lng: 26.095 };

// CARTO raster basemaps require a key passed as ?key=..., otherwise every tile carries an
// "API KEY REQUIRED" watermark. Tile keys travel from the browser, so they are public by nature:
// restrict the key to your domains in the CARTO dashboard. Their terms require the attribution below.
const CARTO_KEY = import.meta.env.VITE_CARTO_BASEMAP_KEY as string | undefined;
const TILE_URL = CARTO_KEY
  ? `https://{s}.basemaps.cartocdn.com/rastertiles/dark_all/{z}/{x}/{y}.png?key=${encodeURIComponent(CARTO_KEY)}`
  : 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';
const TILE_ATTRIBUTION = '&copy; OpenStreetMap &copy; CARTO';

const BASE_CSS = `
  body { margin: 0; padding: 0; overflow: hidden; font-family: 'Plus Jakarta Sans', -apple-system, system-ui, sans-serif; }
  #map { width: 100vw; height: 100vh; }
  .leaflet-container { outline: 0 !important; font-family: inherit; }
  .leaflet-control-attribution { background: rgba(0,0,0,0.35) !important; color: #71717a !important; font-size: 9px !important; }
  .leaflet-control-attribution a { color: #a1a1aa !important; }
  .leaflet-control-zoom { border: none !important; box-shadow: 0 4px 15px rgba(0,0,0,0.5) !important; }
  .leaflet-control-zoom a { background: #27272a !important; color: #fff !important; border: 1px solid rgba(255,255,255,0.05) !important; }

  /* Teardrop pins (restaurant, client): solid body with the glyph cut out, so the map shows through. */
  .map-pin { position: relative; width: 40px; height: 50px; }
  .map-pin .pin-svg {
    display: block; position: relative; z-index: 1;
    filter: drop-shadow(0 3px 5px rgba(0,0,0,0.5));
    transform-origin: 50% 100%;
    animation: pin-drop 0.4s cubic-bezier(0.2, 0.9, 0.3, 1.25) both;
  }
  .map-pin::after {
    content: ''; position: absolute; left: 50%; bottom: 0;
    width: 16px; height: 6px; margin-left: -8px; border-radius: 50%;
    background: rgba(0,0,0,0.55); filter: blur(2px);
  }
  .restaurant-brand-pin {
    position: relative; width: 52px; height: 58px;
    transform-origin: 50% 78%;
    animation: restaurant-pin-arrive 0.42s cubic-bezier(0.2, 0.9, 0.3, 1.18);
  }
  .restaurant-brand-body {
    display: block; width: 52px; height: 58px;
    filter: drop-shadow(0 5px 6px rgba(0,0,0,0.55));
  }
  .restaurant-brand-art {
    position: absolute; z-index: 1; left: 8px; top: 5px;
    display: block; width: 36px; height: 31px; object-fit: contain;
  }
  @keyframes restaurant-pin-arrive {
    from { transform: translateY(-10px) scale(0.78); opacity: 0; }
    to { transform: none; opacity: 1; }
  }
  @keyframes pin-drop {
    from { transform: translateY(-14px) scale(0.85); opacity: 0; }
    to { transform: none; opacity: 1; }
  }

  /* Courier: a top-down car that turns to face its direction of travel. */
  .courier-marker { width: 44px; height: 44px; display: flex; align-items: center; justify-content: center; }
  .courier-car {
    width: 22px; height: 40px;
    filter: drop-shadow(0 3px 4px rgba(0,0,0,0.65));
    transition: transform 0.4s ease;
  }
  @media (prefers-reduced-motion: reduce) {
    .map-pin .pin-svg { animation: none; }
    .restaurant-brand-pin { animation: none; }
    .courier-car { transition: none; }
  }
`;

const BASE_SCRIPT = `
  var RESTAURANT = [${RESTAURANT_LOCATION.lat}, ${RESTAURANT_LOCATION.lng}];
  var ROUTE_COLOR = '#D4EAE6';
  var REDUCED_MOTION = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

  function createMap(center, zoom, options) {
    var map = L.map('map', Object.assign({ zoomControl: false }, options)).setView(center, zoom);
    map.attributionControl.setPrefix(false);
    map.attributionControl.setPosition('bottomleft');
    L.tileLayer('${TILE_URL}', { subdomains: 'abcd', maxZoom: 19, attribution: '${TILE_ATTRIBUTION}' }).addTo(map);
    return map;
  }

  // ---- Markers ----

  // Glyphs, 24x24, cut out of the pin: a soup pot with a ladle for the restaurant (rim, pot and side
  // handles, all wound the same way so the overlaps leave no seam) and a home from Material Icons
  // (Apache 2.0) for the client. GLYPH_LINES are cut as strokes: the ladle is a line, not a shape.
  var GLYPHS = {
    restaurant: 'M2 9.8h20v2.4H2zM4 12h16v5a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4zM1 13.4h3.5v2.4H1zM19.5 13.4H23v2.4h-3.5z',
    client: 'M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z'
  };
  var GLYPH_LINES = {
    restaurant: 'M12.5 10 16.4 3.9a1.8 1.8 0 0 1 3.1 1.8'
  };
  var RESTAURANT_PIN_START = 'M26 43C26 43 47 43 47 22A21 21 0 1 0 5 22C5 43 26 43 26 43Z';
  var RESTAURANT_PIN_END = 'M26 56C26 56 47 37 47 22A21 21 0 1 0 5 22C5 37 26 56 26 56Z';
  // Top-down car, nose up (0deg = north): body, mirrors, windows, roof, head/tail lights.
  var CAR_SVG = '<svg class="courier-car" viewBox="0 0 24 44">' +
    '<rect x="0.6" y="13" width="2.6" height="2" rx="1" fill="#fff"/><rect x="20.8" y="13" width="2.6" height="2" rx="1" fill="#fff"/>' +
    '<rect x="2.5" y="1.5" width="19" height="41" rx="7.5" fill="#fff"/>' +
    '<path d="M5.2 17.5 6.6 11.8Q12 10 17.4 11.8L18.8 17.5Q12 15.6 5.2 17.5Z" fill="#18181b"/>' +
    '<rect x="6.4" y="19" width="11.2" height="12" rx="2.5" fill="#e4e4e7"/>' +
    '<path d="M6 32.6Q12 34.1 18 32.6L17 37Q12 38.2 7 37Z" fill="#18181b"/>' +
    '<rect x="4.6" y="2.7" width="4" height="1.8" rx="0.9" fill="#fde68a"/><rect x="15.4" y="2.7" width="4" height="1.8" rx="0.9" fill="#fde68a"/>' +
    '<rect x="4.9" y="39.6" width="3.6" height="1.5" rx="0.75" fill="#ef4444"/><rect x="15.5" y="39.6" width="3.6" height="1.5" rx="0.75" fill="#ef4444"/>' +
    '</svg>';
  var PIN_COLORS = { restaurant: '#D4EAE6', client: '#fafafa' };
  // 40x50 teardrop: head centred at (20,19) with r=17, tip at (20,48).
  var PIN_PATH = 'M20 48C20 48 37 31.5 37 19A17 17 0 1 0 3 19C3 31.5 20 48 20 48Z';
  var pinSeq = 0;

  function pinHtml(type) {
    var maskId = 'pin-cut-' + (++pinSeq);
    var place = 'transform="translate(9.5 8.5) scale(0.875)"';
    var line = GLYPH_LINES[type]
      ? '<path ' + place + ' d="' + GLYPH_LINES[type] + '" fill="none" stroke="#000" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>'
      : '';
    return '<div class="map-pin"><svg class="pin-svg" width="40" height="50" viewBox="0 0 40 50">' +
      '<defs><mask id="' + maskId + '"><rect width="40" height="50" fill="#fff"/>' +
      '<path ' + place + ' d="' + GLYPHS[type] + '" fill="#000"/>' + line + '</mask></defs>' +
      '<path d="' + PIN_PATH + '" fill="' + PIN_COLORS[type] + '" mask="url(#' + maskId + ')"/>' +
      '<path d="' + PIN_PATH + '" fill="none" stroke="rgba(255,255,255,0.35)" stroke-width="1"/>' +
      '</svg></div>';
  }

  function createIcon(type) {
    if (type === 'restaurant') {
      var morph = REDUCED_MOTION ? '' : '<animate attributeName="d" dur="0.52s" values="' + RESTAURANT_PIN_START + ';' + RESTAURANT_PIN_START + ';' + RESTAURANT_PIN_END + '" keyTimes="0;0.42;1" fill="freeze"/>';
      return L.divIcon({
        className: 'pin-restaurant',
        html: '<div class="restaurant-brand-pin"><svg class="restaurant-brand-body" viewBox="0 0 52 58" aria-hidden="true"><path d="' + RESTAURANT_PIN_END + '" fill="#122F36">' + morph + '</path></svg><img class="restaurant-brand-art" src="/branding/retetar-logo.svg?v=2" alt="" /></div>',
        iconSize: [52, 58], iconAnchor: [26, 56], popupAnchor: [0, -50]
      });
    }
    if (type === 'courier') {
      return L.divIcon({
        className: 'pin-courier',
        html: '<div class="courier-marker">' + CAR_SVG + '</div>',
        iconSize: [44, 44], iconAnchor: [22, 22], popupAnchor: [0, -22]
      });
    }
    return L.divIcon({
      className: 'pin-' + type,
      html: pinHtml(type),
      iconSize: [40, 50], iconAnchor: [20, 48], popupAnchor: [0, -44]
    });
  }

  function setCourierHeading(marker, degrees) {
    var el = marker && marker.getElement && marker.getElement();
    var car = el && el.querySelector('.courier-car');
    if (!car || degrees == null || isNaN(degrees)) return;
    car.style.transform = 'rotate(' + degrees + 'deg)';
  }

  // ---- Routes ----

  function fetchRoute(from, to) {
    var url = 'https://router.project-osrm.org/route/v1/driving/' + from[1] + ',' + from[0] + ';' + to[1] + ',' + to[0] + '?overview=full&geometries=geojson';
    return fetch(url)
      .then(function(res) { return res.json(); })
      .then(function(data) {
        var route = data.routes && data.routes[0];
        if (!route) return null;
        return {
          latlngs: route.geometry.coordinates.map(function(c) { return [c[1], c[0]]; }),
          distance: route.distance,
          duration: route.duration
        };
      })
      .catch(function() { return null; });
  }

  // Draws the path in, like a pen stroke. Call after the final fitBounds: a zoom mid-animation would skew it.
  function animateDraw(layer) {
    var path = layer.getElement && layer.getElement();
    if (REDUCED_MOTION || !path || !path.getTotalLength) return;
    var length = path.getTotalLength();
    path.style.strokeDasharray = length + ' ' + length;
    path.style.strokeDashoffset = String(length);
    path.getBoundingClientRect();
    path.style.transition = 'stroke-dashoffset 0.9s cubic-bezier(0.4, 0, 0.2, 1)';
    path.style.strokeDashoffset = '0';
    path.addEventListener('transitionend', function() {
      path.style.strokeDasharray = '';
      path.style.strokeDashoffset = '';
      path.style.transition = '';
    }, { once: true });
  }

  // Road route: dark casing under a solid opal line, so it reads on any street pattern.
  function drawRouteLine(target, latlngs) {
    var style = { lineCap: 'round', lineJoin: 'round', interactive: false };
    var casing = L.polyline(latlngs, Object.assign({ color: '#09090b', weight: 9, opacity: 0.85 }, style));
    var line = L.polyline(latlngs, Object.assign({ color: ROUTE_COLOR, weight: 4.5, opacity: 1 }, style));
    var group = L.layerGroup([casing, line]).addTo(target);
    animateDraw(casing);
    animateDraw(line);
    return group;
  }

  // Used when routing fails: a dotted straight line so the map never looks broken.
  function drawFallbackLine(target, from, to) {
    return L.polyline([from, to], { color: ROUTE_COLOR, weight: 3, opacity: 0.6, dashArray: '1 8', lineCap: 'round', interactive: false }).addTo(target);
  }

  function bearing(a, b) {
    var rad = Math.PI / 180;
    var lat1 = a[0] * rad, lat2 = b[0] * rad, dLng = (b[1] - a[1]) * rad;
    var y = Math.sin(dLng) * Math.cos(lat2);
    var x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
    return (Math.atan2(y, x) / rad + 360) % 360;
  }

  // Direction of travel along the first ~30 m of the route.
  function routeHeading(latlngs) {
    if (latlngs.length < 2) return null;
    var start = L.latLng(latlngs[0]);
    for (var i = 1; i < latlngs.length; i++) {
      if (start.distanceTo(latlngs[i]) > 30) return bearing(latlngs[0], latlngs[i]);
    }
    return bearing(latlngs[0], latlngs[latlngs.length - 1]);
  }
`;

interface LeafletDocumentOptions {
  script: string;
  background?: string;
  css?: string;
}

export function leafletDocument({ script, background = '#18181b', css = '' }: LeafletDocumentOptions) {
  return `<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <link rel="stylesheet" href="${LEAFLET_CDN}/leaflet.css" />
  <script src="${LEAFLET_CDN}/leaflet.js"></script>
  <style>
    body, #map { background: ${background}; }
    ${BASE_CSS}
    ${css}
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    ${BASE_SCRIPT}
    ${script}
  </script>
</body>
</html>`;
}
