import { useMemo } from 'react';
import { motion } from 'motion/react';
import { Plus } from 'lucide-react';
import { MenuItem, OrderType } from '../../types';
import { triggerVibration } from '../../lib/haptics';
import { SegmentedControl } from '../../components/ui/SegmentedControl';
import { FadeInImage } from '../../components/ui/FadeInImage';

interface Props {
  menuItems: MenuItem[];
  orderType: OrderType;
  setOrderType: (type: OrderType) => void;
  onSelectItem: (item: MenuItem) => void;
  /** Order trackers pinned over the top of the hero; the hero grows so they don't cover its text. */
  trackerCount?: number;
}

const TRACKER_SLOT_PX = 72;

export default function MenuScreen({ menuItems, orderType, setOrderType, onSelectItem, trackerCount = 0 }: Props) {
  const categories = useMemo(() => {
    return Array.from(new Set(menuItems.map(i => i.category)));
  }, [menuItems]);

  const heroInset = Math.min(trackerCount, 2) * TRACKER_SLOT_PX;

  return (
    <div className="pb-32">
      {/* Hero Section */}
      <div
        className="relative w-full h-[45svh] min-h-[400px] mb-10 transition-[height,min-height] duration-300"
        style={heroInset ? { height: `calc(45svh + ${heroInset}px)`, minHeight: 400 + heroInset } : undefined}
      >
        <div className="absolute inset-0">
          <img src="https://images.unsplash.com/photo-1555244162-803834f70033?auto=format&fit=crop&q=80" alt="Chef flambeing in dark kitchen" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-zinc-900/70" />
          <div className="absolute inset-0 bg-gradient-to-t from-zinc-900 via-zinc-900/40 to-transparent" />
        </div>
        <div
          className="absolute inset-0 flex flex-col items-center justify-center px-4 text-center mt-12"
          style={heroInset ? { paddingTop: heroInset } : undefined}
        >
          <span className="text-[#D4EAE6] tracking-[0.2em] uppercase text-xs sm:text-sm font-semibold mb-4 drop-shadow-md">Fine Dining</span>
          <h1 className="text-5xl sm:text-7xl font-sans font-semibold tracking-tight text-white tracking-tight mb-8 drop-shadow-lg">Restaurant Demo</h1>
          
          {/* Delivery Toggle */}
          <div className="w-full max-w-[280px] sm:max-w-[320px] shadow-2xl relative">
            <SegmentedControl
              id="order-type"
              value={orderType}
              onChange={(val) => {
                triggerVibration(15);
                setOrderType(val as OrderType);
              }}
              options={[
                { label: 'Livrare', value: 'livrare' },
                { label: 'Ridicare', value: 'ridicare' }
              ]}
            />
          </div>
        </div>
      </div>

      {/* Menu Categories */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-32">
        {categories.map(category => {
          const items = menuItems.filter(i => i.category === category);
          if (items.length === 0) return null;
          
          return (
            <div key={category} className="mb-20">
              <div className="flex items-center gap-6 mb-12">
                <div className="flex-1 h-px bg-zinc-700/60"></div>
                <h2 className="text-3xl font-sans font-semibold tracking-tight text-white text-center">{category}</h2>
                <div className="flex-1 h-px bg-zinc-700/60"></div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
                {items.map((item, index) => (
                  <motion.div 
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: index * 0.1, ease: "easeOut" }}
                    whileHover={{ y: -4 }}
                    whileTap={{ scale: 0.98 }}
                    key={item.id}
                    onClick={() => {
                      if (item.available) {
                        triggerVibration(10);
                        onSelectItem(item);
                      }
                    }}
                    className={`group flex flex-col gap-4 p-4 sm:p-5 bg-white/5 backdrop-blur-md border-[0.5px] border-white/20 shadow-[inset_0_1px_1px_rgba(255,255,255,0.15),0_8px_32px_rgba(0,0,0,0.3)] rounded-[32px] cursor-pointer transition-all ${!item.available ? 'opacity-40 grayscale' : 'hover:bg-white/10 hover:border-white/30'}`}
                  >
                    <div className="w-full h-48 sm:h-64 shrink-0 rounded-[24px] overflow-hidden bg-zinc-800 border border-zinc-700/50 transition-all duration-500 shadow-[0_8px_30px_rgba(161,161,170,0.15)] group-hover:shadow-[0_12px_40px_rgba(161,161,170,0.3)] relative">
                      <FadeInImage src={item.image} alt={item.name} />
                      {!item.available && (
                        <div className="absolute inset-0 bg-zinc-900/40 flex items-center justify-center backdrop-blur-[2px]">
                          <span className="bg-zinc-900/80 text-white px-4 py-2 rounded-full text-xs font-semibold uppercase tracking-wider">Indisponibil</span>
                        </div>
                      )}
                    </div>
                    
                    <div className="flex-1 flex flex-col px-2">
                      <div className="flex justify-between items-baseline mb-2">
                        <h3 className="text-xl sm:text-2xl font-sans font-semibold tracking-tight text-white group-hover:text-[#D4EAE6] transition-colors leading-tight">{item.name}</h3>
                        <span className="text-[#D4EAE6] font-medium whitespace-nowrap ml-4 text-lg">{item.price} RON</span>
                      </div>
                      <p className="text-sm text-zinc-300 leading-relaxed line-clamp-2">{item.description}</p>
                      
                      <div className="mt-4 pt-4 border-t border-zinc-700/40 flex justify-between items-center">
                        <span className="text-xs uppercase tracking-[0.15em] font-semibold text-zinc-400 group-hover:text-[#D4EAE6] transition-colors">
                          {item.available ? 'Apasa pentru a personaliza' : 'Stoc Epuizat'}
                        </span>
                        {item.available && (
                          <div className="w-8 h-8 rounded-full bg-[#D4EAE6]/10 flex items-center justify-center text-[#D4EAE6] group-hover:bg-[#D4EAE6] group-hover:text-zinc-900 transition-colors">
                            <Plus size={18} strokeWidth={2.5} />
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
