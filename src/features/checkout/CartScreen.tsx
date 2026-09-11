import { useState, useEffect } from 'react';
import { ChevronLeft, Plus, Minus, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { CartItem, OrderType, Order } from '../../types';
import { triggerVibration } from '../../lib/haptics';
import { DELIVERY_FEE, cartSubtotal, lineTotal } from '../../lib/pricing';
import { SegmentedControl } from '../../components/ui/SegmentedControl';
import { LocationMap } from '../../components/map/LocationMap';

const PillInput = ({ label, id, className = '', ...props }: any) => (
  <div className={`w-full flex flex-col gap-2 ${className}`}>
    <label htmlFor={id} className="text-[10px] uppercase tracking-wider font-semibold text-zinc-400 pl-4">
      {label}
    </label>
    <input
      id={id}
      {...props}
      className="w-full bg-white/5 backdrop-blur-md border-[0.5px] border-white/10 rounded-full px-6 py-4 text-white text-sm focus:outline-none focus:border-[#D4EAE6]/50 focus:bg-white/10 transition-all shadow-[inset_0_1px_1px_rgba(255,255,255,0.05),0_4px_16px_rgba(0,0,0,0.1)] placeholder:text-zinc-600"
    />
  </div>
);

interface Props {
  cart: CartItem[];
  setCart: (cart: CartItem[] | ((prev: CartItem[]) => CartItem[])) => void;
  orderType: OrderType;
  onBack: () => void;
  onPlaceOrder: (orderData: Partial<Order>) => void;
}

export default function CartScreen({ cart, setCart, orderType, onBack, onPlaceOrder }: Props) {
  useEffect(() => {
    // 1. Resetam instant scroll-ul la 0 ca sa evitam acel gol alb ramas de la pagina anterioara
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });

    // 2. Dupa ce animatia de intrare se incheie, scrollam lin catre sectiunea Comanda Ta
    setTimeout(() => {
      const el = document.getElementById('comanda-ta');
      if (el) {
        const y = el.getBoundingClientRect().top + window.scrollY - 80; // 80px pentru meniul sticky
        window.scrollTo({ top: y, behavior: 'smooth' });
      }
    }, 400); // 400ms lasa timp animatiei sa se termine
  }, []);

  const [checkoutStep, setCheckoutStep] = useState(1);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [timeMode, setTimeMode] = useState<'asap' | 'scheduled'>('asap');
  const [scheduledTime, setScheduledTime] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'cash'>('card');

  const subtotal = cartSubtotal(cart);
  const deliveryFee = orderType === 'livrare' ? DELIVERY_FEE : 0;
  const total = subtotal + deliveryFee;

  const updateQuantity = (id: string, delta: number) => {
    triggerVibration(15);
    setCart(prev => prev.map(item => {
      if (item.id === id) {
        const newQty = item.quantity + delta;
        return newQty > 0 ? { ...item, quantity: newQty } : item;
      }
      return item;
    }));
  };

  const removeItem = (id: string) => {
    triggerVibration(20);
    setCart(prev => prev.filter(item => item.id !== id));
  };

  const handlePlaceOrder = () => {
    if (cart.length === 0) return;
    triggerVibration([20, 100, 30]); // long vibration for placing order
    onPlaceOrder({
      customerName: name || 'Oaspete',
      customerPhone: phone,
      address: orderType === 'livrare' ? address : undefined,
      coordinates: orderType === 'livrare' ? { lat: 44.43 + (Math.random() * 0.05 - 0.025), lng: 26.09 + (Math.random() * 0.05 - 0.025) } : undefined,
      time: timeMode === 'asap' ? 'Cât mai repede (30-45 min)' : scheduledTime,
      type: orderType,
      items: cart,
      total,
      paymentMethod
    });
  };

  if (cart.length === 0) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8 min-h-screen flex flex-col">
        <button onClick={onBack} className="flex items-center justify-center min-h-[44px] min-w-[44px] text-zinc-400 hover:text-zinc-800 transition self-start mb-12">
          <ChevronLeft size={20} className="mr-1" />
          Înapoi la meniu
        </button>
        <div className="flex-1 flex flex-col items-center justify-center text-center">
          <h2 className="text-3xl font-sans font-semibold tracking-tight text-zinc-800 mb-4">Coșul este gol</h2>
          <p className="text-zinc-400 mb-8">Nu ai adăugat niciun produs în coș încă.</p>
          <button onClick={onBack} className="bg-zinc-800 text-white px-8 min-h-[44px] rounded-full font-medium hover:bg-zinc-700 transition">
            Explorează meniul
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto py-4 sm:py-8 pb-40 sm:pb-32 min-h-[100svh]">
      
      {/* iOS Style Sticky Top Bar */}
      <div className="sticky top-0 z-40 bg-zinc-900/80 backdrop-blur-2xl border-b border-zinc-700/50 px-4 sm:px-6 py-4 flex items-center justify-between mb-6 sm:mb-8">
        <button onClick={onBack} className="flex items-center justify-center min-h-[44px] text-[#D4EAE6] hover:text-white transition active:scale-95 font-medium -ml-2 px-2">
          <ChevronLeft size={22} className="mr-0.5" />
          <span>Înapoi</span>
        </button>
        <h1 className="text-lg font-sans font-semibold tracking-tight text-white absolute left-1/2 -translate-x-1/2">Finalizare comandă</h1>
        <div className="w-16"></div> {/* Spacer for center alignment */}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-16 px-4 sm:px-6">
        {/* Cart Items - Native Grouped List Style */}
        <div className="lg:col-span-7">
          <h2 id="comanda-ta" className="text-2xl sm:text-3xl font-sans font-semibold tracking-tight text-white mb-6">Comanda ta</h2>
          
          <div className="bg-zinc-800/60 backdrop-blur-2xl border-[0.5px] border-white/20 shadow-[inset_0_1px_1px_rgba(255,255,255,0.15),0_8px_32px_rgba(0,0,0,0.3)] rounded-[28px] overflow-hidden">
            <ul className="divide-y divide-zinc-700/60">
              {cart.map(item => (
                <li key={item.id} className="p-4 sm:p-6 flex gap-4 sm:gap-5 items-center group bg-transparent transition-colors hover:bg-zinc-700/30">
                  <div className="w-16 h-16 sm:w-20 sm:h-20 shrink-0 rounded-[24px] overflow-hidden bg-zinc-800 border border-zinc-700/80 shadow-inner">
                    <img src={item.menuItem.image} alt={item.menuItem.name} className="w-full h-full object-cover" />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start mb-1">
                      <h4 className="font-sans font-semibold tracking-tight text-base sm:text-lg text-white truncate pr-4">{item.menuItem.name}</h4>
                      <span className="font-medium text-[#D4EAE6] whitespace-nowrap">{lineTotal(item)} RON</span>
                    </div>
                    
                    {item.selectedExtras.length > 0 ? (
                      <p className="text-xs text-zinc-400 truncate mb-3">
                        {item.selectedExtras.map(e => e.name).join(', ')}
                      </p>
                    ) : (
                      <div className="h-2"></div>
                    )}
                    
                    <div className="flex items-center justify-between mt-auto">
                      <div className="flex items-center gap-1 bg-zinc-800/40 backdrop-blur-xl border border-white/10 rounded-full px-1 shadow-[inset_0_2px_10px_rgba(0,0,0,0.5)]">
                        <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.8 }} transition={{ type: "spring", stiffness: 400, damping: 17 }} onClick={() => updateQuantity(item.id, -1)} className="text-zinc-300 hover:text-white transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"><Minus size={14}/></motion.button>
                        <span className="w-4 text-center font-medium text-xs text-zinc-100">{item.quantity}</span>
                        <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.8 }} transition={{ type: "spring", stiffness: 400, damping: 17 }} onClick={() => updateQuantity(item.id, 1)} className="text-zinc-300 hover:text-white transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"><Plus size={14}/></motion.button>
                      </div>
                      <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.8 }} transition={{ type: "spring", stiffness: 400, damping: 17 }} onClick={() => removeItem(item.id)} className="text-zinc-500 hover:text-red-500 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center -mr-2">
                        <Trash2 size={18} />
                      </motion.button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Checkout Form */}
        <div className="lg:col-span-5">
          <div className="bg-zinc-800/60 backdrop-blur-2xl border-[0.5px] border-white/20 shadow-[inset_0_1px_1px_rgba(255,255,255,0.15),0_8px_32px_rgba(0,0,0,0.3)] rounded-[40px] p-6 sm:p-8 lg:sticky lg:top-8 flex flex-col min-h-[500px]">
            
            {/* Progress Bar */}
            <div className="flex items-center gap-2 mb-6 sm:mb-8">
              {[1, 2, 3].map(step => (
                <div key={step} className={`flex-1 h-1.5 rounded-full transition-colors duration-500 ${step <= checkoutStep ? 'bg-[#D4EAE6]' : 'bg-zinc-700/50'}`} />
              ))}
            </div>

            <div className="flex items-center justify-between mb-6 sm:mb-8">
              <h3 className="text-2xl font-sans font-semibold tracking-tight text-white">
                {checkoutStep === 1 && 'Detalii personale'}
                {checkoutStep === 2 && (orderType === 'livrare' ? 'Adresă de livrare' : 'Detalii ridicare')}
                {checkoutStep === 3 && 'Sumar & Plată'}
              </h3>
            </div>

            <div className="flex-1 relative flex flex-col">
              <AnimatePresence mode="wait">
                {checkoutStep === 1 && (
                  <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }} className="flex flex-col h-full flex-1">
                     <div className="space-y-4">
                       <PillInput id="name" label="Nume și Prenume" type="text" placeholder="Ex: Ion Popescu" value={name} onChange={(e: any)=>setName(e.target.value)} required />
                       <PillInput id="phone" label="Număr de Telefon" type="tel" placeholder="07XX XXX XXX" value={phone} onChange={(e: any)=>setPhone(e.target.value)} required />
                     </div>
                     <div className="flex-1 min-h-[2rem]"></div>
                     
                     <div className="pt-8 sm:pt-4">
                       <button type="button" onClick={() => { if(name && phone) setCheckoutStep(2) }} className={`w-full bg-[#D4EAE6] text-zinc-900 py-4 rounded-full font-semibold transition active:scale-95 shadow-[0_4px_20px_rgba(212,234,230,0.3)] ${(name && phone) ? 'hover:bg-[#B8D6D1]' : 'opacity-50 cursor-not-allowed'}`}>
                          Continuă la {orderType === 'livrare' ? 'Adresă' : 'Detalii'}
                       </button>
                     </div>
                  </motion.div>
                )}
                
                {checkoutStep === 2 && (
                  <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }} className="flex flex-col h-full flex-1">
                     <div className="space-y-6">
                       {orderType === 'livrare' && (
                         <div className="space-y-4">
                           <PillInput id="address" label="Adresă completă" type="text" placeholder="Strada, Număr, Bloc, Etaj, Ap..." value={address} onChange={(e: any)=>setAddress(e.target.value)} required />
                           <div className="rounded-[24px] overflow-hidden border border-white/10 shadow-[0_4px_20px_rgba(0,0,0,0.2)]">
                             <LocationMap />
                           </div>
                         </div>
                       )}
                       
                       <div>
                         <label className="block text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-2 sm:mb-3">Timp dorit</label>
                         <SegmentedControl 
                           id="time-mode"
                           value={timeMode}
                           onChange={(val) => setTimeMode(val as 'asap' | 'scheduled')}
                           options={[
                             { label: 'Cât mai repede', value: 'asap' },
                             { label: 'Programează', value: 'scheduled' }
                           ]}
                         />
                         {timeMode === 'scheduled' && (
                           <div className="mt-4">
                             <PillInput id="scheduledTime" label="Ora programată" type="time" value={scheduledTime} onChange={(e: any)=>setScheduledTime(e.target.value)} required />
                           </div>
                         )}
                       </div>
                     </div>

                     <div className="flex-1 min-h-[2rem]"></div>
                     
                     <div className="flex gap-3 pt-8 sm:pt-4">
                       <button type="button" onClick={() => setCheckoutStep(1)} className="px-6 py-4 rounded-full bg-zinc-800 border border-white/10 text-white font-medium hover:bg-zinc-700 transition active:scale-95">Înapoi</button>
                       <button type="button" onClick={() => { if(orderType !== 'livrare' || address) setCheckoutStep(3) }} className={`flex-1 bg-[#D4EAE6] text-zinc-900 py-4 rounded-full font-semibold transition active:scale-95 shadow-[0_4px_20px_rgba(212,234,230,0.3)] ${(orderType !== 'livrare' || address) ? 'hover:bg-[#B8D6D1]' : 'opacity-50 cursor-not-allowed'}`}>
                         Continuă la Plată
                       </button>
                     </div>
                  </motion.div>
                )}

                {checkoutStep === 3 && (
                  <motion.div key="step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }} className="flex flex-col h-full flex-1">
                     
                     <div className="space-y-4 text-zinc-300 mb-6 pb-6 border-b border-zinc-700/60 text-sm">
                       <div className="flex justify-between">
                         <span>Subtotal</span>
                         <span className="text-zinc-100">{subtotal} RON</span>
                       </div>
                       <div className="flex justify-between">
                         <span>{orderType === 'livrare' ? 'Taxă livrare' : 'Ridicare'}</span>
                         <span className="text-zinc-100">{orderType === 'livrare' ? `${deliveryFee} RON` : 'Gratuit'}</span>
                       </div>
                     </div>
                     
                     <div className="flex justify-between items-center mb-8">
                       <span className="text-base sm:text-lg font-medium text-zinc-200">Total</span>
                       <span className="text-2xl sm:text-3xl font-sans font-semibold tracking-tight text-[#D4EAE6]">{total} RON</span>
                     </div>

                     <div className="mb-8">
                       <label className="block text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-2 sm:mb-3">Metodă de plată</label>
                       <SegmentedControl 
                         id="payment-mode"
                         value={paymentMethod}
                         onChange={(val) => setPaymentMethod(val as 'card' | 'cash')}
                         options={[
                           { label: 'Card online', value: 'card' },
                           { label: 'Numerar', value: 'cash' }
                         ]}
                       />
                     </div>

                     <div className="flex-1 min-h-[2rem]"></div>
                     
                     <div className="flex gap-3 pt-4 pb-[calc(1rem+env(safe-area-inset-bottom))] sm:pb-0">
                       <button type="button" onClick={() => setCheckoutStep(2)} className="px-6 py-4 rounded-full bg-zinc-800 border border-white/10 text-white font-medium hover:bg-zinc-700 transition active:scale-95">Înapoi</button>
                       <button onClick={handlePlaceOrder} className="flex-1 bg-[#D4EAE6] text-zinc-900 py-4 rounded-full font-semibold hover:bg-[#B8D6D1] transition active:scale-95 shadow-[0_4px_20px_rgba(212,234,230,0.3)] flex items-center justify-center gap-2">
                         <span>Confirmă comanda</span>
                       </button>
                     </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
