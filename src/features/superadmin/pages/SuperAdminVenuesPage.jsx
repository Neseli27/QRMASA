import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  collection, onSnapshot, orderBy, query, doc, setDoc, deleteDoc,
  serverTimestamp, writeBatch
} from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import {
  Building2, Plus, Search, Pause, Play, Trash2, Settings,
  ExternalLink, MoreVertical, Crown
} from 'lucide-react';
import toast from 'react-hot-toast';
import { db, functions } from '../../../lib/firebase';
import { collections } from '../../../lib/paths';
import { slugify, shortId, relativeTime } from '../../../lib/utils';
import { Button } from '../../../components/ui/Button';
import { Input, Textarea } from '../../../components/ui/Input';
import { Modal, ConfirmDialog } from '../../../components/ui/Modal';
import { LoadingScreen } from '../../../components/ui/StateScreens';

export default function SuperAdminVenuesPage() {
  const [venues, setVenues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null);

  useEffect(() => {
    const q = query(collection(db, collections.venues), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const list = [];
        snap.forEach((d) => list.push({ id: d.id, ...d.data() }));
        setVenues(list);
        setLoading(false);
      },
      (err) => {
        console.error('[Venues]', err);
        toast.error('Mekanlar yüklenemedi');
        setLoading(false);
      }
    );
    return () => unsub();
  }, []);

  const filtered = venues.filter((v) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      v.branding?.name?.toLowerCase().includes(s) ||
      v.slug?.toLowerCase().includes(s) ||
      v.ownerEmail?.toLowerCase().includes(s)
    );
  });

  const handleToggleSuspend = async (venue) => {
    try {
      const newStatus = venue.suspended ? false : true;
      await setDoc(
        doc(db, collections.venues, venue.id),
        { suspended: newStatus, published: newStatus ? false : venue.published, updatedAt: serverTimestamp() },
        { merge: true }
      );
      toast.success(newStatus ? 'Mekan askıya alındı' : 'Mekan aktif edildi');
    } catch (e) {
      toast.error('Güncellenemedi: ' + e.message);
    }
  };

  const handleTogglePublished = async (venue) => {
    try {
      await setDoc(
        doc(db, collections.venues, venue.id),
        { published: !venue.published, updatedAt: serverTimestamp() },
        { merge: true }
      );
      toast.success(!venue.published ? 'Yayına alındı' : 'Yayından kaldırıldı');
    } catch (e) {
      toast.error('Güncellenemedi: ' + e.message);
    }
  };

  const handleDelete = async (venue) => {
    try {
      const batch = writeBatch(db);
      batch.delete(doc(db, collections.venues, venue.id));
      if (venue.slug) {
        batch.delete(doc(db, collections.slugIndex, venue.slug));
      }
      await batch.commit();
      toast.success('Mekan silindi');
    } catch (e) {
      toast.error('Silinemedi: ' + e.message);
    }
  };

  if (loading) return <LoadingScreen theme="dark" message="Mekanlar yükleniyor..." />;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-display text-3xl font-bold text-white">Mekanlar</h1>
          <p className="text-sm text-slate-400 mt-1">{venues.length} mekan · {venues.filter(v => v.published && !v.suspended).length} aktif</p>
        </div>
        <Button
          icon={Plus}
          onClick={() => setModalOpen(true)}
          className="bg-gradient-to-r from-orange-500 to-red-600"
        >
          Yeni Mekan
        </Button>
      </div>

      {/* Arama */}
      {venues.length > 0 && (
        <div className="relative max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Mekan ara (ad, slug, e-posta)..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-100 placeholder:text-slate-500 focus:border-orange-500/50 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
          />
        </div>
      )}

      {venues.length === 0 ? (
        <div className="bg-slate-900 rounded-2xl border border-slate-800 p-12 text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-slate-800 mb-4">
            <Building2 className="w-6 h-6 text-slate-400" />
          </div>
          <h3 className="font-display text-lg font-bold text-slate-100 mb-2">Henüz mekan yok</h3>
          <p className="text-sm text-slate-400 mb-6">İlk mekanı ekleyerek başla.</p>
          <Button
            icon={Plus}
            onClick={() => setModalOpen(true)}
            className="bg-gradient-to-r from-orange-500 to-red-600"
          >
            İlk Mekanı Oluştur
          </Button>
        </div>
      ) : (
        <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden">
          <div className="divide-y divide-slate-800">
            {filtered.map((v) => (
              <VenueRow
                key={v.id}
                venue={v}
                onTogglePublish={() => handleTogglePublished(v)}
                onToggleSuspend={() => setConfirmAction({
                  type: 'suspend',
                  venue: v,
                  message: v.suspended
                    ? `"${v.branding?.name}" aktif edilecek. Emin misin?`
                    : `"${v.branding?.name}" askıya alınacak. Müşteriler QR tarayamayacak. Emin misin?`,
                  confirmText: v.suspended ? 'Aktif Et' : 'Askıya Al',
                  action: () => handleToggleSuspend(v)
                })}
                onDelete={() => setConfirmAction({
                  type: 'delete',
                  venue: v,
                  message: `"${v.branding?.name}" kalıcı olarak silinecek. Bu işlem geri alınamaz. Emin misin?`,
                  confirmText: 'Sil',
                  danger: true,
                  action: () => handleDelete(v)
                })}
              />
            ))}
          </div>

          {filtered.length === 0 && (
            <div className="p-12 text-center text-sm text-slate-500">
              "{search}" ile eşleşen mekan yok
            </div>
          )}
        </div>
      )}

      <NewVenueModal open={modalOpen} onClose={() => setModalOpen(false)} />

      <ConfirmDialog
        open={!!confirmAction}
        onClose={() => setConfirmAction(null)}
        onConfirm={async () => {
          await confirmAction.action();
          setConfirmAction(null);
        }}
        title={confirmAction?.type === 'delete' ? 'Silme Onayı' : 'Durum Değişikliği'}
        message={confirmAction?.message || ''}
        confirmText={confirmAction?.confirmText || 'Onayla'}
        danger={confirmAction?.danger}
      />
    </div>
  );
}

// ═══════════════════════════════════════════════════
// Venue Row
// ═══════════════════════════════════════════════════
function VenueRow({ venue, onTogglePublish, onToggleSuspend, onDelete }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const color = venue.branding?.primaryColor || '#f97316';

  const statusPill = venue.suspended
    ? { label: 'Askıda', color: 'bg-red-500/20 text-red-400' }
    : venue.published
      ? { label: 'Yayında', color: 'bg-emerald-500/20 text-emerald-400' }
      : { label: 'Taslak', color: 'bg-amber-500/20 text-amber-400' };

  return (
    <div className="group px-5 py-4 hover:bg-slate-800/40 transition-colors">
      <div className="flex items-center gap-4">
        {/* Avatar */}
        {venue.branding?.logo ? (
          <img src={venue.branding.logo} alt="" className="w-11 h-11 rounded-xl object-cover flex-shrink-0" />
        ) : (
          <div
            className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: color }}
          >
            <Building2 className="w-5 h-5 text-white" />
          </div>
        )}

        {/* Bilgi */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <h3 className="font-semibold text-slate-100 truncate">
              {venue.branding?.name || venue.id}
            </h3>
            <span className={`pill text-xs ${statusPill.color}`}>{statusPill.label}</span>
            <span className="pill text-xs bg-slate-800 text-slate-400">
              <Crown className="w-3 h-3 mr-0.5" />
              {venue.plan || 'free'}
            </span>
          </div>
          <div className="flex items-center gap-3 text-xs text-slate-500">
            <span className="font-mono">/m/{venue.slug}</span>
            {venue.ownerEmail && (
              <>
                <span>·</span>
                <span className="truncate">{venue.ownerEmail}</span>
              </>
            )}
            {venue.createdAt && (
              <>
                <span>·</span>
                <span>{relativeTime(venue.createdAt)}</span>
              </>
            )}
          </div>
        </div>

        {/* Hızlı aksiyonlar */}
        <div className="flex items-center gap-1 flex-shrink-0">
          <Link
            to={`/superadmin/mekanlar/${venue.id}`}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors flex items-center gap-1.5"
          >
            <Settings className="w-3.5 h-3.5" />
            Yönet
          </Link>

          <div className="relative">
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-200 hover:bg-slate-800"
            >
              <MoreVertical className="w-4 h-4" />
            </button>
            {menuOpen && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setMenuOpen(false)}
                />
                <div className="absolute right-0 top-10 z-20 w-52 bg-slate-900 border border-slate-800 rounded-xl shadow-xl overflow-hidden">
                  <button
                    onClick={() => { onTogglePublish(); setMenuOpen(false); }}
                    disabled={venue.suspended}
                    className="w-full px-4 py-2.5 text-left text-sm text-slate-300 hover:bg-slate-800 flex items-center gap-2 disabled:opacity-50"
                  >
                    {venue.published ? (
                      <><Pause className="w-4 h-4" /> Yayından Kaldır</>
                    ) : (
                      <><Play className="w-4 h-4" /> Yayına Al</>
                    )}
                  </button>
                  <button
                    onClick={() => { onToggleSuspend(); setMenuOpen(false); }}
                    className="w-full px-4 py-2.5 text-left text-sm text-slate-300 hover:bg-slate-800 flex items-center gap-2"
                  >
                    {venue.suspended ? (
                      <><Play className="w-4 h-4" /> Aktif Et</>
                    ) : (
                      <><Pause className="w-4 h-4" /> Askıya Al</>
                    )}
                  </button>
                  <a
                    href={`/m/${venue.slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full px-4 py-2.5 text-left text-sm text-slate-300 hover:bg-slate-800 flex items-center gap-2"
                    onClick={() => setMenuOpen(false)}
                  >
                    <ExternalLink className="w-4 h-4" /> Müşteri Görünümü
                  </a>
                  <div className="border-t border-slate-800" />
                  <button
                    onClick={() => { onDelete(); setMenuOpen(false); }}
                    className="w-full px-4 py-2.5 text-left text-sm text-red-400 hover:bg-red-500/10 flex items-center gap-2"
                  >
                    <Trash2 className="w-4 h-4" /> Sil
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════
// Yeni Mekan Modal — Cloud Function ile otomatik kullanıcı oluşturur
// ═══════════════════════════════════════════════════
function NewVenueModal({ open, onClose }) {
  const [form, setForm] = useState({
    name: '',
    slug: '',
    ownerEmail: '',
    ownerPassword: '',
    ownerDisplayName: '',
    welcomeText: '',
    description: '',
    plan: 'free'
  });
  const [saving, setSaving] = useState(false);
  const [createdCredentials, setCreatedCredentials] = useState(null);

  const reset = () => {
    setForm({
      name: '', slug: '', ownerEmail: '', ownerPassword: '',
      ownerDisplayName: '', welcomeText: '', description: '', plan: 'free'
    });
    setCreatedCredentials(null);
  };

  const handleNameChange = (v) => {
    setForm({ ...form, name: v, slug: slugify(v) });
  };

  // Otomatik güçlü şifre üretir
  const generatePassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
    let pass = '';
    for (let i = 0; i < 10; i++) {
      pass += chars[Math.floor(Math.random() * chars.length)];
    }
    setForm({ ...form, ownerPassword: pass });
  };

  const handleSave = async () => {
    // Validasyon
    if (!form.name.trim()) return toast.error('Mekan adı gerekli');
    if (!form.slug.trim()) return toast.error('Slug gerekli');
    if (!form.ownerEmail.trim()) return toast.error('Sahibin e-postası gerekli');
    if (!form.ownerPassword || form.ownerPassword.length < 6) {
      return toast.error('Şifre en az 6 karakter olmalı');
    }

    setSaving(true);
    try {
      const createVenue = httpsCallable(functions, 'createVenueWithOwner');
      const result = await createVenue({
        name: form.name,
        slug: form.slug,
        ownerEmail: form.ownerEmail,
        ownerPassword: form.ownerPassword,
        ownerDisplayName: form.ownerDisplayName,
        welcomeText: form.welcomeText,
        description: form.description,
        plan: form.plan
      });

      const { credentials, isNewUser } = result.data;
      setCreatedCredentials({ ...credentials, isNewUser });
      toast.success('Mekan ve işletme hesabı oluşturuldu');
    } catch (e) {
      console.error(e);
      toast.error('Oluşturulamadı: ' + (e.message || 'Bilinmeyen hata'));
    } finally {
      setSaving(false);
    }
  };

  const handleCopyCredentials = () => {
    const text = `İşletme Giriş Bilgileri\n──────────────────────\nE-posta: ${createdCredentials.email}\nŞifre: ${createdCredentials.password}\n\nGiriş adresi: ${window.location.origin}/giris`;
    navigator.clipboard.writeText(text);
    toast.success('Panoya kopyalandı');
  };

  const handleClose = () => {
    onClose();
    reset();
  };

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title={createdCredentials ? '✅ Mekan Oluşturuldu' : 'Yeni Mekan Oluştur'}
      size="md"
      footer={
        createdCredentials ? (
          <Button onClick={handleClose} className="bg-gradient-to-r from-orange-500 to-red-600">
            Tamam
          </Button>
        ) : (
          <>
            <button
              onClick={handleClose}
              disabled={saving}
              className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-100 disabled:opacity-50"
            >
              İptal
            </button>
            <Button
              onClick={handleSave}
              loading={saving}
              className="bg-gradient-to-r from-orange-500 to-red-600"
            >
              Mekanı Oluştur
            </Button>
          </>
        )
      }
    >
      {createdCredentials ? (
        // ─── Başarı ekranı: credential'ları göster ───
        <div className="space-y-4">
          <div className="text-sm text-slate-600">
            {createdCredentials.isNewUser
              ? 'İşletmeci için yeni bir hesap oluşturuldu. Aşağıdaki giriş bilgilerini işletme sahibine ilet.'
              : 'Bu e-posta ile kayıtlı kullanıcı vardı. Şifresi güncellendi ve mekan yöneticisi olarak atandı.'}
          </div>

          <div className="bg-gradient-to-br from-orange-50 to-amber-50 border-2 border-orange-200 rounded-2xl p-4 space-y-3">
            <div>
              <div className="text-xs font-bold text-orange-800 uppercase tracking-wide mb-1">E-posta</div>
              <div className="font-mono text-sm text-slate-900 bg-white rounded-lg px-3 py-2 border border-orange-200 select-all">
                {createdCredentials.email}
              </div>
            </div>
            <div>
              <div className="text-xs font-bold text-orange-800 uppercase tracking-wide mb-1">Şifre</div>
              <div className="font-mono text-sm text-slate-900 bg-white rounded-lg px-3 py-2 border border-orange-200 select-all">
                {createdCredentials.password}
              </div>
            </div>
          </div>

          <button
            onClick={handleCopyCredentials}
            className="w-full py-3 rounded-xl bg-slate-900 text-white font-semibold hover:bg-slate-800 transition-colors"
          >
            📋 Giriş Bilgilerini Panoya Kopyala
          </button>

          <div className="text-xs text-slate-500 bg-slate-50 rounded-lg p-3">
            💡 İşletmeci, <strong>{window.location.origin}/giris</strong> adresinden
            bu e-posta ve şifre ile giriş yapabilir. İlk girişten sonra şifresini değiştirebilir.
          </div>
        </div>
      ) : (
        // ─── Form ekranı ───
        <div className="space-y-4">
          <div className="text-xs text-slate-500 bg-blue-50 border border-blue-200 rounded-lg p-3">
            Bu mekan için otomatik olarak bir işletme yöneticisi hesabı oluşturulacak. Giriş bilgileri sonraki ekranda gösterilecek.
          </div>

          <Input
            label="Mekan Adı *"
            value={form.name}
            onChange={(e) => handleNameChange(e.target.value)}
            placeholder="Örn: Antep Kebap Evi"
            autoFocus
          />
          <Input
            label="URL Slug *"
            value={form.slug}
            onChange={(e) => setForm({ ...form, slug: slugify(e.target.value) })}
            placeholder="antep-kebap-evi"
            hint={`Müşteri URL: ${window.location.origin}/m/${form.slug || 'slug'}`}
          />

          <div className="border-t border-slate-200 pt-4">
            <h4 className="text-sm font-bold text-slate-700 mb-3">İşletmeci Bilgileri</h4>
            <div className="space-y-3">
              <Input
                label="İşletmeci Adı (opsiyonel)"
                value={form.ownerDisplayName}
                onChange={(e) => setForm({ ...form, ownerDisplayName: e.target.value })}
                placeholder="Ahmet Usta"
              />
              <Input
                label="E-posta *"
                type="email"
                value={form.ownerEmail}
                onChange={(e) => setForm({ ...form, ownerEmail: e.target.value })}
                placeholder="ahmet@kebap.com"
                hint="İşletmeci bu e-posta ile giriş yapacak"
              />
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Şifre *</label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={form.ownerPassword}
                    onChange={(e) => setForm({ ...form, ownerPassword: e.target.value })}
                    placeholder="En az 6 karakter"
                    className="flex-1 px-4 py-3 rounded-xl border border-slate-200 text-sm font-mono focus:outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
                  />
                  <button
                    type="button"
                    onClick={generatePassword}
                    className="px-3 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold whitespace-nowrap"
                  >
                    Otomatik
                  </button>
                </div>
                <p className="text-xs text-slate-500 mt-1">Bu şifre işletmeciye iletilecek</p>
              </div>
            </div>
          </div>

          <div className="border-t border-slate-200 pt-4">
            <h4 className="text-sm font-bold text-slate-700 mb-3">Ek Bilgiler (Opsiyonel)</h4>
            <div className="space-y-3">
              <Input
                label="Kısa Tanıtım"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Gaziantep'in en güzel kebabı"
              />
              <Textarea
                label="Karşılama Metni"
                value={form.welcomeText}
                onChange={(e) => setForm({ ...form, welcomeText: e.target.value })}
                placeholder="Mekanımıza hoş geldiniz..."
                rows={2}
              />
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Plan</label>
                <select
                  value={form.plan}
                  onChange={(e) => setForm({ ...form, plan: e.target.value })}
                  className="input-field"
                >
                  <option value="free">Ücretsiz (Deneme)</option>
                  <option value="basic">Temel (Aylık)</option>
                  <option value="pro">Pro (Aylık)</option>
                  <option value="annual">Yıllık</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
}
