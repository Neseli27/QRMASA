import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { loadManagerSetup } from '../../utils/managerDraft';
import {
  clearMenuDraft,
  createDraftId,
  loadMenuDraft,
  saveMenuDraft,
} from '../../utils/menuDraft';

function blankProduct(categoryId = '') {
  return {
    id: '',
    name: '',
    description: '',
    price: '',
    categoryId,
    imageUrl: '',
    active: true,
    soldOut: false,
  };
}

function formatPrice(value) {
  return Number(value || 0).toLocaleString('tr-TR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function Toggle({ label, checked, onChange }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-neutral-800 p-4 text-left"
    >
      <span className="text-sm font-semibold">{label}</span>
      <span className={`relative h-7 w-12 rounded-full ${checked ? 'bg-emerald-500' : 'bg-neutral-600'}`}>
        <span className={`absolute top-1 h-5 w-5 rounded-full bg-white transition-all ${checked ? 'left-6' : 'left-1'}`} />
      </span>
    </button>
  );
}

export default function MenuManagement() {
  const navigate = useNavigate();
  const setup = useMemo(() => loadManagerSetup(), []);
  const businessCode = setup.business.code;
  const [menu, setMenu] = useState(() => loadMenuDraft(businessCode));
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [search, setSearch] = useState('');
  const [categoryName, setCategoryName] = useState('');
  const [categoryOrder, setCategoryOrder] = useState('1');
  const [editingCategoryId, setEditingCategoryId] = useState('');
  const [productForm, setProductForm] = useState(() => blankProduct());
  const [productModalOpen, setProductModalOpen] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const categories = useMemo(
    () => [...menu.categories].sort((a, b) => Number(a.sortOrder || 999) - Number(b.sortOrder || 999)),
    [menu.categories],
  );

  const visibleProducts = useMemo(() => {
    const needle = search.trim().toLocaleLowerCase('tr-TR');
    return menu.products
      .filter((product) => selectedCategory === 'all' || product.categoryId === selectedCategory)
      .filter((product) => !needle || `${product.name} ${product.description}`.toLocaleLowerCase('tr-TR').includes(needle))
      .sort((a, b) => a.name.localeCompare(b.name, 'tr'));
  }, [menu.products, search, selectedCategory]);

  const activeProductCount = menu.products.filter((product) => product.active).length;
  const soldOutCount = menu.products.filter((product) => product.soldOut).length;

  function persist(nextMenu, message = 'Değişiklikler kaydedildi.') {
    const saved = saveMenuDraft(businessCode, nextMenu);
    setMenu(saved);
    setNotice(message);
    window.setTimeout(() => setNotice(''), 2200);
  }

  function resetCategoryForm() {
    setCategoryName('');
    setCategoryOrder(String(categories.length + 1));
    setEditingCategoryId('');
    setError('');
  }

  function submitCategory(event) {
    event.preventDefault();
    const name = categoryName.trim();
    const sortOrder = Number(categoryOrder);

    if (!name) {
      setError('Kategori adını yazın.');
      return;
    }

    if (!Number.isFinite(sortOrder) || sortOrder < 1) {
      setError('Kategori sırası 1 veya daha büyük olmalıdır.');
      return;
    }

    const duplicate = menu.categories.some(
      (category) => category.id !== editingCategoryId && category.name.toLocaleLowerCase('tr-TR') === name.toLocaleLowerCase('tr-TR'),
    );
    if (duplicate) {
      setError('Bu isimde bir kategori zaten var.');
      return;
    }

    const nextCategories = editingCategoryId
      ? menu.categories.map((category) => (
        category.id === editingCategoryId
          ? { ...category, name, sortOrder, updatedAt: Date.now() }
          : category
      ))
      : [
        ...menu.categories,
        {
          id: createDraftId('category'),
          name,
          sortOrder,
          active: true,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
      ];

    persist({ ...menu, categories: nextCategories }, editingCategoryId ? 'Kategori güncellendi.' : 'Kategori eklendi.');
    resetCategoryForm();
  }

  function editCategory(category) {
    setCategoryName(category.name);
    setCategoryOrder(String(category.sortOrder || 1));
    setEditingCategoryId(category.id);
    setError('');
  }

  function toggleCategory(categoryId) {
    persist({
      ...menu,
      categories: menu.categories.map((category) => (
        category.id === categoryId ? { ...category, active: !category.active, updatedAt: Date.now() } : category
      )),
    }, 'Kategori durumu güncellendi.');
  }

  function deleteCategory(category) {
    const productCount = menu.products.filter((product) => product.categoryId === category.id).length;
    if (productCount > 0) {
      setError(`Bu kategoride ${productCount} ürün var. Önce ürünleri başka kategoriye taşıyın veya silin.`);
      return;
    }

    if (!window.confirm(`“${category.name}” kategorisi silinsin mi?`)) return;
    const nextCategories = menu.categories.filter((item) => item.id !== category.id);
    persist({ ...menu, categories: nextCategories }, 'Kategori silindi.');
    if (selectedCategory === category.id) setSelectedCategory('all');
    if (editingCategoryId === category.id) resetCategoryForm();
  }

  function openNewProduct() {
    if (categories.length === 0) {
      setError('Ürün eklemeden önce en az bir kategori oluşturun.');
      return;
    }
    const defaultCategory = selectedCategory !== 'all' ? selectedCategory : categories[0].id;
    setProductForm(blankProduct(defaultCategory));
    setError('');
    setProductModalOpen(true);
  }

  function openEditProduct(product) {
    setProductForm({ ...product, price: String(product.price) });
    setError('');
    setProductModalOpen(true);
  }

  function updateProductField(key, value) {
    setProductForm((current) => ({ ...current, [key]: value }));
  }

  function submitProduct(event) {
    event.preventDefault();
    const name = productForm.name.trim();
    const price = Number(String(productForm.price).replace(',', '.'));

    if (!name) {
      setError('Ürün adını yazın.');
      return;
    }
    if (!productForm.categoryId) {
      setError('Ürün kategorisini seçin.');
      return;
    }
    if (!Number.isFinite(price) || price < 0) {
      setError('Geçerli bir satış fiyatı yazın.');
      return;
    }

    const normalizedProduct = {
      ...productForm,
      id: productForm.id || createDraftId('product'),
      name,
      description: productForm.description.trim(),
      imageUrl: productForm.imageUrl.trim(),
      price,
      createdAt: productForm.createdAt || Date.now(),
      updatedAt: Date.now(),
    };

    const nextProducts = productForm.id
      ? menu.products.map((product) => (product.id === productForm.id ? normalizedProduct : product))
      : [...menu.products, normalizedProduct];

    persist({ ...menu, products: nextProducts }, productForm.id ? 'Ürün güncellendi.' : 'Ürün eklendi.');
    setProductModalOpen(false);
    setProductForm(blankProduct());
    setError('');
  }

  function toggleProduct(productId, field) {
    persist({
      ...menu,
      products: menu.products.map((product) => (
        product.id === productId ? { ...product, [field]: !product[field], updatedAt: Date.now() } : product
      )),
    }, 'Ürün durumu güncellendi.');
  }

  function deleteProduct(product) {
    if (!window.confirm(`“${product.name}” ürünü silinsin mi?`)) return;
    persist({ ...menu, products: menu.products.filter((item) => item.id !== product.id) }, 'Ürün silindi.');
  }

  function resetMenu() {
    if (!window.confirm('Bu işletmenin kategori ve ürün taslağı tamamen silinsin mi?')) return;
    clearMenuDraft(businessCode);
    setMenu(loadMenuDraft(businessCode));
    setSelectedCategory('all');
    resetCategoryForm();
    setNotice('Menü taslağı sıfırlandı.');
  }

  if (!setup.completed || !businessCode) {
    return (
      <div className="min-h-screen bg-neutral-950 p-6 text-white grid place-items-center">
        <div className="w-full max-w-lg rounded-3xl border border-amber-400/20 bg-neutral-900 p-7 text-center">
          <div className="text-5xl">⚠️</div>
          <h1 className="mt-4 text-2xl font-black">Önce işletme kurulumunu tamamlayın</h1>
          <p className="mt-2 text-sm text-neutral-400">Kategori ve ürünler işletme koduna bağlı olarak saklanır.</p>
          <button onClick={() => navigate('/panel/yonetici')} className="mt-6 rounded-xl bg-emerald-600 px-6 py-3 font-bold">
            Yönetici kurulumuna dön
          </button>
        </div>
      </div>
    );
  }

  const inputClass = 'w-full rounded-2xl border border-white/10 bg-neutral-800 px-4 py-3 text-white outline-none placeholder:text-neutral-600 focus:border-emerald-500';

  return (
    <div className="min-h-screen bg-neutral-950 text-white">
      <header className="sticky top-0 z-30 border-b border-white/10 bg-neutral-900/95 px-4 py-4 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-400">QRMASA Menü Yönetimi</p>
            <h1 className="mt-1 text-2xl font-black">{setup.business.name}</h1>
            <p className="mt-1 text-sm text-neutral-400">Kategori, ürün, fiyat ve satış durumu yönetimi</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => navigate('/panel/yonetici')} className="rounded-xl bg-neutral-800 px-4 py-2 text-sm font-bold">
              Yönetim ana sayfası
            </button>
            <button onClick={openNewProduct} className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-bold">
              + Ürün ekle
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl p-4 py-7">
        <section className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[
            ['Kategoriler', menu.categories.length, '📚'],
            ['Toplam ürün', menu.products.length, '🍽️'],
            ['Satışta', activeProductCount, '✓'],
            ['Tükendi', soldOutCount, '⏸'],
          ].map(([label, value, icon]) => (
            <article key={label} className="rounded-3xl border border-white/10 bg-neutral-900 p-5">
              <div className="text-2xl">{icon}</div>
              <p className="mt-3 text-sm text-neutral-400">{label}</p>
              <strong className="mt-1 block text-3xl">{value}</strong>
            </article>
          ))}
        </section>

        <section className="mb-6 rounded-3xl border border-amber-400/20 bg-amber-400/10 p-5 text-sm leading-6 text-amber-100/80">
          Bu ekran geliştirme taslağıdır. Kategori ve ürünler yalnızca bu tarayıcıda saklanır; Firebase kaydı ve gerçek yetkilendirme bütün yönetim modülleri tamamlandıktan sonra bağlanacaktır.
        </section>

        {notice && <div className="mb-5 rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-4 text-sm text-emerald-200">{notice}</div>}
        {error && <div className="mb-5 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">{error}</div>}

        <div className="grid gap-6 lg:grid-cols-[330px_1fr]">
          <aside className="h-fit rounded-3xl border border-white/10 bg-neutral-900 p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-emerald-400">Kategoriler</p>
                <h2 className="mt-1 text-xl font-black">Menü bölümleri</h2>
              </div>
              <span className="rounded-full bg-neutral-800 px-3 py-1 text-xs text-neutral-400">{categories.length}</span>
            </div>

            <form onSubmit={submitCategory} className="mt-5 space-y-3 rounded-2xl bg-neutral-800/70 p-4">
              <input
                className={inputClass}
                value={categoryName}
                onChange={(event) => setCategoryName(event.target.value)}
                placeholder="Kategori adı"
              />
              <div className="grid grid-cols-[1fr_auto] gap-2">
                <input
                  type="number"
                  min="1"
                  className={inputClass}
                  value={categoryOrder}
                  onChange={(event) => setCategoryOrder(event.target.value)}
                  placeholder="Sıra"
                />
                <button className="rounded-2xl bg-emerald-600 px-4 font-bold">
                  {editingCategoryId ? 'Güncelle' : 'Ekle'}
                </button>
              </div>
              {editingCategoryId && (
                <button type="button" onClick={resetCategoryForm} className="w-full rounded-xl bg-neutral-700 py-2 text-sm font-semibold">
                  Düzenlemeyi iptal et
                </button>
              )}
            </form>

            <div className="mt-5 space-y-2">
              <button
                onClick={() => setSelectedCategory('all')}
                className={`flex w-full items-center justify-between rounded-2xl p-4 text-left ${selectedCategory === 'all' ? 'bg-emerald-500/15 text-emerald-200' : 'bg-neutral-800'}`}
              >
                <span className="font-semibold">Tüm ürünler</span>
                <span className="text-sm">{menu.products.length}</span>
              </button>

              {categories.map((category) => {
                const count = menu.products.filter((product) => product.categoryId === category.id).length;
                return (
                  <div key={category.id} className={`rounded-2xl border p-3 ${selectedCategory === category.id ? 'border-emerald-500/40 bg-emerald-500/10' : 'border-white/5 bg-neutral-800'}`}>
                    <button onClick={() => setSelectedCategory(category.id)} className="flex w-full items-center justify-between gap-3 text-left">
                      <span>
                        <strong className="block text-sm">{category.name}</strong>
                        <span className={`mt-1 block text-xs ${category.active ? 'text-emerald-400' : 'text-neutral-500'}`}>{category.active ? 'Yayında' : 'Gizli'}</span>
                      </span>
                      <span className="text-sm text-neutral-400">{count}</span>
                    </button>
                    <div className="mt-3 grid grid-cols-3 gap-2 border-t border-white/10 pt-3 text-xs">
                      <button onClick={() => editCategory(category)} className="rounded-lg bg-neutral-700 py-2">Düzenle</button>
                      <button onClick={() => toggleCategory(category.id)} className="rounded-lg bg-neutral-700 py-2">{category.active ? 'Gizle' : 'Yayınla'}</button>
                      <button onClick={() => deleteCategory(category)} className="rounded-lg bg-red-500/10 py-2 text-red-200">Sil</button>
                    </div>
                  </div>
                );
              })}
            </div>
          </aside>

          <section className="rounded-3xl border border-white/10 bg-neutral-900 p-5 sm:p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-emerald-400">Ürünler</p>
                <h2 className="mt-1 text-xl font-black">Menü içeriği</h2>
              </div>
              <div className="flex gap-2">
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Ürün ara"
                  className="rounded-xl border border-white/10 bg-neutral-800 px-4 py-2 text-sm outline-none focus:border-emerald-500"
                />
                <button onClick={openNewProduct} className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-bold">+ Ekle</button>
              </div>
            </div>

            {visibleProducts.length === 0 ? (
              <div className="mt-6 rounded-3xl border border-dashed border-white/10 bg-neutral-950/40 p-12 text-center">
                <div className="text-5xl">🍽️</div>
                <h3 className="mt-4 text-xl font-bold">Henüz ürün bulunmuyor</h3>
                <p className="mt-2 text-sm text-neutral-400">Kategori oluşturup ilk ürününüzü ekleyin.</p>
                <button onClick={openNewProduct} className="mt-5 rounded-xl bg-emerald-600 px-5 py-3 font-bold">İlk ürünü ekle</button>
              </div>
            ) : (
              <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {visibleProducts.map((product) => {
                  const category = menu.categories.find((item) => item.id === product.categoryId);
                  return (
                    <article key={product.id} className="overflow-hidden rounded-3xl border border-white/10 bg-neutral-800/70">
                      <div className="aspect-[4/3] bg-neutral-800">
                        {product.imageUrl ? (
                          <img src={product.imageUrl} alt={product.name} className="h-full w-full object-cover" />
                        ) : (
                          <div className="grid h-full place-items-center text-5xl">🥐</div>
                        )}
                      </div>
                      <div className="p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-xs text-emerald-400">{category?.name || 'Kategorisiz'}</p>
                            <h3 className="mt-1 text-lg font-bold">{product.name}</h3>
                          </div>
                          <strong className="whitespace-nowrap text-emerald-400">{formatPrice(product.price)} ₺</strong>
                        </div>
                        {product.description && <p className="mt-2 line-clamp-2 text-sm text-neutral-400">{product.description}</p>}
                        <div className="mt-4 flex flex-wrap gap-2 text-xs">
                          <span className={`rounded-full px-3 py-1 ${product.active ? 'bg-emerald-500/15 text-emerald-300' : 'bg-neutral-700 text-neutral-400'}`}>{product.active ? 'Satışta' : 'Gizli'}</span>
                          {product.soldOut && <span className="rounded-full bg-amber-500/15 px-3 py-1 text-amber-300">Tükendi</span>}
                        </div>
                        <div className="mt-4 grid grid-cols-2 gap-2">
                          <button onClick={() => openEditProduct(product)} className="rounded-xl bg-neutral-700 py-2 text-sm font-semibold">Düzenle</button>
                          <button onClick={() => toggleProduct(product.id, 'soldOut')} className="rounded-xl bg-neutral-700 py-2 text-sm font-semibold">{product.soldOut ? 'Stoğa al' : 'Tükendi'}</button>
                          <button onClick={() => toggleProduct(product.id, 'active')} className="rounded-xl bg-neutral-700 py-2 text-sm font-semibold">{product.active ? 'Gizle' : 'Yayınla'}</button>
                          <button onClick={() => deleteProduct(product)} className="rounded-xl bg-red-500/10 py-2 text-sm font-semibold text-red-200">Sil</button>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        </div>

        <div className="mt-6 flex justify-end">
          <button onClick={resetMenu} className="rounded-xl border border-red-400/20 bg-red-400/10 px-5 py-3 text-sm font-semibold text-red-200">
            Menü taslağını sıfırla
          </button>
        </div>
      </main>

      {productModalOpen && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/80 p-4" onClick={() => setProductModalOpen(false)}>
          <form onSubmit={submitProduct} className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-white/10 bg-neutral-900" onClick={(event) => event.stopPropagation()}>
            <header className="flex items-center justify-between border-b border-white/10 p-5">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-emerald-400">Ürün kartı</p>
                <h2 className="mt-1 text-2xl font-black">{productForm.id ? 'Ürünü düzenle' : 'Yeni ürün ekle'}</h2>
              </div>
              <button type="button" onClick={() => setProductModalOpen(false)} className="h-10 w-10 rounded-full bg-neutral-800 text-xl">×</button>
            </header>

            <div className="grid gap-5 p-5 sm:grid-cols-2">
              <label className="block">
                <span className="text-sm font-semibold">Ürün adı</span>
                <input className={`${inputClass} mt-2`} value={productForm.name} onChange={(event) => updateProductField('name', event.target.value)} placeholder="Örneğin: Peynirli su böreği" />
              </label>
              <label className="block">
                <span className="text-sm font-semibold">Kategori</span>
                <select className={`${inputClass} mt-2`} value={productForm.categoryId} onChange={(event) => updateProductField('categoryId', event.target.value)}>
                  <option value="">Kategori seçin</option>
                  {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
                </select>
              </label>
              <label className="block">
                <span className="text-sm font-semibold">Satış fiyatı</span>
                <input type="number" min="0" step="0.01" className={`${inputClass} mt-2`} value={productForm.price} onChange={(event) => updateProductField('price', event.target.value)} placeholder="0,00" />
              </label>
              <label className="block">
                <span className="text-sm font-semibold">Görsel bağlantısı</span>
                <input className={`${inputClass} mt-2`} value={productForm.imageUrl} onChange={(event) => updateProductField('imageUrl', event.target.value)} placeholder="https://..." />
              </label>
              <label className="block sm:col-span-2">
                <span className="text-sm font-semibold">Ürün açıklaması</span>
                <textarea rows={4} maxLength={500} className={`${inputClass} mt-2 resize-none`} value={productForm.description} onChange={(event) => updateProductField('description', event.target.value)} placeholder="İçerik, porsiyon veya servis bilgisi" />
                <span className="mt-1 block text-right text-xs text-neutral-500">{productForm.description.length}/500</span>
              </label>
              <Toggle label="Ürün satışta" checked={productForm.active} onChange={(value) => updateProductField('active', value)} />
              <Toggle label="Ürün tükendi" checked={productForm.soldOut} onChange={(value) => updateProductField('soldOut', value)} />
            </div>

            {error && <div className="mx-5 mb-5 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">{error}</div>}

            <footer className="flex justify-end gap-3 border-t border-white/10 p-5">
              <button type="button" onClick={() => setProductModalOpen(false)} className="rounded-xl bg-neutral-800 px-5 py-3 font-bold">Vazgeç</button>
              <button className="rounded-xl bg-emerald-600 px-6 py-3 font-bold">{productForm.id ? 'Değişiklikleri kaydet' : 'Ürünü ekle'}</button>
            </footer>
          </form>
        </div>
      )}
    </div>
  );
}
