import React, { useState } from 'react';

interface Props {
  src: string;
  alt: string;
  className?: string;
  imageClassName?: string;
}

export function FadeInImage({ src, alt, className = '', imageClassName = '' }: Props) {
  const [loaded, setLoaded] = useState(false);

  return (
    <div className={`relative overflow-hidden ${className}`}>
      {/* Background skeleton base */}
      {!loaded && (
        <div className="absolute inset-0 bg-white/5 backdrop-blur-md flex items-center justify-center overflow-hidden pointer-events-none">
          {/* Premium shimmer gradient moving across */}
          <div className="absolute inset-0 -translate-x-full animate-shimmer w-[200%] bg-gradient-to-r from-transparent via-white/10 to-transparent skew-x-[-20deg]" />
        </div>
      )}
      
      <img
        src={src}
        alt={alt}
        onLoad={() => setLoaded(true)}
        onError={(e) => (e.currentTarget.src = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&q=80')}
        className={`w-full h-full object-cover transition-opacity duration-700 ease-out ${loaded ? 'opacity-100' : 'opacity-0'} ${imageClassName}`}
      />
    </div>
  );
}
