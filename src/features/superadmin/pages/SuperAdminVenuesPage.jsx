import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  collection, onSnapshot, orderBy, query, doc, setDoc, deleteDoc,
  serverTimestamp, writeBatch
} from 'firebase/firestore';
import {
  Building2, Plus, Search, Pause, Play, Trash2, Settings,
  ExternalLink, MoreVertical, Crown
} from 'lucide-react';
import toast from 'react-hot-toast';
import { db } from '../../../lib/firebase';
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
// Yeni Mekan Modal
// ═══════════════════════════════════════════════════
function NewVenueModal({ open, onClose }) {
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [ownerEmail, setOwnerEmail] = useState('');
  const [welcomeText, setWelcomeText] = useState('');
  const [plan, setPlan] = useState('free');
  const [saving, setSaving] = useState(false);

  const reset = () => {
    setName(''); setSlug(''); setOwnerEmail(''); setWelcomeText(''); setPlan('free');
  };

  const handleNameChange = (v) => {
    setName(v);
    setSlug(slugify(v));
  };

  const handleSave = async () => {
    if (!name.trim() || !slug.trim()) {
      toast.error('Mekan adı ve slug gerekli');
      return;
    }

    setSaving(true);
    try {
      const venueId = `v_${shortId(10).toLowerCase()}`;

      await setDoc(doc(db, collections.venues, venueId), {
        branding: {
          name: name.trim(),
          welcomeText: welcomeText.trim() || null,
          primaryColor: '#f97316',
          softColor: '#fff7ed',
          accentColor: '#eab308'
        },
        slug: slug.trim(),
        ownerEmail: ownerEmail.trim() || null,
        published: false,
        suspended: false,
        plan,
        features: {
          multiUserTable: true,
          separateOrders: false,
          callWaiter: true,
          productNotes: true,
          tipping: false,
          customerRegister: 'optional',
          loyalty: { enabled: false }
        },
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      await setDoc(doc(db, collections.slugIndex, slug.trim()), {
        venueId,
        createdAt: serverTimestamp()
      });

      toast.success('Mekan oluşturuldu. İşletme yöneticisini "Yönet" sayfasından ata.');
      onClose();
      reset();
    } catch (e) {
      console.error(e);
      toast.error('Oluşturulamadı: ' + e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={() => { onClose(); reset(); }}
      title="Yeni Mekan Oluştur"
      footer={
        <>
          <button
            onClick={() => { onClose(); reset(); }}
            disabled={saving}
            className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-100 disabled:opacity-50"
          >
            İptal
          </button>
          <Button onClick={handleSave} loading={saving} className="bg-gradient-to-r from-orange-500 to-red-600">
            Oluştur
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Input
          label="Mekan Adı *"
          value={name}
          onChange={(e) => handleNameChange(e.target.value)}
          placeholder="Örn: Antep Kebap Evi"
          autoFocus
        />
        <Input
          label="URL Slug *"
          value={slug}
          onChange={(e) => setSlug(slugify(e.target.value))}
          placeholder="antep-kebap-evi"
          hint="Müşteri URL'si: qrmasa.com/m/[slug]"
        />
        <Input
          label="İşletme Sahibinin E-postası"
          type="email"
          value={ownerEmail}
          onChange={(e) => setOwnerEmail(e.target.value)}
          placeholder="ornek@mail.com"
          hint="Mekan oluşturulduktan sonra 'Yönet' sayfasından bu kullanıcıya venue_admin rolü atayabilirsin"
        />
        <Textarea
          label="Karşılama Metni"
          value={welcomeText}
          onChange={(e) => setWelcomeText(e.target.value)}
          placeholder="Mekanımıza hoş geldiniz..."
          rows={2}
        />
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1.5">Plan</label>
          <select
            value={plan}
            onChange={(e) => setPlan(e.target.value)}
            className="input-field"
          >
            <option value="free">Ücretsiz (Deneme)</option>
            <option value="basic">Temel (Aylık)</option>
            <option value="pro">Pro (Aylık)</option>
            <option value="annual">Yıllık</option>
          </select>
        </div>
      </div>
    </Modal>
  );
}
