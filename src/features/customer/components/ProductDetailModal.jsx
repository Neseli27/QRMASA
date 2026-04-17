import { useEffect, useState } from 'react';
import { X, Plus, Minus, UtensilsCrossed, MessageSquare } from 'lucide-react';
import toast from 'react-hot-toast';
import { useCustomer } from '../../../contexts/CustomerContext';
import { useVenue } from '../../../contexts/VenueContext';
import { formatPrice } from '../../../lib/security';

/**
 * Müşteri ürün detayı — büyük resim, açıklama, miktar seçimi, opsiyonel not
 */
export function ProductDetailModal({ product, onClose }) {
  const { addToCart } = useCustomer();
  const { getFeature } = useVenue();
  const [qty, setQty] = useState(1);
  const [note, setNote] = useState('');

  const productNotesEnabled = getFeature('productNotes', false);

  // Modal açıldığında reset
  useEffect(() => {
    if (product) {
      setQty(1);
      setNote('');
    }
  }, [product]);

  // Body scroll lock
  useEffect(() => {
    if (!product) return;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, [product]);

  if (!product) return null;

  const handleAdd = () => {
    addToCart(product, qty, note);
    toast.success(`${qty} × ${product.name} sepete eklendi`, {
      style: {
        background: 'rgb(var(--brand-rgb))',
        color: 'white',
        fontWeight: 600
      },
      iconTheme: { primary: 'white', secondary: 'rgb(var(--brand-rgb))' }
    });
    onClose();
  };

  const subtotal = product.price * qty;

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 animate-fade-in"
        onClick={onClose}
      />

      {/* Sheet */}
      <div className="relative w-full md:max-w-lg bg-white md:rounded-3xl rounded-t-3xl max-h-[90vh] flex flex-col overflow-hidden animate-slide-up">
        {/* Resim */}
        <div className="relative aspect-video bg-slate-100 flex-shrink-0">
          {product.image ? (
            <img src={product.image} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-slate-300">
              <UtensilsCrossed className="w-16 h-16" />
            </div>
          )}
          <button
            onClick={onClose}
            className="absolute top-3 right-3 w-10 h-10 rounded-full bg-white/90 backdrop-blur flex items-center justify-center shadow-lg"
          >
            <X className="w-5 h-5 text-slate-700" />
          </button>
        </div>

        {/* İçerik */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          <div>
            <h2 className="font-display text-2xl font-bold text-slate-900">{product.name}</h2>
            {product.description && (
              <p className="text-sm text-slate-600 mt-2 leading-relaxed">{product.description}</p>
            )}
            <div
              className="mt-3 font-display font-bold text-2xl"
              style={{ color: 'rgb(var(--brand-rgb))' }}
            >
              {formatPrice(product.price)}
            </div>
          </div>

          {/* Not alanı */}
          {productNotesEnabled && (
            <div>
              <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-2">
                <MessageSquare className="w-4 h-4" />
                Özel Not
              </label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Örn: az tuzlu, soğansız..."
                rows={2}
                maxLength={200}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm resize-none focus:outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
              />
              <div className="text-xs text-slate-400 text-right mt-1">{note.length}/200</div>
            </div>
          )}
        </div>

        {/* Alt aksiyon bar */}
        <div className="border-t border-slate-100 p-4 flex items-center gap-3 flex-shrink-0">
          {/* Miktar */}
          <div className="flex items-center gap-0 bg-slate-100 rounded-full p-1">
            <button
              onClick={() => setQty(Math.max(1, qty - 1))}
              disabled={qty <= 1}
              className="w-9 h-9 rounded-full flex items-center justify-center text-slate-700 hover:bg-white disabled:opacity-40 transition-colors"
            >
              <Minus className="w-4 h-4" />
            </button>
            <div className="w-8 text-center font-bold text-slate-900">{qty}</div>
            <button
              onClick={() => setQty(qty + 1)}
              className="w-9 h-9 rounded-full flex items-center justify-center text-slate-700 hover:bg-white transition-colors"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          {/* Ekle */}
          <button
            onClick={handleAdd}
            className="flex-1 h-12 rounded-full text-white font-bold text-sm shadow-lg flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
            style={{ backgroundColor: 'rgb(var(--brand-rgb))' }}
          >
            Sepete Ekle · {formatPrice(subtotal)}
          </button>
        </div>
      </div>
    </div>
  );
}
