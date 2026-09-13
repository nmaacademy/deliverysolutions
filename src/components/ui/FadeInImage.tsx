import { useState } from 'react';

interface Props {
  src: string;
  alt: string;
  className?: string;
  imageClassName?: string;
}

/** Sources that loaded once already. A page that comes back shows them at once instead of fading them in again. */
const loadedSources = new Set<string>();

export function FadeInImage({ src, alt, className = '', imageClassName = '' }: Props) {
  const [loadedSrc, setLoadedSrc] = useState<string | null>(null);
  const loaded = loadedSrc === src || loadedSources.has(src);

  const markLoaded = () => {
    loadedSources.add(src);
    setLoadedSrc(src);
  };

  return (
    <div className={`relative overflow-hidden ${className}`}>
      {/* Background skeleton base */}
      {!loaded && (
        <div className="absolute inset-0 bg-white/5 flex items-center justify-center overflow-hidden pointer-events-none">
          {/* Premium shimmer gradient moving across */}
          <div className="absolute inset-0 -translate-x-full animate-shimmer w-[200%] bg-gradient-to-r from-transparent via-white/10 to-transparent skew-x-[-20deg]" />
        </div>
      )}

      <img
        // An image the browser already has in cache can finish before React attaches onLoad.
        ref={img => {
          if (img?.complete && img.naturalWidth > 0 && !loaded) markLoaded();
        }}
        src={src}
        alt={alt}
        onLoad={markLoaded}
        onError={(e) => (e.currentTarget.src = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&q=80')}
        className={`w-full h-full object-cover transition-opacity duration-300 ease-out ${loaded ? 'opacity-100' : 'opacity-0'} ${imageClassName}`}
      />
    </div>
  );
}
