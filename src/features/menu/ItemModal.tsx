import { useState } from 'react';
import { X, Plus, Minus, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { MenuItem, Extra } from '../../types';
import { triggerVibration } from '../../lib/haptics';
import { extrasTotal } from '../../lib/pricing';

interface Props {
  item: MenuItem;
  onClose: () => void;
  onAdd: (item: MenuItem, quantity: number, extras: Extra[]) => void;
}

export default function ItemModal({ item, onClose, onAdd }: Props) {
  const [quantity, setQuantity] = useState(1);
  const [selectedExtras, setSelectedExtras] = useState<Extra[]>([]);
  const [isAdding, setIsAdding] = useState(false);

  const toggleExtra = (extra: Extra) => {
    triggerVibration(10);
    setSelectedExtras(prev => 
      prev.find(e => e.id === extra.id) 
        ? prev.filter(e => e.id !== extra.id)
        : [...prev, extra]
    );
  };

  const handleQuantityChange = (delta: number) => {
    triggerVibration(15);
    setQuantity(Math.max(1, quantity + delta));
  };

  const handleAdd = async () => {
    if (isAdding) return;
    
    // Apple-style double haptic feedback for success
    triggerVibration([15, 30, 15]);
    
    setIsAdding(true);
    
    // Hold the success state briefly to show the animation
    await new Promise(resolve => setTimeout(resolve, 400));
    
    onAdd(item, quantity, selectedExtras);
  };

  const total = (item.price + extrasTotal(selectedExtras)) * quantity;

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="fixed inset-0 z-50 flex flex-col justify-end sm:justify-center items-center p-0 sm:p-4 bg-zinc-900/70 backdrop-blur-2xl" 
      onClick={onClose}
    >
      <motion.div 
        initial={{ scale: 0.95, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 20 }}
        transition={{ type: "spring", stiffness: 400, damping: 30, opacity: { duration: 0.15, ease: "easeOut" } }}
        onClick={(e) => e.stopPropagation()}
        className="bg-zinc-900 border-t border-white/10 shadow-[0_-8px_40px_rgba(0,0,0,0.6)] w-full sm:max-w-md rounded-t-[32px] sm:rounded-[28px] overflow-hidden flex flex-col max-h-[90svh] sm:h-auto relative isolate"
      >
          {/* Mobile Drag Handle */}
          <div className="absolute top-3 left-1/2 -translate-x-1/2 w-12 h-1.5 bg-white/20 rounded-full sm:hidden z-10" />

          <div className="relative h-56 sm:h-72 w-full shrink-0">
            <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-zinc-900 to-transparent" />
            <button 
              onClick={onClose}
              className="absolute top-4 right-4 bg-zinc-800/60 backdrop-blur-2xl border-[0.5px] border-white/20 shadow-[inset_0_1px_1px_rgba(255,255,255,0.15),0_4px_24px_rgba(0,0,0,0.3)] text-zinc-200 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-full hover:bg-zinc-700/60 hover:text-white transition"
            >
              <X size={20} />
            </button>
          </div>
          
          <div className="p-5 sm:p-6 overflow-y-auto no-scrollbar pb-8">
            <h2 className="text-2xl sm:text-3xl font-sans font-semibold tracking-tight text-white mb-2">{item.name}</h2>
            <p className="text-zinc-300 mb-8 leading-relaxed text-sm">{item.description}</p>
            
            {item.extras && item.extras.length > 0 && (
              <div className="mb-8">
                <h3 className="text-xs font-semibold text-[#D4EAE6] uppercase tracking-[0.15em] mb-4">Opționale</h3>
                <div className="space-y-2">
                  {item.extras.map(extra => (
                    <label key={extra.id} className="flex items-center justify-between group cursor-pointer p-4 min-h-[44px] rounded-[24px] bg-zinc-800/40 backdrop-blur-md border-[0.5px] border-white/10 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)] hover:bg-zinc-800/60 hover:border-white/20 transition-all">
                      <div className="flex items-center gap-4">
                        <div className={`w-5 h-5 rounded-md border flex items-center justify-center transition duration-300 ${selectedExtras.find(e => e.id === extra.id) ? 'bg-[#D4EAE6] border-[#D4EAE6]' : 'border-zinc-500 group-hover:border-zinc-300'}`}>
                          {selectedExtras.find(e => e.id === extra.id) && <Check size={14} strokeWidth={3} className="text-zinc-900" />}
                        </div>
                        <span className="text-zinc-200 group-hover:text-white transition">{extra.name}</span>
                      </div>
                      <span className="text-zinc-400 text-sm">{extra.price > 0 ? `+${extra.price} RON` : 'Gratuit'}</span>
                      <input 
                        type="checkbox" 
                        className="hidden" 
                        checked={!!selectedExtras.find(e => e.id === extra.id)}
                        onChange={() => toggleExtra(extra)}
                      />
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>
          
          <div className="p-5 sm:p-6 bg-zinc-900/40 border-t border-zinc-700 mt-auto pb-[calc(1.25rem+env(safe-area-inset-bottom))]">
            <div className="flex items-center justify-between mb-6">
              <span className="text-zinc-300 text-xs font-semibold uppercase tracking-wider">Cantitate</span>
              <div className="flex items-center gap-2 bg-zinc-800/40 backdrop-blur-3xl border border-white/10 rounded-full px-2 py-1 shadow-[inset_0_2px_15px_rgba(0,0,0,0.5),0_4px_20px_rgba(255,255,255,0.05)]">
                <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.8 }} transition={{ type: "spring", stiffness: 400, damping: 17 }} onClick={() => handleQuantityChange(-1)} className="text-zinc-400 hover:text-white transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center rounded-full"><Minus size={16} /></motion.button>
                <span className="w-8 text-center font-medium text-white">{quantity}</span>
                <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.8 }} transition={{ type: "spring", stiffness: 400, damping: 17 }} onClick={() => handleQuantityChange(1)} className="text-zinc-400 hover:text-white transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center rounded-full"><Plus size={16} /></motion.button>
              </div>
            </div>
            
            <motion.button 
              whileTap={{ scale: 0.96 }}
              onClick={handleAdd}
              disabled={isAdding}
              className="w-full bg-[#D4EAE6] text-zinc-900 py-4 rounded-full font-medium hover:bg-[#B8D6D1] transition shadow-[0_8px_32px_rgba(212,234,230,0.2)] flex items-center justify-center h-[56px] relative overflow-hidden"
            >
              <AnimatePresence mode="wait">
                {isAdding ? (
                  <motion.div
                    key="adding"
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 1.5, opacity: 0 }}
                    transition={{ type: "spring", stiffness: 400, damping: 25 }}
                    className="flex items-center gap-2 text-zinc-900"
                  >
                    <Check size={20} strokeWidth={3} />
                    <span className="font-semibold tracking-wide">Adăugat</span>
                  </motion.div>
                ) : (
                  <motion.span
                    key="add"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  >
                    Adaugă în coș • {total} RON
                  </motion.span>
                )}
              </AnimatePresence>
            </motion.button>
          </div>
        </motion.div>
      </motion.div>
  );
}
