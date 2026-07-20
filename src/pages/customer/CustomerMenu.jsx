import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { ensureAnonymousCustomer } from '../../firebase/auth';
import { getCustomerMenu } from '../../firebase/menu';
import { ensureTableSession } from '../../utils/session';

function formatBusinessName(slug, business) {
  return business?.ad || business?.name || slug.replaceAll('-', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export default function CustomerMenu() {
  const { slug, table } = useParams();
  const [state, setState] = useState({ loading: true, error: '', data: null });
  const [activeCategory, setActiveCategory] = useState('all');

  useEffect(() => {
    let cancelled = false;
    ensureTableSession(slug, table);

    async function loadMenu() {
      try {
        await ensureAnonymousCustomer();
        const data = await getCustomerMenu(slug, table);
        if (!cancelled) setState({ loading: false, error: '', data });
      } catch (error) {
        if (!cancelled) {
          setState({
            loading: false,
            error: error?.message || 'Menü yüklenirken beklenmeyen bir hata oluştu.',
            data: null,
          });
        }
      }
    }

    loadMenu();
    return () => {
      cancelled = true;
    };
  }, [slug, table]);

  const visibleProducts = useMemo(() => {
    const products = state.data?.products || [];
    return activeCategory === 'all'
      ? products
      : products.filter((product) => product.categoryId === activeCategory);
  }, [activeCategory, state.data]);

  const businessName = formatBusinessName(slug, state.data?.business);

  if (state.loading) {
    return (
      <div className="min-h-screen bg-neutral-950 text-white flex items-center justify-center p-6">
        <div className="text-center">
          <div className="h-12 w-12 mx-auto mb-4 rounded-full border-4 border-emerald-500 border-t-transparent animate-spin" />
          <h1 className="text-xl font-bold">Menü hazırlanıyor</h1>
          <p className="text-sm text-neutral-400 mt-2">Masa {table} için güvenli bağlantı kuruluyor.</p>
        </div>
      </div>
    );
  }

  if (state.error) {
    return (
      <div className="min-h-screen bg-neutral-950 text-white flex items-center justify-center p-6">
        <div className="max-w-md w-full rounded-3xl bg-neutral-900 border border-red-500/30 p-6 text-center">
          <div className="text-4xl mb-3">⚠️</div>
          <h1 className="text-xl font-bold">Menü açılamadı</h1>
          <p className="text-sm text-neutral-300 mt-3">{state.error}</p>
          <button onClick={() => window.location.reload()} className="mt-5 rounded-xl bg-emerald-600 px-5 py-3 font-semibold">
            Yeniden dene
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-white pb-24">
      <header className="sticky top-0 z-20 border-b border-white/10 bg-neutral-900/95 backdrop-blur px-4 py-3">
        <div className="max-w-3xl mx-auto flex items-center justify-between gap-3">
          <div>
            <h1 className="text-lg font-bold">{businessName}</h1>
            <p className="text-xs text-emerald-400">Masa {state.data?.table?.ad || state.data?.table?.name || table}</p>
          </div>
          <button className="rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold">Sepet 0</button>
        </div>
      </header>

      <main className="max-w-3xl mx-auto p-4">
        <section className="rounded-3xl bg-gradient-to-br from-orange-500 to-emerald-700 p-6 mb-5">
          <p className="text-sm font-semibold text-white/80">Hoş geldiniz</p>
          <h2 className="text-3xl font-black mt-1">Lezzetlerimizi keşfedin</h2>
          <p className="text-sm text-white/80 mt-2">Ürününüzü seçin, sepete ekleyin ve siparişinizi masanızdan gönderin.</p>
        </section>

        <div className="flex gap-2 overflow-x-auto pb-3 mb-3">
          <button onClick={() => setActiveCategory('all')} className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold ${activeCategory === 'all' ? 'bg-emerald-600' : 'bg-neutral-800'}`}>
            Tümü
          </button>
          {state.data.categories.map((category) => (
            <button key={category.id} onClick={() => setActiveCategory(category.id)} className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold ${activeCategory === category.id ? 'bg-emerald-600' : 'bg-neutral-800'}`}>
              {category.name}
            </button>
          ))}
        </div>

        {visibleProducts.length === 0 ? (
          <div className="rounded-3xl bg-neutral-900 border border-white/10 p-8 text-center">
            <div className="text-4xl mb-3">🍽️</div>
            <h3 className="font-bold">Bu bölümde henüz ürün yok</h3>
            <p className="text-sm text-neutral-400 mt-2">Yönetim panelinden ürün eklendiğinde burada görünecek.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {visibleProducts.map((product) => (
              <article key={product.id} className="overflow-hidden rounded-3xl bg-neutral-900 border border-white/10">
                <div className="aspect-[4/3] bg-neutral-800">
                  {product.imageUrl ? <img src={product.imageUrl} alt={product.name} className="h-full w-full object-cover" /> : <div className="h-full grid place-items-center text-5xl">🥐</div>}
                </div>
                <div className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-bold text-lg">{product.name}</h3>
                      {product.description && <p className="text-sm text-neutral-400 mt-1 line-clamp-2">{product.description}</p>}
                    </div>
                    <strong className="whitespace-nowrap text-emerald-400">{product.price.toLocaleString('tr-TR')} ₺</strong>
                  </div>
                  <button disabled={product.soldOut} className="mt-4 w-full rounded-xl bg-emerald-600 py-3 font-semibold disabled:bg-neutral-700 disabled:text-neutral-400">
                    {product.soldOut ? 'Tükendi' : 'Sepete ekle'}
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </main>

      <nav className="fixed bottom-0 inset-x-0 z-20 border-t border-white/10 bg-neutral-900 px-4 py-3">
        <div className="max-w-3xl mx-auto grid grid-cols-4 text-center text-xs">
          <span className="text-emerald-400 font-semibold">Menü</span>
          <span>Siparişlerim</span>
          <span>Garson</span>
          <span>Hesap</span>
        </div>
      </nav>
    </div>
  );
}
