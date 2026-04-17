import { useEffect, useState, useRef } from 'react';
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore';
import { UtensilsCrossed, Search, X, ShoppingBag } from 'lucide-react';
import { db } from '../../../lib/firebase';
import { venueCol } from '../../../lib/paths';
import { useVenue } from '../../../contexts/VenueContext';
import { useCustomer } from '../../../contexts/CustomerContext';
import { ProductDetailModal } from '../components/ProductDetailModal';
import { CartBar } from '../components/CartBar';
import { formatPrice } from '../../../lib/security';
import { cn } from '../../../lib/utils';

export default function CustomerMenuPage() {
  const { venue, venueId } = useVenue();
  const { cartCount } = useCustomer();

  const [categories, setCategories] = useState([]);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('all');
  const [search, setSearch] = useState('');
  const [selectedProduct, setSelectedProduct] = useState(null);

  const categoryRefs = useRef({});

  // Kategoriler
  useEffect(() => {
    if (!venueId) return;
    const q = query(
      collection(db, venueCol(venueId, 'categories')),
      orderBy('sortOrder', 'asc')
    );
    const unsub = onSnapshot(q, (snap) => {
      const list = [];
      snap.forEach((d) => list.push({ id: d.id, ...d.data() }));
      setCategories(list);
    });
    return () => unsub();
  }, [venueId]);

  // Ürünler
  useEffect(() => {
    if (!venueId) return;
    const q = query(
      collection(db, venueCol(venueId, 'menu_items')),
      orderBy('sortOrder', 'asc')
    );
    const unsub = onSnapshot(q, (snap) => {
      const list = [];
      snap.forEach((d) => list.push({ id: d.id, ...d.data() }));
      setItems(list);
      setLoading(false);
    });
    return () => unsub();
  }, [venueId]);

  // Filtre
  const filteredItems = items.filter((item) => {
    if (item.available === false) return false; // tükendi olanları gizle
    if (search) {
      const s = search.toLowerCase();
      return (
        item.name.toLowerCase().includes(s) ||
        (item.description || '').toLowerCase().includes(s)
      );
    }
    if (activeCategory === 'all') return true;
    return item.categoryId === activeCategory;
  });

  // Kategoriye göre grupla (arama yokken)
  const itemsByCategory = search ? null : categories.reduce((acc, cat) => {
    acc[cat.id] = items.filter(i => i.categoryId === cat.id && i.available !== false);
    return acc;
  }, {});

  const scrollToCategory = (catId) => {
    const el = categoryRefs.current[catId];
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  if (loading) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-slate-200 border-t-[rgb(var(--brand-rgb))] rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] pb-32">
      {/* Üst başlık */}
      <div
        className="sticky top-0 z-30 border-b border-slate-200"
        style={{ backgroundColor: 'rgb(var(--brand-soft-rgb) / 0.95)', backdropFilter: 'blur(10px)' }}
      >
        <div className="max-w-2xl mx-auto px-4 pt-4 pb-3">
          {/* Logo + başlık */}
          <div className="flex items-center gap-3 mb-3">
            {venue?.branding?.logo ? (
              <img src={venue.branding.logo} alt="" className="w-12 h-12 rounded-2xl object-cover shadow-sm" />
            ) : (
              <div
                className="w-12 h-12 rounded-2xl flex items-center justify-center text-white font-bold shadow-sm"
                style={{ backgroundColor: 'rgb(var(--brand-rgb))' }}
              >
                {(venue?.branding?.name || '?')[0]}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <h1 className="font-display text-xl font-bold text-slate-900 truncate">
                {venue?.branding?.name || 'Mekan'}
              </h1>
              {venue?.branding?.description && (
                <p className="text-xs text-slate-600 truncate">{venue.branding.description}</p>
              )}
            </div>
          </div>

          {/* Arama */}
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Menüde ara..."
              className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-white border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[rgb(var(--brand-rgb)/0.2)] text-sm"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center"
              >
                <X className="w-3.5 h-3.5 text-slate-600" />
              </button>
            )}
          </div>
        </div>

        {/* Kategori sekmeleri (sadece arama yokken) */}
        {!search && categories.length > 0 && (
          <div className="max-w-2xl mx-auto px-4 pb-3 overflow-x-auto">
            <div className="flex gap-2 min-w-max">
              {categories.map((cat) => {
                const count = (itemsByCategory?.[cat.id] || []).length;
                if (count === 0) return null;
                return (
                  <button
                    key={cat.id}
                    onClick={() => scrollToCategory(cat.id)}
                    className="px-4 py-1.5 rounded-full text-sm font-semibold bg-white border border-slate-200 text-slate-700 hover:border-[rgb(var(--brand-rgb))] hover:text-[rgb(var(--brand-rgb))] transition-colors whitespace-nowrap"
                  >
                    {cat.name}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Karşılama */}
      {!search && venue?.branding?.welcomeText && (
        <div className="max-w-2xl mx-auto px-4 pt-4">
          <div
            className="rounded-2xl p-4 text-sm text-slate-700"
            style={{ backgroundColor: 'rgb(var(--brand-rgb) / 0.08)' }}
          >
            {venue.branding.welcomeText}
          </div>
        </div>
      )}

      {/* İçerik */}
      <div className="max-w-2xl mx-auto px-4 py-4">
        {search ? (
          // Arama sonuçları
          <div>
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-3">
              {filteredItems.length} sonuç
            </h3>
            <div className="space-y-2">
              {filteredItems.map((item) => (
                <ProductRow key={item.id} item={item} onClick={() => setSelectedProduct(item)} />
              ))}
            </div>
            {filteredItems.length === 0 && (
              <div className="py-12 text-center text-sm text-slate-500">
                "{search}" ile eşleşen ürün yok
              </div>
            )}
          </div>
        ) : (
          // Kategoriye göre grupla
          categories.length === 0 ? (
            <EmptyMenu />
          ) : (
            <div className="space-y-6">
              {categories.map((cat) => {
                const catItems = itemsByCategory?.[cat.id] || [];
                if (catItems.length === 0) return null;
                return (
                  <div
                    key={cat.id}
                    ref={(el) => (categoryRefs.current[cat.id] = el)}
                    style={{ scrollMarginTop: '180px' }}
                  >
                    <h2 className="font-display text-xl font-bold text-slate-900 mb-3">
                      {cat.name}
                    </h2>
                    <div className="space-y-2">
                      {catItems.map((item) => (
                        <ProductRow
                          key={item.id}
                          item={item}
                          onClick={() => setSelectedProduct(item)}
                        />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )
        )}
      </div>

      {/* Ürün detay modal */}
      <ProductDetailModal
        product={selectedProduct}
        onClose={() => setSelectedProduct(null)}
      />

      {/* Sepet çubuğu */}
      {cartCount > 0 && <CartBar />}
    </div>
  );
}

// ═══════════════════════════════════════════════════
// Ürün Satırı
// ═══════════════════════════════════════════════════
function ProductRow({ item, onClick }) {
  return (
    <button
      onClick={onClick}
      className="w-full bg-white rounded-2xl border border-slate-200 hover:border-slate-300 transition-all text-left flex gap-3 p-3 hover:shadow-md active:scale-[0.99]"
    >
      {/* Resim */}
      <div className="w-24 h-24 rounded-xl bg-slate-100 overflow-hidden flex-shrink-0">
        {item.image ? (
          <img src={item.image} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-slate-300">
            <UtensilsCrossed className="w-6 h-6" />
          </div>
        )}
      </div>

      {/* Bilgi */}
      <div className="flex-1 min-w-0 flex flex-col">
        <h4 className="font-semibold text-slate-900 leading-snug">{item.name}</h4>
        {item.description && (
          <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{item.description}</p>
        )}
        <div className="mt-auto flex items-center justify-between">
          <div
            className="font-display font-bold text-lg"
            style={{ color: 'rgb(var(--brand-rgb))' }}
          >
            {formatPrice(item.price)}
          </div>
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-lg"
            style={{ backgroundColor: 'rgb(var(--brand-rgb))' }}
          >
            +
          </div>
        </div>
      </div>
    </button>
  );
}

function EmptyMenu() {
  return (
    <div className="py-16 text-center">
      <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-slate-100 mb-4">
        <UtensilsCrossed className="w-7 h-7 text-slate-400" />
      </div>
      <h3 className="font-display text-lg font-bold text-slate-900 mb-1">Menü henüz hazır değil</h3>
      <p className="text-sm text-slate-500 max-w-xs mx-auto">
        İşletme menüsünü hazırlıyor. Birazdan tekrar bak.
      </p>
    </div>
  );
}
