import { useState, useEffect, useMemo, useRef } from 'react';
import { ChevronLeft, Plus, Minus, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { CartItem, MenuItem, OrderType, Order } from '../../types';
import { triggerVibration } from '../../lib/haptics';
import { DELIVERY_FEE, cartSubtotal, lineTotal } from '../../lib/pricing';
import { SegmentedControl } from '../../components/ui/SegmentedControl';
import { AutoHeight } from '../../components/ui/AutoHeight';
import { LocationMap } from '../../components/map/LocationMap';
import UpsellTile from '../menu/UpsellTile';
import { FadeInImage } from '../../components/ui/FadeInImage';
import { EASE_IN_OUT, EASE_OUT, ENTER, EXIT, SPRING_SNAPPY, SWAP, revealOnMount, revealOnView, riseItem, slideItem, staggerGroup } from '../../lib/motion';

/** A number that rolls up or down to its new value instead of jumping. */
function RollingNumber({ value, suffix = '', className = '' }: { value: number; suffix?: string; className?: string }) {
  const previous = useRef(value);
  const direction = value >= previous.current ? 1 : -1;
  useEffect(() => {
    previous.current = value;
  }, [value]);

  return (
    <span className={`relative inline-flex overflow-hidden h-[1.3em] ${className}`}>
      <AnimatePresence mode="popLayout" initial={false} custom={direction}>
        <motion.span
          key={value}
          custom={direction}
          variants={{
            enter: (d: number) => ({ y: `${d * 100}%`, opacity: 0 }),
            center: { y: '0%', opacity: 1 },
            exit: (d: number) => ({ y: `${d * -100}%`, opacity: 0 }),
          }}
          initial="enter"
          animate="center"
          exit="exit"
          transition={SWAP}
          className="block leading-[1.3em] whitespace-nowrap"
        >
          {value}
          {suffix}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}

/** Slim quantity stepper for the cart rows: smaller than the photo it sits next to, with a 44px hit area. */
function CartStepper({ quantity, onChange }: { quantity: number; onChange: (delta: number) => void }) {
  const button =
    'relative w-8 h-8 grid place-items-center rounded-full text-zinc-300 hover:text-white hover:bg-white/10 transition-colors disabled:opacity-30 after:absolute after:-inset-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D4EAE6]';
  return (
    <div role="group" aria-label="Cantitate" className="flex items-center gap-0.5 h-9 px-0.5 rounded-full bg-white/[0.06] border-[0.5px] border-white/10">
      <motion.button type="button" whileTap={{ scale: 0.9 }} transition={SPRING_SNAPPY} disabled={quantity <= 1} onClick={() => onChange(-1)} aria-label="Scade cantitatea" className={button}>
        <Minus size={14} />
      </motion.button>
      <RollingNumber value={quantity} className="w-5 justify-center text-[13px] font-semibold text-zinc-100 tabular-nums" />
      <motion.button type="button" whileTap={{ scale: 0.9 }} transition={SPRING_SNAPPY} onClick={() => onChange(1)} aria-label="Crește cantitatea" className={button}>
        <Plus size={14} />
      </motion.button>
    </div>
  );
}

/** Checkout steps slide a short way sideways while cross-fading, on one curve so both land together. */
const STEP_MOTION = {
  initial: { opacity: 0, transform: 'translateX(16px)' },
  animate: { opacity: 1, transform: 'translateX(0px)', transitionEnd: { transform: 'none' } },
  exit: { opacity: 0, transform: 'translateX(-16px)', transition: EXIT },
  transition: { duration: 0.24, ease: EASE_OUT },
} as const;

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
  /** The live menu, for the "Ți-ar plăcea și astea" suggestions. */
  menuItems: MenuItem[];
  /** Adds one of a suggested dish straight to the cart. */
  onAddSuggestion: (item: MenuItem) => void;
}

export default function CartScreen({ cart, setCart, orderType, onBack, onPlaceOrder, menuItems, onAddSuggestion }: Props) {
  // The cart opens at its top. The app underneath stays pinned where it was while the sheet covers it,
  // and gets its own scroll back when the cart closes.
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
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

  // "Ți-ar plăcea și astea": desserts and drinks first, and never something already in the cart.
  const suggestions = useMemo(() => {
    const inCart = new Set(cart.map(item => item.menuItem.id));
    const sidesFirst = (item: MenuItem) => (/^(desert|b[aă]uturi)/i.test(item.category) ? 0 : 1);
    return menuItems
      .filter(item => item.available && item.stock > 0 && !inCart.has(item.id))
      .sort((a, b) => sidesFirst(a) - sidesFirst(b))
      .slice(0, 8);
  }, [cart, menuItems]);

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
      <div className="max-w-2xl mx-auto px-4 pt-4 pb-28 min-h-[calc(100svh-env(safe-area-inset-top)-8px)] flex flex-col">
        <button onClick={onBack} className="flex items-center justify-center min-h-[44px] min-w-[44px] text-zinc-400 hover:text-white transition self-start mb-12">
          <ChevronLeft size={20} className="mr-1" />
          Înapoi la meniu
        </button>
        <div className="flex-1 flex flex-col items-center justify-center text-center">
          <h2 className="text-3xl font-sans font-semibold tracking-tight text-white mb-4">Coșul este gol</h2>
          <p className="text-zinc-400 mb-8">Nu ai adăugat niciun produs în coș încă.</p>
          <button onClick={onBack} className="bg-zinc-800 text-white px-8 min-h-[44px] rounded-full font-medium hover:bg-zinc-700 transition">
            Explorează meniul
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto py-4 sm:py-8 pb-40 sm:pb-32 min-h-[calc(100svh-env(safe-area-inset-top)-8px)]">
      
      {/* iOS Style Sticky Top Bar */}
      <div className="sticky top-0 z-40 bg-zinc-900/80 backdrop-blur-2xl border-b border-white/[0.06] px-4 sm:px-6 pt-4 pb-4 flex items-center justify-between mb-6 sm:mb-8">
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
          
          {/* Same radius as the checkout card beside it. Rows arrive one by one once the sheet is up, and
              slide away and collapse when removed. */}
          <div className="bg-zinc-800/60 glass-edge rounded-sheet overflow-hidden">
            <motion.ul variants={staggerGroup(0.045, 0.1)} {...revealOnMount} className="divide-y divide-zinc-700/60">
              <AnimatePresence>
                {cart.map(item => (
                  <motion.li
                    key={item.id}
                    variants={riseItem}
                    exit={{ opacity: 0, transform: 'translateX(-32px)', height: 0, transition: { duration: 0.26, ease: EASE_OUT, opacity: { duration: 0.16, ease: EASE_OUT } } }}
                    className="overflow-hidden"
                  >
                    <div className="p-4 sm:p-5 flex gap-4 items-stretch">
                      <FadeInImage src={item.menuItem.image} alt={item.menuItem.name} className="w-24 h-24 sm:w-28 sm:h-28 shrink-0 rounded-tile bg-zinc-800" />

                      <div className="flex-1 min-w-0 flex flex-col">
                        <div className="flex items-start gap-2">
                          <h4 className="flex-1 min-w-0 font-sans font-semibold tracking-tight text-[16px] sm:text-lg leading-snug text-white line-clamp-2">{item.menuItem.name}</h4>
                          <motion.button
                            type="button"
                            whileTap={{ scale: 0.9, rotate: -8 }}
                            transition={SPRING_SNAPPY}
                            onClick={() => removeItem(item.id)}
                            aria-label={`Elimină ${item.menuItem.name}`}
                            className="relative -mt-1 -mr-1 w-8 h-8 shrink-0 grid place-items-center rounded-full text-zinc-500 hover:text-red-400 hover:bg-red-500/10 transition-colors after:absolute after:-inset-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D4EAE6]"
                          >
                            <Trash2 size={16} />
                          </motion.button>
                        </div>

                        {item.selectedExtras.length > 0 && (
                          <p className="text-xs text-zinc-400 truncate mt-0.5">{item.selectedExtras.map(e => e.name).join(', ')}</p>
                        )}

                        <div className="mt-auto pt-2 flex items-center justify-between gap-3">
                          <CartStepper quantity={item.quantity} onChange={delta => updateQuantity(item.id, delta)} />
                          <RollingNumber value={lineTotal(item)} suffix=" RON" className="text-[15px] font-semibold text-[#D4EAE6] tabular-nums" />
                        </div>
                      </div>
                    </div>
                  </motion.li>
                ))}
              </AnimatePresence>
            </motion.ul>
          </div>

          {suggestions.length > 0 && (
            <section aria-labelledby="cart-upsell" className="mt-8">
              <h3 id="cart-upsell" className="text-[17px] font-semibold tracking-tight text-white">
                Ți-ar plăcea și astea
              </h3>
              <p className="mt-0.5 text-[12px] text-zinc-500">Se adaugă direct în coș</p>

              <motion.div variants={staggerGroup(0.045, 0.04)} {...revealOnView} className="mt-3 -mx-4 sm:-mx-6 lg:mx-0 px-4 sm:px-6 lg:px-0 py-1 flex gap-3 overflow-x-auto no-scrollbar snap-x snap-mandatory scroll-px-4 sm:scroll-px-6 lg:scroll-px-0 lg:[mask-image:linear-gradient(to_right,black_82%,transparent)]">
                {suggestions.map(item => (
                  <motion.div key={item.id} variants={slideItem} className="shrink-0 snap-start">
                  <UpsellTile
                    image={item.image}
                    name={item.name}
                    priceLabel={`${item.price} RON`}
                    label={`Adaugă ${item.name} în coș, ${item.price} RON`}
                    onPress={() => {
                      triggerVibration([10, 30, 10]);
                      onAddSuggestion(item);
                    }}
                  />
                  </motion.div>
                ))}
              </motion.div>
            </section>
          )}
        </div>

        {/* Checkout Form */}
        <div className="lg:col-span-5">
          <motion.div
            initial={{ opacity: 0, transform: 'translateY(20px)' }}
            animate={{ opacity: 1, transform: 'translateY(0px)', transitionEnd: { transform: 'none' } }}
            transition={{ ...ENTER, delay: 0.1 }}
            className="bg-zinc-800/60 glass-edge rounded-sheet p-6 sm:p-8 lg:sticky lg:top-24"
          >
            
            {/* Progress Bar */}
            <div className="flex items-center gap-2 mb-6 sm:mb-8">
              {[1, 2, 3].map(step => (
                <div key={step} className="flex-1 h-1.5 rounded-full bg-zinc-700/50 overflow-hidden">
                  <motion.div
                    className="h-full rounded-full bg-[#D4EAE6] origin-left"
                    initial={false}
                    animate={{ scaleX: step <= checkoutStep ? 1 : 0 }}
                    transition={{ duration: 0.36, ease: EASE_IN_OUT }}
                  />
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between mb-6 sm:mb-8">
              <AnimatePresence mode="wait" initial={false}>
                <motion.h3
                  key={checkoutStep}
                  initial={{ opacity: 0, y: 10, filter: 'blur(4px)' }}
                  animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                  exit={{ opacity: 0, y: -10, filter: 'blur(4px)' }}
                  transition={SWAP}
                  className="text-2xl font-sans font-semibold tracking-tight text-white"
                >
                  {checkoutStep === 1 && 'Detalii personale'}
                  {checkoutStep === 2 && (orderType === 'livrare' ? 'Adresă de livrare' : 'Detalii ridicare')}
                  {checkoutStep === 3 && 'Sumar & Plată'}
                </motion.h3>
              </AnimatePresence>
            </div>

            {/* The card follows the height of the step on screen, and animates when a field or the map appears. */}
            <AutoHeight>
              <AnimatePresence mode="wait">
                {checkoutStep === 1 && (
                  <motion.div key="step1" {...STEP_MOTION} className="flex flex-col">
                     <div className="space-y-4">
                       <PillInput id="name" label="Nume și Prenume" type="text" placeholder="Ex: Ion Popescu" value={name} onChange={(e: any)=>setName(e.target.value)} required />
                       <PillInput id="phone" label="Număr de Telefon" type="tel" placeholder="07XX XXX XXX" value={phone} onChange={(e: any)=>setPhone(e.target.value)} required />
                     </div>                     
                     <div className="pt-6">
                       <button type="button" onClick={() => { if(name && phone) setCheckoutStep(2) }} className={`w-full bg-[#D4EAE6] text-zinc-900 py-4 rounded-full font-semibold transition active:scale-95 glow-opal ${(name && phone) ? 'hover:bg-[#B8D6D1]' : 'opacity-50 cursor-not-allowed'}`}>
                          Continuă la {orderType === 'livrare' ? 'Adresă' : 'Detalii'}
                       </button>
                     </div>
                  </motion.div>
                )}
                
                {checkoutStep === 2 && (
                  <motion.div key="step2" {...STEP_MOTION} className="flex flex-col">
                     <div className="space-y-6">
                       {orderType === 'livrare' && (
                         <div className="space-y-4">
                           <PillInput id="address" label="Adresă completă" type="text" placeholder="Strada, Număr, Bloc, Etaj, Ap..." value={address} onChange={(e: any)=>setAddress(e.target.value)} required />
                           <div className="rounded-card overflow-hidden glass-edge">
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
                     
                     <div className="flex gap-3 pt-6">
                       <button type="button" onClick={() => setCheckoutStep(1)} className="px-6 py-4 rounded-full bg-zinc-800 border border-white/10 text-white font-medium hover:bg-zinc-700 transition active:scale-95">Înapoi</button>
                       <button type="button" onClick={() => { if(orderType !== 'livrare' || address) setCheckoutStep(3) }} className={`flex-1 bg-[#D4EAE6] text-zinc-900 py-4 rounded-full font-semibold transition active:scale-95 glow-opal ${(orderType !== 'livrare' || address) ? 'hover:bg-[#B8D6D1]' : 'opacity-50 cursor-not-allowed'}`}>
                         Continuă la Plată
                       </button>
                     </div>
                  </motion.div>
                )}

                {checkoutStep === 3 && (
                  <motion.div key="step3" {...STEP_MOTION} className="flex flex-col">
                     
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
                     
                     <div className="flex gap-3 pt-2 pb-[calc(1rem+env(safe-area-inset-bottom))] sm:pb-0">
                       <button type="button" onClick={() => setCheckoutStep(2)} className="px-6 py-4 rounded-full bg-zinc-800 border border-white/10 text-white font-medium hover:bg-zinc-700 transition active:scale-95">Înapoi</button>
                       <button onClick={handlePlaceOrder} className="flex-1 bg-[#D4EAE6] text-zinc-900 py-4 rounded-full font-semibold hover:bg-[#B8D6D1] transition active:scale-95 glow-opal flex items-center justify-center gap-2">
                         <span>Confirmă comanda</span>
                       </button>
                     </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </AutoHeight>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
