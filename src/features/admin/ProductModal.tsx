import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Upload, Image as ImageIcon, ChevronDown, Plus, Edit2 } from 'lucide-react';
import { MenuItem } from '../../types';
import { FadeInImage } from '../../components/ui/FadeInImage';

interface Props {
  item?: MenuItem; // If provided, edit mode. Otherwise, add mode.
  categories: string[];
  onSave: (item: MenuItem) => void;
  onClose: () => void;
}

export default function ProductModal({ item, categories, onSave, onClose }: Props) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState(0);
  const [category, setCategory] = useState('');
  const [isNewCategory, setIsNewCategory] = useState(false);
  const [image, setImage] = useState('');
  const [stock, setStock] = useState(10);
  const [available, setAvailable] = useState(true);
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (item) {
      setName(item.name);
      setDescription(item.description);
      setPrice(item.price);
      setCategory(item.category);
      setImage(item.image);
      setStock(item.stock ?? 10);
      setAvailable(item.available ?? true);
      if (!categories.includes(item.category)) {
        setIsNewCategory(true);
      }
    } else if (categories.length > 0) {
      setCategory(categories[0]);
      setAvailable(true);
    }
  }, [item, categories]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      id: item ? item.id : `ITEM-${Date.now()}`,
      name,
      description,
      price: Number(price),
      category,
      image,
      stock: Number(stock),
      available: available, // Manual toggle override
      extras: item ? item.extras : []
    });
    onClose();
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative w-full max-w-xl bg-[#18181B]/80 backdrop-blur-3xl border-[0.5px] border-white/20 shadow-[inset_0_1px_1px_rgba(255,255,255,0.15),0_24px_64px_rgba(0,0,0,0.6)] rounded-[40px] overflow-hidden flex flex-col max-h-[90svh]"
      >
        <div className="flex justify-between items-center p-6 sm:p-8 border-b border-white/10 shrink-0">
          <h2 className="text-xl sm:text-2xl font-sans font-semibold tracking-tight text-white">
            {item ? 'Editează Produs' : 'Adaugă Produs Nou'}
          </h2>
          <button onClick={onClose} className="w-10 h-10 flex items-center justify-center bg-white/5 border-[0.5px] border-white/10 hover:bg-white/10 hover:border-white/20 rounded-full text-zinc-400 hover:text-white transition active:scale-95 shrink-0">
            <X size={18} />
          </button>
        </div>

        <div className="overflow-y-auto p-6 sm:p-8 no-scrollbar">
          <form id="product-form" onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-[10px] uppercase tracking-[0.2em] font-semibold text-zinc-400 mb-3">Nume Produs</label>
              <input 
                type="text" 
                required 
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full bg-white/5 border-[0.5px] border-white/10 rounded-2xl px-5 py-4 text-white focus:outline-none focus:border-white/30 focus:bg-white/10 transition text-sm placeholder:text-zinc-600 shadow-inner"
                placeholder="Ex: Pizza Margherita"
              />
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] uppercase tracking-[0.2em] font-semibold text-zinc-400 mb-3">Categorie</label>
                {!isNewCategory ? (
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setShowCategoryDropdown(!showCategoryDropdown)}
                      className="w-full flex items-center justify-between bg-white/5 border-[0.5px] border-white/10 rounded-2xl px-5 py-4 text-white focus:outline-none hover:bg-white/10 transition text-sm shadow-inner text-left"
                    >
                      <span>{category || 'Selectează...'}</span>
                      <ChevronDown size={16} className={`text-zinc-400 transition-transform ${showCategoryDropdown ? 'rotate-180' : ''}`} />
                    </button>
                    
                    <AnimatePresence>
                      {showCategoryDropdown && (
                        <motion.div 
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          className="absolute top-full left-0 right-0 mt-2 bg-[#18181B] border-[0.5px] border-white/20 rounded-2xl overflow-hidden shadow-xl z-10"
                        >
                          <div className="max-h-48 overflow-y-auto no-scrollbar">
                            {categories.map(cat => (
                              <button
                                key={cat}
                                type="button"
                                onClick={() => { setCategory(cat); setShowCategoryDropdown(false); }}
                                className="w-full text-left px-5 py-3 text-sm text-zinc-300 hover:text-white hover:bg-white/5 transition"
                              >
                                {cat}
                              </button>
                            ))}
                          </div>
                          <div className="border-t border-white/10">
                            <button
                              type="button"
                              onClick={() => { setIsNewCategory(true); setCategory(''); setShowCategoryDropdown(false); }}
                              className="w-full text-left px-5 py-3 text-sm text-[#D4EAE6] hover:bg-white/5 transition font-medium flex items-center gap-2"
                            >
                              <Plus size={14} /> Adaugă categorie nouă
                            </button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                ) : (
                  <div className="relative">
                    <input 
                      type="text" 
                      required 
                      value={category}
                      onChange={e => setCategory(e.target.value)}
                      className="w-full bg-white/5 border-[0.5px] border-white/10 rounded-2xl px-5 py-4 text-white focus:outline-none focus:border-white/30 focus:bg-white/10 transition text-sm placeholder:text-zinc-600 shadow-inner pr-12"
                      placeholder="Nume categorie nouă"
                      autoFocus
                    />
                    {categories.length > 0 && (
                      <button 
                        type="button"
                        onClick={() => { setIsNewCategory(false); setCategory(categories[0]); }}
                        className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-zinc-400 hover:text-white transition"
                        title="Înapoi la lista de categorii"
                      >
                        <X size={16} />
                      </button>
                    )}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-[10px] uppercase tracking-[0.2em] font-semibold text-zinc-400 mb-3">Preț (RON)</label>
                <input 
                  type="number" 
                  step="0.1"
                  required 
                  value={price || ''}
                  onChange={e => setPrice(Number(e.target.value))}
                  className="w-full bg-white/5 border-[0.5px] border-white/10 rounded-2xl px-5 py-4 text-white focus:outline-none focus:border-white/30 focus:bg-white/10 transition text-sm placeholder:text-zinc-600 shadow-inner"
                  placeholder="0.00"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] uppercase tracking-[0.2em] font-semibold text-zinc-400 mb-3">Imagine Produs</label>
              
              <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                {image ? (
                  <div className="w-full sm:w-32 h-32 rounded-2xl overflow-hidden border border-white/10 relative bg-black/20 shrink-0 group">
                    <FadeInImage src={image} alt="Preview" className="w-full h-full" />
                    <div className="absolute inset-0 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.1)] rounded-2xl pointer-events-none"></div>
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <button 
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="bg-white/10 text-white p-2 rounded-full hover:bg-white/20 transition"
                      >
                        <Edit2 size={16} />
                      </button>
                    </div>
                  </div>
                ) : (
                  <button 
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full sm:w-32 h-32 rounded-2xl border border-white/10 border-dashed bg-white/5 hover:bg-white/10 transition flex flex-col items-center justify-center text-zinc-400 hover:text-white shrink-0 group"
                  >
                    <ImageIcon size={24} className="mb-2 group-hover:scale-110 transition-transform" />
                    <span className="text-xs font-medium">Încarcă Poză</span>
                  </button>
                )}

                <div className="flex-1 w-full text-xs text-zinc-500">
                  <p className="mb-2">Alege o fotografie reprezentativă pentru produs. Formate recomandate: JPG, PNG.</p>
                  <button 
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-1.5 text-[#D4EAE6] font-medium hover:text-white transition"
                  >
                    <Upload size={14} /> Schimbă fotografia
                  </button>
                  <input 
                    type="file" 
                    accept="image/*" 
                    className="hidden" 
                    ref={fileInputRef}
                    onChange={handleImageUpload}
                  />
                  {/* Keep URL input as hidden to satisfy the required constraint without breaking state entirely if we wanted a fallback, but we can just require image state to be non-empty */}
                </div>
              </div>
            </div>

            <div>
              <label className="block text-[10px] uppercase tracking-[0.2em] font-semibold text-zinc-400 mb-3">Descriere</label>
              <textarea 
                required 
                value={description}
                onChange={e => setDescription(e.target.value)}
                rows={3}
                className="w-full bg-white/5 border-[0.5px] border-white/10 rounded-2xl px-5 py-4 text-white focus:outline-none focus:border-white/30 focus:bg-white/10 transition text-sm placeholder:text-zinc-600 shadow-inner resize-none"
                placeholder="Ingrediente, detalii..."
              />
            </div>

            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between p-5 bg-white/5 rounded-2xl border border-white/10">
                <div className="pr-4">
                  <h4 className="text-sm font-semibold text-white">Stoc Disponibil</h4>
                  <p className="text-xs text-zinc-400 mt-0.5 leading-relaxed">Când stocul ajunge la 0, produsul se va ascunde automat.</p>
                </div>
                <div className="shrink-0 relative">
                  <input 
                    type="number"
                    min="0"
                    required
                    value={stock === 0 ? '0' : stock}
                    onChange={(e) => setStock(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-24 bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-center text-white font-semibold focus:outline-none focus:border-[#D4EAE6] focus:bg-black/60 transition shadow-inner"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between p-5 bg-white/5 rounded-2xl border border-white/10">
                <div className="pr-4">
                  <h4 className="text-sm font-semibold text-white">Afișare pe Site</h4>
                  <p className="text-xs text-zinc-400 mt-0.5 leading-relaxed">Dezactivează manual produsul chiar dacă este pe stoc.</p>
                </div>
                <div className="shrink-0 relative flex items-center justify-center">
                  <button
                    type="button"
                    onClick={() => setAvailable(!available)}
                    className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors focus:outline-none border-[0.5px] border-white/20 ${available ? 'bg-[#D4EAE6]' : 'bg-black/40'}`}
                  >
                    <span className={`inline-block h-5 w-5 transform rounded-full bg-zinc-900 transition-transform shadow-sm ${available ? 'translate-x-6' : 'translate-x-[3px]'}`} />
                  </button>
                </div>
              </div>
            </div>
          </form>
        </div>
        
        <div className="p-6 sm:p-8 border-t border-white/10 bg-black/20 mt-auto shrink-0">
          <button 
            type="submit" 
            form="product-form"
            disabled={!image}
            className="w-full bg-[#D4EAE6] text-zinc-900 font-semibold tracking-wide py-4 rounded-full hover:bg-[#B8D6D1] transition active:scale-[0.98] shadow-[0_4px_16px_rgba(212,234,230,0.2)] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {item ? 'Salvează Modificările' : 'Adaugă Produs'}
          </button>
          {!image && <p className="text-center text-[#ff8a8a] text-xs mt-3">Te rugăm să încarci o fotografie pentru a putea salva.</p>}
        </div>
      </motion.div>
    </div>
  );
}
