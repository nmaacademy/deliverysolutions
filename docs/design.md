# Design

- Mod: redesign cu păstrarea structurii și a interacțiunilor existente.
- Temă: fundalul original zinc `#18181B`; verde-petrol `#122F36` rămâne limitat la logo și elementele de brand, iar opalul `#D4EAE6` rămâne accent funcțional.
- Cremul din logo `#EBDFC3` rămâne în principal în assetul de brand, ca să nu concureze cu opalul.
- Logo sursă: `public/branding/retetar-logo.svg`; se afișează prin `src/components/brand/BrandLogo.tsx`.
- Nume public: `Rețetar demo`; wordmark-ul din SVG se folosește unde spațiul permite.
- Integrare brand: header client comun, intro, hartă/pin, pickup curier, PDF „Meniul zilei”, favicon și iconuri PWA.
- Intro: fără loader sau logo suprapus; clipul rulează la `1.3x`, iar handoff-ul durează `0.55s`.
- Pin restaurant: discul verde-petrol se transformă animat într-un pin fără contur; logo-ul SVG original este suprapus fără rotații sau scalări CSS persistente.
- Coș: foaie translucidă cu intrare scurtă; navbarul client rămâne vizibil și marchează tabul Coș.
- Raze: butoane/chips `rounded-full`, carduri `rounded-card`, tiles `rounded-tile`.
- Motivul schimbării: logo-ul nou devine sursa de adevăr, fără refacerea letteringului sau a structurii aplicației.
