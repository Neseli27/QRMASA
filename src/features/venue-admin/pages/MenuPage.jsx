import { useEffect, useState } from 'react';
import {
  collection, onSnapshot, orderBy, query, doc, setDoc, deleteDoc,
  serverTimestamp, writeBatch
} from 'firebase/firestore';
import {
  Plus, Pencil, Trash2, GripVertical, UtensilsCrossed,
  ChevronDown, ChevronUp, FolderPlus, Eye, EyeOff
} from 'lucide-react';
import toast from 'react-hot-toast';
import { db } from '../../../lib/firebase';
import { venueCol, storagePaths } from '../../../lib/paths';
import { useAuth } from '../../../contexts/AuthContext';
import { Button } from '../../../components/ui/Button';
import { Input, Textarea } from '../../../components/ui/Input';
import { Modal, ConfirmDialog } from '../../../components/ui/Modal';
import { Card } from '../../../components/ui/Card';
import { EmptyState, LoadingScreen } from '../../../components/ui/StateScreens';
import { ImageUploader } from '../../../components/ui/ImageUploader';
import { formatPrice } from '../../../lib/security';
import { shortId, cn } from '../../../lib/utils';

export default function MenuPage() {
  const { venueId } = useAuth();
  const [categories, setCategories] = useState([]);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeCategoryId, setActiveCategoryId] = useState(null);

  // Modal state
  const [catModal, setCatModal] = useState(null);
  const [itemModal, setItemModal] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);

  // Realtime kategoriler
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
      if (!activeCategoryId && list.length > 0) setActiveCategoryId(list[0].id);
      setLoading(false);
    });
    return () => unsub();
  }, [venueId]);

  // Realtime ürünler (tüm kategorilerin ürünleri)
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
    });
    return () => unsub();
  }, [venueId]);

  const categoryItems = items.filter((i) => i.categoryId === activeCategoryId);

  const handleCategoryDelete = async (cat) => {
    try {
      // Kategorideki ürünleri de sil
      const catItems = items.filter((i) => i.categoryId === cat.id);
      const batch = writeBatch(db);
      catItems.forEach((it) => {
        batch.delete(doc(db, venueCol(venueId, 'menu_items'), it.id));
      });
      batch.delete(doc(db, venueCol(venueId, 'categories'), cat.id));
      await batch.commit();
      toast.success('Kategori silindi');
      if (activeCategoryId === cat.id) setActiveCategoryId(null);
    } catch (e) {
      toast.error('Silinemedi: ' + e.message);
    }
  };

  const handleItemDelete = async (item) => {
    try {
      await deleteDoc(doc(db, venueCol(venueId, 'menu_items'), item.id));
      toast.success('Ürün silindi');
    } catch (e) {
      toast.error('Silinemedi: ' + e.message);
    }
  };

  const handleToggleItemAvailable = async (item) => {
    try {
      await setDoc(
        doc(db, venueCol(venueId, 'menu_items'), item.id),
        { available: !item.available, updatedAt: serverTimestamp() },
        { merge: true }
      );
    } catch (e) {
      toast.error('Güncellenemedi');
    }
  };

  if (loading) return <LoadingScreen message="Menü yükleniyor..." />;

  return (
    <div className="space-y-6">
      {/* Başlık */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-display text-3xl font-bold text-slate-900">Menü</h1>
          <p className="text-sm text-slate-500 mt-1">Kategoriler ve ürünler</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            icon={FolderPlus}
            onClick={() => setCatModal({ mode: 'new' })}
          >
            Kategori Ekle
          </Button>
          <Button
            icon={Plus}
            onClick={() => setItemModal({ mode: 'new', categoryId: activeCategoryId })}
            disabled={categories.length === 0}
            className="bg-gradient-to-r from-orange-500 to-red-600"
          >
            Ürün Ekle
          </Button>
        </div>
      </div>

      {categories.length === 0 ? (
        <Card>
          <EmptyState
            icon={UtensilsCrossed}
            title="Menü boş"
            description="İlk kategoriyi ekleyerek başla. Örn: Başlangıçlar, Ana Yemek, İçecek."
            action={
              <Button
                icon={FolderPlus}
                onClick={() => setCatModal({ mode: 'new' })}
                className="mt-2 bg-gradient-to-r from-orange-500 to-red-600"
              >
                İlk Kategoriyi Ekle
              </Button>
            }
          />
        </Card>
      ) : (
        <div className="grid md:grid-cols-[260px_1fr] gap-6">
          {/* Sol: Kategoriler */}
          <div className="space-y-1">
            {categories.map((cat) => (
              <CategoryRow
                key={cat.id}
                cat={cat}
                isActive={activeCategoryId === cat.id}
                itemCount={items.filter((i) => i.categoryId === cat.id).length}
                onClick={() => setActiveCategoryId(cat.id)}
                onEdit={() => setCatModal({ mode: 'edit', data: cat })}
                onDelete={() => setConfirmDelete({
                  type: 'category',
                  data: cat,
                  message: `"${cat.name}" kategorisi ve içindeki tüm ürünler silinecek. Emin misin?`
                })}
              />
            ))}
          </div>

          {/* Sağ: Ürünler */}
          <div>
            {activeCategoryId ? (
              <div className="space-y-3">
                {categoryItems.length === 0 ? (
                  <Card>
                    <EmptyState
                      icon={UtensilsCrossed}
                      title="Bu kategoride ürün yok"
                      description="İlk ürünü ekle."
                      action={
                        <Button
                          icon={Plus}
                          onClick={() => setItemModal({ mode: 'new', categoryId: activeCategoryId })}
                          className="mt-2 bg-gradient-to-r from-orange-500 to-red-600"
                        >
                          Ürün Ekle
                        </Button>
                      }
                    />
                  </Card>
                ) : (
                  categoryItems.map((item) => (
                    <ItemRow
                      key={item.id}
                      item={item}
                      onEdit={() => setItemModal({ mode: 'edit', data: item })}
                      onToggle={() => handleToggleItemAvailable(item)}
                      onDelete={() => setConfirmDelete({
                        type: 'item',
                        data: item,
                        message: `"${item.name}" silinecek. Emin misin?`
                      })}
                    />
                  ))
                )}
              </div>
            ) : (
              <Card>
                <EmptyState
                  icon={UtensilsCrossed}
                  title="Kategori seç"
                  description="Soldan bir kategoriye tıkla"
                />
              </Card>
            )}
          </div>
        </div>
      )}

      {/* Modallar */}
      <CategoryModal
        state={catModal}
        onClose={() => setCatModal(null)}
        venueId={venueId}
        nextOrder={categories.length}
      />
      <ItemModal
        state={itemModal}
        onClose={() => setItemModal(null)}
        venueId={venueId}
        categories={categories}
        nextOrder={categoryItems.length}
      />
      <ConfirmDialog
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        onConfirm={async () => {
          if (confirmDelete.type === 'category') await handleCategoryDelete(confirmDelete.data);
          else if (confirmDelete.type === 'item') await handleItemDelete(confirmDelete.data);
          setConfirmDelete(null);
        }}
        title="Silme Onayı"
        message={confirmDelete?.message || ''}
        confirmText="Sil"
        danger
      />
    </div>
  );
}

// ═══════════════════════════════════════════════════
// Category Row
// ═══════════════════════════════════════════════════
function CategoryRow({ cat, isActive, itemCount, onClick, onEdit, onDelete }) {
  return (
    <div
      className={cn(
        'group flex items-center gap-2 px-3 py-2.5 rounded-xl cursor-pointer transition-colors',
        isActive
          ? 'bg-orange-50 border border-orange-200'
          : 'bg-white border border-slate-200 hover:border-slate-300'
      )}
      onClick={onClick}
    >
      <div className="flex-1 min-w-0">
        <div className={cn('font-semibold text-sm truncate', isActive ? 'text-orange-700' : 'text-slate-900')}>
          {cat.name}
        </div>
        <div className="text-xs text-slate-500 mt-0.5">{itemCount} ürün</div>
      </div>
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={(e) => { e.stopPropagation(); onEdit(); }}
          className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-white text-slate-400 hover:text-slate-700"
        >
          <Pencil className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-red-50 text-slate-400 hover:text-red-600"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════
// Item Row
// ═══════════════════════════════════════════════════
function ItemRow({ item, onEdit, onToggle, onDelete }) {
  return (
    <div className={cn(
      'group flex items-center gap-3 p-3 rounded-2xl border transition-all',
      item.available === false
        ? 'bg-slate-50 border-slate-200 opacity-60'
        : 'bg-white border-slate-200 hover:border-slate-300 hover:shadow-sm'
    )}>
      {/* Resim */}
      <div className="w-16 h-16 rounded-xl bg-slate-100 overflow-hidden flex-shrink-0">
        {item.image ? (
          <img src={item.image} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-slate-300">
            <UtensilsCrossed className="w-5 h-5" />
          </div>
        )}
      </div>

      {/* Bilgi */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start gap-2">
          <h4 className="font-semibold text-sm text-slate-900 truncate flex-1">{item.name}</h4>
          {item.available === false && (
            <span className="pill bg-slate-200 text-slate-600 text-xs flex-shrink-0">Tükendi</span>
          )}
        </div>
        {item.description && (
          <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{item.description}</p>
        )}
        <div className="font-display font-bold text-orange-600 text-sm mt-1">
          {formatPrice(item.price)}
        </div>
      </div>

      {/* Aksiyonlar */}
      <div className="flex items-center gap-1">
        <button
          onClick={onToggle}
          className={cn(
            'w-8 h-8 rounded-lg flex items-center justify-center transition-colors',
            item.available === false
              ? 'text-slate-400 hover:text-emerald-600 hover:bg-emerald-50'
              : 'text-emerald-600 hover:text-slate-400 hover:bg-slate-100'
          )}
          title={item.available === false ? 'Mevcut yap' : 'Tükendi yap'}
        >
          {item.available === false ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
        <button
          onClick={onEdit}
          className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100"
        >
          <Pencil className="w-4 h-4" />
        </button>
        <button
          onClick={onDelete}
          className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-red-600 hover:bg-red-50"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════
// Kategori Modal
// ═══════════════════════════════════════════════════
function CategoryModal({ state, onClose, venueId, nextOrder }) {
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (state?.mode === 'edit') setName(state.data.name);
    else setName('');
  }, [state]);

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error('Kategori adı gerekli');
      return;
    }
    setSaving(true);
    try {
      const id = state.mode === 'edit' ? state.data.id : `cat_${shortId(8).toLowerCase()}`;
      const payload = {
        name: name.trim(),
        updatedAt: serverTimestamp()
      };
      if (state.mode === 'new') {
        payload.createdAt = serverTimestamp();
        payload.sortOrder = nextOrder;
      }
      await setDoc(doc(db, venueCol(venueId, 'categories'), id), payload, { merge: true });
      toast.success(state.mode === 'new' ? 'Kategori eklendi' : 'Güncellendi');
      onClose();
    } catch (e) {
      toast.error('Hata: ' + e.message);
    } finally {
      setSaving(false);
    }
  };

  if (!state) return null;

  return (
    <Modal
      open={!!state}
      onClose={onClose}
      title={state.mode === 'new' ? 'Yeni Kategori' : 'Kategori Düzenle'}
      footer={
        <>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-100"
          >
            İptal
          </button>
          <Button
            onClick={handleSave}
            loading={saving}
            className="bg-gradient-to-r from-orange-500 to-red-600"
          >
            Kaydet
          </Button>
        </>
      }
    >
      <Input
        label="Kategori Adı"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Örn: Başlangıçlar"
        autoFocus
      />
    </Modal>
  );
}

// ═══════════════════════════════════════════════════
// Ürün Modal
// ═══════════════════════════════════════════════════
function ItemModal({ state, onClose, venueId, categories, nextOrder }) {
  const [form, setForm] = useState({
    name: '',
    description: '',
    price: '',
    categoryId: '',
    image: null,
    available: true
  });
  const [saving, setSaving] = useState(false);
  const [itemId, setItemId] = useState(null);

  useEffect(() => {
    if (state?.mode === 'edit') {
      setForm({
        name: state.data.name || '',
        description: state.data.description || '',
        price: state.data.price?.toString() || '',
        categoryId: state.data.categoryId || '',
        image: state.data.image || null,
        available: state.data.available !== false
      });
      setItemId(state.data.id);
    } else if (state?.mode === 'new') {
      setForm({
        name: '',
        description: '',
        price: '',
        categoryId: state.categoryId || categories[0]?.id || '',
        image: null,
        available: true
      });
      // Yeni ürün için ID'yi önceden üret (resim yüklerken path'te lazım)
      setItemId(`it_${shortId(10).toLowerCase()}`);
    }
  }, [state, categories]);

  const handleSave = async () => {
    if (!form.name.trim() || !form.price || !form.categoryId) {
      toast.error('Ad, fiyat ve kategori gerekli');
      return;
    }
    const price = parseFloat(form.price);
    if (isNaN(price) || price < 0) {
      toast.error('Geçersiz fiyat');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        description: form.description.trim() || null,
        price,
        categoryId: form.categoryId,
        image: form.image || null,
        available: form.available,
        updatedAt: serverTimestamp()
      };
      if (state.mode === 'new') {
        payload.createdAt = serverTimestamp();
        payload.sortOrder = nextOrder;
      }
      await setDoc(doc(db, venueCol(venueId, 'menu_items'), itemId), payload, { merge: true });
      toast.success(state.mode === 'new' ? 'Ürün eklendi' : 'Güncellendi');
      onClose();
    } catch (e) {
      console.error(e);
      toast.error('Hata: ' + e.message);
    } finally {
      setSaving(false);
    }
  };

  if (!state) return null;

  return (
    <Modal
      open={!!state}
      onClose={onClose}
      title={state.mode === 'new' ? 'Yeni Ürün' : 'Ürün Düzenle'}
      size="lg"
      footer={
        <>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-100"
          >
            İptal
          </button>
          <Button
            onClick={handleSave}
            loading={saving}
            className="bg-gradient-to-r from-orange-500 to-red-600"
          >
            Kaydet
          </Button>
        </>
      }
    >
      <div className="grid md:grid-cols-[200px_1fr] gap-6">
        <div>
          <ImageUploader
            label="Ürün Resmi"
            value={form.image}
            path={storagePaths.menuItem(venueId, itemId, '')}
            onChange={(url) => setForm({ ...form, image: url })}
            maxSizeMB={3}
          />
        </div>
        <div className="space-y-4">
          <Input
            label="Ürün Adı *"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Örn: Ali Nazik Kebap"
            autoFocus
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Fiyat (₺) *"
              type="number"
              step="0.01"
              value={form.price}
              onChange={(e) => setForm({ ...form, price: e.target.value })}
              placeholder="0.00"
            />
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Kategori *</label>
              <select
                value={form.categoryId}
                onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
                className="input-field"
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          </div>
          <Textarea
            label="Açıklama"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="Ürün hakkında kısa bilgi..."
            rows={3}
          />
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={form.available}
              onChange={(e) => setForm({ ...form, available: e.target.checked })}
              className="w-4 h-4 rounded border-slate-300 text-orange-500 focus:ring-orange-200"
            />
            <span className="text-sm text-slate-700">Mevcut (müşteri sipariş verebilir)</span>
          </label>
        </div>
      </div>
    </Modal>
  );
}
