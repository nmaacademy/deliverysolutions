import { useState } from 'react';
import { ChevronLeft, Plus, Edit2, ListOrdered, LayoutGrid, LogOut } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { MenuItem, Order, OrderStatus } from '../../types';
import { allowedTransitions } from '../../lib/orderFlow';
import { formatTime } from '../../lib/format';
import { FadeInImage } from '../../components/ui/FadeInImage';
import OrderCard from '../../components/orders/OrderCard';
import ProductModal from './ProductModal';

interface Props {
  orders: Order[];
  menuItems: MenuItem[];
  onUpdateOrderStatus: (orderId: string, status: OrderStatus) => void;
  onToggleItemAvailability: (itemId: string) => void;
  onUpdateMenuItem?: (item: MenuItem) => void;
  onAddMenuItem?: (item: MenuItem) => void;
  onBack: () => void;
  /** Only passed while staff login is enabled. */
  onLogout?: () => void;
}

export default function AdminScreen({ orders, menuItems, onUpdateOrderStatus, onToggleItemAvailability, onUpdateMenuItem, onAddMenuItem, onBack, onLogout }: Props) {
  const [activeTab, setActiveTab] = useState<'orders' | 'menu'>('orders');
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [isAddingItem, setIsAddingItem] = useState(false);

  const activeOrders = [...orders].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 pb-24 min-h-[100svh]">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 pb-6 border-b border-white/10 gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-sans font-semibold tracking-tight text-white mb-1">Panou Control</h1>
          <p className="text-zinc-400 text-xs sm:text-sm">Gestionează comenzile și disponibilitatea meniului.</p>
          <p className="text-amber-300/80 text-[11px] sm:text-xs mt-1">
            Butoanele de status de mai jos sunt instrumente de administrare pentru demonstrație. În flux normal, statusul
            este schimbat de bucătărie și de curier.
          </p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <button onClick={onBack} className="flex-1 flex items-center justify-center px-5 min-h-[44px] bg-white/5 border-[0.5px] border-white/10 text-zinc-300 rounded-full hover:bg-white/10 hover:text-white transition font-medium text-[10px] tracking-wider uppercase sm:flex-none shadow-sm active:scale-95">
            <ChevronLeft size={16} className="mr-1.5" />
            Înapoi la client
          </button>
          {onLogout && (
            <button onClick={onLogout} className="flex items-center justify-center px-5 min-h-[44px] bg-white/5 border-[0.5px] border-white/10 text-zinc-400 rounded-full hover:bg-white/10 hover:text-white transition font-medium text-[10px] tracking-wider uppercase shadow-sm active:scale-95">
              <LogOut size={14} className="mr-1.5" />
              Deconectare
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex bg-black/20 p-1.5 rounded-full border-[0.5px] border-white/10 w-fit mx-auto mb-10 shadow-inner">
        <button 
          onClick={() => setActiveTab('orders')}
          className={`flex items-center gap-2 px-6 py-2.5 rounded-full text-sm font-semibold transition-all duration-300 ${activeTab === 'orders' ? 'bg-white/15 text-white shadow-[0_2px_8px_rgba(0,0,0,0.2)]' : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/5'}`}
        >
          <ListOrdered size={16} />
          Comenzi ({orders.length})
        </button>
        <button 
          onClick={() => setActiveTab('menu')}
          className={`flex items-center gap-2 px-6 py-2.5 rounded-full text-sm font-semibold transition-all duration-300 ${activeTab === 'menu' ? 'bg-white/15 text-white shadow-[0_2px_8px_rgba(0,0,0,0.2)]' : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/5'}`}
        >
          <LayoutGrid size={16} />
          Produse ({menuItems.length})
        </button>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'orders' ? (
          <motion.div 
            key="orders-tab"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {activeOrders.map((order, index) => {
              // Admin demo tool: one step forward along the order's own flow, never a jump or a rollback.
              const [nextStatus] = allowedTransitions('admin', order.type, order.status);
              const history = order.statusHistory ?? [];

              return (
                <OrderCard
                  key={order.id}
                  order={order}
                  showTotal={true}
                  delay={index}
                  actionButtons={
                    <div className="flex flex-col gap-4">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex flex-col">
                          <span className="text-[10px] uppercase tracking-wider font-semibold text-zinc-500 mb-1">Status curent</span>
                          <span className="text-sm font-semibold text-white">{order.status}</span>
                        </div>

                        {nextStatus ? (
                          <button
                            onClick={() => onUpdateOrderStatus(order.id, nextStatus)}
                            title="Instrument demo: avansează manual statusul"
                            className="bg-[#D4EAE6] text-zinc-900 px-5 py-3 rounded-full text-[10px] font-bold uppercase tracking-wider hover:bg-[#B8D6D1] transition active:scale-95 shadow-[0_4px_16px_rgba(212,234,230,0.2)] whitespace-nowrap"
                          >
                            Demo · Avansează: {nextStatus}
                          </button>
                        ) : (
                          <div className="bg-white/5 text-zinc-400 px-5 py-3 rounded-full text-[10px] font-bold uppercase tracking-wider text-center border border-white/10">
                            Finalizată
                          </div>
                        )}
                      </div>

                      {history.length > 0 && (
                        <p className="text-[11px] text-zinc-500 leading-relaxed">
                          {history.map(event => `${event.status} ${formatTime(new Date(event.at))}`).join(' · ')}
                        </p>
                      )}
                    </div>
                  }
                />
              );
            })}
            
            {activeOrders.length === 0 && (
              <div className="col-span-full text-center py-20 bg-white/5 backdrop-blur-md rounded-[40px] border-[0.5px] border-white/10 border-dashed">
                <p className="text-zinc-400 font-medium">Nu există comenzi momentan.</p>
              </div>
            )}
          </motion.div>
        ) : (
          <motion.div 
            key="menu-tab"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-sm font-sans font-semibold tracking-wide text-white">Produse Disponibile</h2>
              <button 
                onClick={() => setIsAddingItem(true)}
                className="flex items-center gap-2 bg-[#D4EAE6] text-zinc-900 px-5 py-2.5 rounded-full hover:bg-[#B8D6D1] transition active:scale-95 font-bold text-[10px] tracking-[0.15em] uppercase shadow-[0_4px_16px_rgba(212,234,230,0.2)]"
              >
                <Plus size={14} />
                Adaugă Produs
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {menuItems.map(item => (
                <div key={item.id} className={`group flex flex-col p-4 bg-white/5 backdrop-blur-md border-[0.5px] border-white/20 rounded-[32px] shadow-[inset_0_1px_1px_rgba(255,255,255,0.15),0_8px_32px_rgba(0,0,0,0.3)] transition-all ${!item.available ? 'opacity-60 grayscale' : 'hover:bg-white/10 hover:border-white/30'}`}>
                  <div className="w-full h-40 rounded-[24px] overflow-hidden mb-4 relative border border-white/10 shrink-0">
                    <FadeInImage src={item.image} alt={item.name} className="w-full h-full" />
                    {!item.available && (
                      <div className="absolute inset-0 bg-zinc-900/40 flex items-center justify-center backdrop-blur-[1px]">
                        <span className="bg-black/60 text-white px-3 py-1.5 rounded-full text-[10px] font-bold tracking-wider uppercase border border-white/10">Indisponibil</span>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex-1 px-2 flex flex-col">
                    <div className="flex justify-between items-start mb-1 gap-2">
                      <h3 className="font-sans font-semibold tracking-tight text-lg text-white line-clamp-2">{item.name}</h3>
                      <span className="font-semibold text-[#D4EAE6] shrink-0 mt-1">{item.price} RON</span>
                    </div>
                    <span className="text-[10px] uppercase tracking-wider text-zinc-400 block mb-5">{item.category}</span>
                    
                    <div className="flex items-center justify-between pt-4 border-t border-white/10 mt-auto">
                      <div className="flex flex-col">
                        <span className="text-[10px] uppercase tracking-wider font-semibold text-zinc-500 mb-0.5">Stoc curent</span>
                        <span className={`text-sm font-semibold ${item.stock > 0 ? 'text-[#D4EAE6]' : 'text-red-400'}`}>
                          {item.stock} {item.stock === 1 ? 'buc.' : 'buc.'}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-3">
                        <button 
                          onClick={() => onToggleItemAvailability(item.id)}
                          className={`relative inline-flex h-6 w-10 items-center rounded-full transition-colors focus:outline-none border-[0.5px] border-white/20 ${item.available ? 'bg-[#D4EAE6]' : 'bg-black/40'}`}
                          title="Afișare manuală pe site"
                        >
                          <span className={`inline-block h-4 w-4 transform rounded-full bg-zinc-900 transition-transform shadow-sm ${item.available ? 'translate-x-5' : 'translate-x-1'}`} />
                        </button>
                        
                        <div className="w-px h-5 bg-white/10"></div>

                        <button 
                          onClick={() => setEditingItem(item)}
                          className="w-8 h-8 flex items-center justify-center bg-white/5 border-[0.5px] border-white/10 hover:bg-white/10 rounded-full text-zinc-400 hover:text-white transition active:scale-95"
                          title="Editează produs"
                        >
                          <Edit2 size={13} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isAddingItem && (
          <ProductModal 
            categories={Array.from(new Set(menuItems.map(i => i.category)))}
            onSave={(newItem) => {
              if (onAddMenuItem) onAddMenuItem(newItem);
            }}
            onClose={() => setIsAddingItem(false)}
          />
        )}
        {editingItem && (
          <ProductModal 
            item={editingItem}
            categories={Array.from(new Set(menuItems.map(i => i.category)))}
            onSave={(updatedItem) => {
              if (onUpdateMenuItem) onUpdateMenuItem(updatedItem);
            }}
            onClose={() => setEditingItem(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
