import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Minus, Trash2, ShoppingBag, MessageSquare } from 'lucide-react';
import toast from 'react-hot-toast';
import { useCustomer } from '../../../contexts/CustomerContext';
import { useVenue } from '../../../contexts/VenueContext';
import { formatPrice } from '../../../lib/security';
import { cn } from '../../../lib/utils';

export default function CartPage() {
  const navigate = useNavigate();
  const { cart, cartTotal, updateQty, removeFromCart, updateNote, clearCart } = useCustomer();
  const { venue, getFeature } = useVenue();

  const [customerNote, setCustomerNote] = useState('');
  const [editingNoteIdx, setEditingNoteIdx] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const minOrder = venue?.minOrderAmount || 0;
  const canSubmit = cartTotal >= minOrder && cart.length > 0;
  const missing = minOrder - cartTotal;

  const handleSubmit = async () => {
    if (cart.length === 0) return;
    if (cartTotal < minOrder) {
      toast.error(`Minimum sipariş ${formatPrice(minOrder)}`);
      return;
    }

    setSubmitting(true);
    // TODO: Faz 3.2'de sipariş gönderme kodu eklenecek
    toast.success('Sipariş verme Faz 3.2\'de eklenecek');
    setTimeout(() => setSubmitting(false), 1000);
  };

  if (cart.length === 0) {
    return (
      <div className="min-h-[100dvh] flex flex-col">
        <Header onBack={() => navigate(-1)} />
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-slate-100 mb-4">
              <ShoppingBag className="w-7 h-7 text-slate-400" />
            </div>
            <h2 className="font-display text-xl font-bold text-slate-900 mb-1">Sepetin boş</h2>
            <p className="text-sm text-slate-500 mb-5">Menüden ürün ekle, sipariş ver.</p>
            <button
              onClick={() => navigate(-1)}
              className="px-6 py-2.5 rounded-full text-white font-semibold"
              style={{ backgroundColor: 'rgb(var(--brand-rgb))' }}
            >
              Menüye Dön
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] pb-40">
      <Header onBack={() => navigate(-1)} />

      <div className="max-w-2xl mx-auto px-4 py-4 space-y-4">
        {/* Sepet ürünleri */}
        <div className="space-y-2">
          {cart.map((item, idx) => (
            <CartItem
              key={`${item.itemId}-${idx}`}
              item={item}
              onUpdateQty={(q) => updateQty(idx, q)}
              onRemove={() => {
                removeFromCart(idx);
                toast.success('Sepetten çıkarıldı');
              }}
              onEditNote={() => setEditingNoteIdx(idx)}
              isEditingNote={editingNoteIdx === idx}
              onSaveNote={(note) => {
                updateNote(idx, note);
                setEditingNoteIdx(null);
              }}
              onCancelNote={() => setEditingNoteIdx(null)}
              noteEnabled={getFeature('productNotes', false)}
            />
          ))}
        </div>

        {/* Sepeti temizle */}
        <button
          onClick={() => {
            if (confirm('Sepeti boşaltmak istediğine emin misin?')) {
              clearCart();
              toast.success('Sepet boşaltıldı');
            }
          }}
          className="w-full py-2 text-xs text-red-600 hover:bg-red-50 rounded-xl transition-colors"
        >
          Sepeti Boşalt
        </button>

        {/* Sipariş notu */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4">
          <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-2">
            <MessageSquare className="w-4 h-4" />
            Genel Sipariş Notu (opsiyonel)
          </label>
          <textarea
            value={customerNote}
            onChange={(e) => setCustomerNote(e.target.value)}
            placeholder="Siparişiniz hakkında eklemek istediğiniz..."
            rows={2}
            maxLength={300}
            className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm resize-none focus:outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
          />
        </div>

        {/* Özet */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4">
          <div className="flex items-center justify-between mb-2 text-sm">
            <span className="text-slate-600">Ara Toplam</span>
            <span className="font-semibold text-slate-900">{formatPrice(cartTotal)}</span>
          </div>
          {minOrder > 0 && cartTotal < minOrder && (
            <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-2 mt-2">
              Minimum sipariş tutarı <strong>{formatPrice(minOrder)}</strong>.
              {' '}Sepete <strong>{formatPrice(missing)}</strong> daha eklenmeli.
            </div>
          )}
          <div className="flex items-center justify-between pt-3 border-t border-slate-100 mt-3">
            <span className="font-bold text-slate-900">Toplam</span>
            <span
              className="font-display font-bold text-xl"
              style={{ color: 'rgb(var(--brand-rgb))' }}
            >
              {formatPrice(cartTotal)}
            </span>
          </div>
        </div>
      </div>

      {/* Sipariş ver */}
      <div className="fixed bottom-0 left-0 right-0 pb-safe border-t border-slate-200 bg-white/95 backdrop-blur">
        <div className="max-w-2xl mx-auto p-3">
          <button
            onClick={handleSubmit}
            disabled={!canSubmit || submitting}
            className={cn(
              'w-full h-14 rounded-2xl text-white font-bold text-base shadow-xl flex items-center justify-center gap-2 active:scale-[0.98] transition-transform',
              !canSubmit && 'opacity-50 cursor-not-allowed'
            )}
            style={{
              backgroundColor: 'rgb(var(--brand-rgb))',
              boxShadow: canSubmit ? '0 10px 25px -5px rgb(var(--brand-rgb) / 0.5)' : 'none'
            }}
          >
            {submitting ? 'Gönderiliyor...' : `Siparişi Tamamla · ${formatPrice(cartTotal)}`}
          </button>
        </div>
      </div>
    </div>
  );
}

function Header({ onBack }) {
  return (
    <div className="sticky top-0 z-30 bg-white/95 backdrop-blur border-b border-slate-200">
      <div className="max-w-2xl mx-auto px-3 py-3 flex items-center gap-3">
        <button
          onClick={onBack}
          className="w-10 h-10 rounded-xl flex items-center justify-center hover:bg-slate-100"
        >
          <ArrowLeft className="w-5 h-5 text-slate-700" />
        </button>
        <h1 className="font-display text-xl font-bold text-slate-900">Sepet</h1>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════
// Sepet Kartı
// ═══════════════════════════════════════════════════
function CartItem({ item, onUpdateQty, onRemove, onEditNote, isEditingNote, onSaveNote, onCancelNote, noteEnabled }) {
  const [noteInput, setNoteInput] = useState(item.note || '');

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-3 flex gap-3">
      {/* Resim */}
      <div className="w-16 h-16 rounded-xl bg-slate-100 overflow-hidden flex-shrink-0">
        {item.image ? (
          <img src={item.image} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-slate-300">
            <ShoppingBag className="w-5 h-5" />
          </div>
        )}
      </div>

      {/* Bilgi */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h4 className="font-semibold text-sm text-slate-900">{item.name}</h4>
            <div className="text-xs text-slate-500 mt-0.5">
              {formatPrice(item.price)} × {item.qty} = <strong className="text-slate-700">{formatPrice(item.price * item.qty)}</strong>
            </div>
            {item.note && !isEditingNote && (
              <div className="text-xs text-amber-700 mt-1 italic">Not: {item.note}</div>
            )}
          </div>
          <button
            onClick={onRemove}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-red-600 hover:bg-red-50"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Not düzenleme */}
        {noteEnabled && isEditingNote && (
          <div className="mt-2">
            <input
              type="text"
              value={noteInput}
              onChange={(e) => setNoteInput(e.target.value)}
              placeholder="Özel not..."
              maxLength={200}
              className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs focus:outline-none focus:border-slate-400"
              autoFocus
            />
            <div className="flex items-center gap-2 mt-1.5">
              <button
                onClick={() => onSaveNote(noteInput)}
                className="px-3 py-1 rounded-lg text-xs font-semibold text-white"
                style={{ backgroundColor: 'rgb(var(--brand-rgb))' }}
              >
                Kaydet
              </button>
              <button
                onClick={onCancelNote}
                className="px-3 py-1 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                İptal
              </button>
            </div>
          </div>
        )}

        {/* Alt aksiyon bar */}
        {!isEditingNote && (
          <div className="flex items-center justify-between mt-2">
            {noteEnabled && (
              <button
                onClick={onEditNote}
                className="text-xs font-semibold text-slate-500 hover:text-slate-700 flex items-center gap-1"
              >
                <MessageSquare className="w-3 h-3" />
                {item.note ? 'Notu Düzenle' : 'Not Ekle'}
              </button>
            )}
            <div className="flex items-center gap-1 bg-slate-100 rounded-full p-0.5 ml-auto">
              <button
                onClick={() => onUpdateQty(item.qty - 1)}
                className="w-7 h-7 rounded-full flex items-center justify-center text-slate-700 hover:bg-white transition-colors"
              >
                <Minus className="w-3 h-3" />
              </button>
              <span className="w-7 text-center font-bold text-sm text-slate-900">{item.qty}</span>
              <button
                onClick={() => onUpdateQty(item.qty + 1)}
                className="w-7 h-7 rounded-full flex items-center justify-center text-slate-700 hover:bg-white transition-colors"
              >
                <Plus className="w-3 h-3" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
