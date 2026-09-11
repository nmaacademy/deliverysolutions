import { useState, useEffect, useRef } from 'react';
import { Navigation, MapPin, Loader2 } from 'lucide-react';
import { leafletDocument } from './leafletDocument';

const MAP_HTML = leafletDocument({
  background: '#121214',
  script: `
    var map = createMap(RESTAURANT, 16);

    window.addEventListener('message', function(event) {
      if (event.data && event.data.type === 'flyTo') {
        map.flyTo([event.data.lat, event.data.lng], 17, { animate: true, duration: 1.5 });
      }
    });

    map.on('movestart', function() { window.parent.postMessage('movestart', '*'); });
    map.on('moveend', function() { window.parent.postMessage('moveend', '*'); });
  `,
});

export function LocationMap() {
  const [isDragging, setIsDragging] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data === 'movestart') setIsDragging(true);
      if (event.data === 'moveend') setIsDragging(false);
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const handleLocate = () => {
    if (!navigator.geolocation) return;
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        iframeRef.current?.contentWindow?.postMessage({ type: 'flyTo', lat: latitude, lng: longitude }, '*');
        setIsLocating(false);
      },
      (error) => {
        console.error("Eroare la preluarea locației:", error);
        setIsLocating(false);
      },
      { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
    );
  };

  return (
    <div className="w-full h-56 sm:h-72 rounded-[28px] overflow-hidden border border-white/10 shadow-[inset_0_0_20px_rgba(0,0,0,0.5)] relative isolate bg-[#121214]">

      <iframe
        ref={iframeRef}
        srcDoc={MAP_HTML}
        title="Interactive Map"
        className="absolute inset-0 w-full h-full border-0 opacity-90"
        sandbox="allow-scripts allow-same-origin"
      />

      <div
        className={`absolute top-1/2 left-1/2 -translate-x-1/2 flex flex-col items-center z-10 transition-transform duration-300 ease-out pointer-events-none ${
          isDragging ? '-translate-y-[120%]' : '-translate-y-full'
        }`}
      >
        {!isDragging && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 pointer-events-none flex items-center justify-center">
            <div className="absolute w-12 h-12 bg-[#D4EAE6]/20 rounded-full animate-[ping_2s_cubic-bezier(0,0,0.2,1)_infinite]" />
            <div className="absolute w-8 h-8 bg-[#D4EAE6]/30 rounded-full animate-[ping_2s_cubic-bezier(0,0,0.2,1)_infinite] delay-300" />
          </div>
        )}

        <MapPin
          size={44}
          strokeWidth={1.5}
          className="text-[#D4EAE6] drop-shadow-[0_10px_20px_rgba(0,0,0,0.8)] relative z-10 mt-2"
          fill="#121214"
        />

        <div className={`bg-black/90 rounded-[50%] blur-[2px] transition-all duration-300 ${
          isDragging ? 'w-4 h-1 mt-6 opacity-30 scale-150' : 'w-7 h-1.5 -mt-2 opacity-90'
        }`} />
      </div>

      <div className="absolute bottom-4 right-4 z-20">
        <button
          onClick={handleLocate}
          disabled={isLocating}
          type="button"
          className="w-11 h-11 bg-zinc-800/90 backdrop-blur-md rounded-full flex items-center justify-center border border-white/10 shadow-[0_4px_16px_rgba(0,0,0,0.5)] hover:bg-zinc-700/90 active:scale-95 transition-all text-[#D4EAE6]"
        >
          {isLocating ? (
            <Loader2 size={20} className="animate-spin text-[#D4EAE6]" />
          ) : (
            <Navigation size={20} className="fill-[#D4EAE6]/20" />
          )}
        </button>
      </div>

      <div className="absolute inset-0 pointer-events-none bg-gradient-to-t from-zinc-900/80 via-transparent to-zinc-900/10 shadow-[inset_0_0_30px_rgba(0,0,0,0.8)]" />
    </div>
  );
}
