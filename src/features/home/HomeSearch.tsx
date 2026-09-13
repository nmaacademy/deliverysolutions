import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, Search, SearchX, X } from 'lucide-react';
import { motion } from 'motion/react';
import { MenuItem } from '../../types';
import { triggerVibration } from '../../lib/haptics';
import { FadeInImage } from '../../components/ui/FadeInImage';

interface Props {
  menuItems: MenuItem[];
  onSelectItem: (item: MenuItem) => void;
  onClose: () => void;
}

/** "Ciorbă" and "ciorba" have to match each other, so both sides lose their diacritics and case. */
const normalize = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

/**
 * Full-screen search over the menu already in memory: no request, no index, no backend. Matches the
 * product name first, then its description and category.
 */
export default function HomeSearch({ menuItems, onSelectItem, onClose }: Props) {
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Escape closes on desktop, and the page behind must not scroll while this is open.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [onClose]);

  const results = useMemo(() => {
    const term = normalize(query.trim());
    const available = menuItems.filter(item => item.available);
    if (!term) return available;

    return available
      .map(item => {
        const name = normalize(item.name);
        if (name.startsWith(term)) return { item, score: 0 };
        if (name.includes(term)) return { item, score: 1 };
        if (normalize(item.category).includes(term)) return { item, score: 2 };
        if (normalize(item.description).includes(term)) return { item, score: 3 };
        return null;
      })
      .filter((match): match is { item: MenuItem; score: number } => match !== null)
      .sort((a, b) => a.score - b.score)
      .map(match => match.item);
  }, [menuItems, query]);

  return (
    <motion.div
      role="dialog"
      aria-modal="true"
      aria-label="Caută preparate"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      className="fixed inset-0 z-[45] flex flex-col bg-zinc-900/95 backdrop-blur-2xl"
    >
      {/* Search bar */}
      <div className="shrink-0 px-4 sm:px-6 pt-[calc(env(safe-area-inset-top)+16px)] pb-4 border-b border-white/[0.06]">
        <div className="max-w-3xl mx-auto flex items-center gap-2">
          <button
            type="button"
            onClick={onClose}
            aria-label="Închide căutarea"
            className="w-11 h-11 shrink-0 grid place-items-center rounded-full bg-white/[0.06] border-[0.5px] border-white/20 text-zinc-300 hover:text-white hover:bg-white/[0.12] transition-colors active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D4EAE6]"
          >
            <ArrowLeft size={19} />
          </button>

          <div className="relative flex-1 min-w-0">
            <Search size={17} aria-hidden className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" />
            <input
              ref={inputRef}
              type="search"
              value={query}
              onChange={event => setQuery(event.target.value)}
              placeholder="Caută un preparat…"
              aria-label="Caută preparate"
              className="w-full h-11 pl-11 pr-11 rounded-full bg-white/[0.06] border-[0.5px] border-white/20 text-[15px] text-white placeholder:text-zinc-500 outline-none focus-visible:ring-2 focus-visible:ring-[#D4EAE6] transition-shadow [&::-webkit-search-cancel-button]:hidden"
            />
            {query && (
              <button
                type="button"
                onClick={() => {
                  setQuery('');
                  inputRef.current?.focus();
                }}
                aria-label="Șterge textul"
                className="absolute right-1 top-1/2 -translate-y-1/2 w-9 h-9 grid place-items-center rounded-full text-zinc-400 hover:text-white hover:bg-white/10 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D4EAE6]"
              >
                <X size={16} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Results */}
      <div className="flex-1 overflow-y-auto no-scrollbar px-4 sm:px-6 py-4 pb-[calc(env(safe-area-inset-bottom)+24px)]">
        <div className="max-w-3xl mx-auto">
          <p role="status" aria-live="polite" className="text-[12px] text-zinc-500 mb-3 px-1">
            {results.length === 0
              ? 'Niciun rezultat'
              : `${results.length} ${results.length === 1 ? 'preparat' : 'preparate'}`}
          </p>

          {results.length === 0 ? (
            <div className="mt-10 flex flex-col items-center text-center gap-3 px-6">
              <span aria-hidden className="w-14 h-14 grid place-items-center rounded-full bg-white/[0.06] text-zinc-500">
                <SearchX size={24} />
              </span>
              <p className="text-[16px] font-semibold text-white">Nu am găsit nimic</p>
              <p className="text-[13px] text-zinc-500 max-w-xs">
                Încearcă alt cuvânt, de exemplu numele unui preparat sau al unei categorii.
              </p>
            </div>
          ) : (
            <ul className="flex flex-col gap-2 sm:grid sm:grid-cols-2 sm:gap-3">
              {results.map(item => (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => {
                      triggerVibration(10);
                      onSelectItem(item);
                    }}
                    className="group w-full flex items-center gap-3 p-2.5 text-left rounded-[24px] bg-white/[0.05] border-[0.5px] border-white/15 hover:bg-white/[0.1] hover:border-white/25 transition-colors active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D4EAE6]"
                  >
                    <FadeInImage
                      src={item.image}
                      alt={item.name}
                      className="w-14 h-14 shrink-0 rounded-[18px] bg-zinc-800"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block text-[15px] font-semibold text-white truncate group-hover:text-[#D4EAE6] transition-colors">
                        {item.name}
                      </span>
                      <span className="block text-[12px] text-zinc-500 truncate">{item.category}</span>
                    </span>
                    <span className="shrink-0 text-[14px] font-semibold text-[#D4EAE6] tabular-nums pr-1">
                      {item.price} RON
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </motion.div>
  );
}
