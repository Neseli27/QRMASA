import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  doc, onSnapshot, setDoc, collection, query, where,
  onSnapshot as onSnap, getDocs, serverTimestamp
} from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import {
  ArrowLeft, Building2, Crown, Users, Settings, Bell,
  ExternalLink, UserPlus, Mail, Check, Loader2
} from 'lucide-react';
import toast from 'react-hot-toast';
import { db, functions } from '../../../lib/firebase';
import { collections, venueCol } from '../../../lib/paths';
import { relativeTime } from '../../../lib/utils';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Modal } from '../../../components/ui/Modal';
import { LoadingScreen, ErrorScreen } from '../../../components/ui/StateScreens';

export default function SuperAdminVenueDetailPage() {
  const { venueId } = useParams();
  const [venue, setVenue] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showLoading, setShowLoading] = useState(false); // 150ms sonra spinner göster
  const [error, setError] = useState(null);

  // Özet sayaçlar (sadece sayı, içerik değil)
  const [stats, setStats] = useState({ tables: 0, menuItems: 0, admins: 0 });

  // 150ms sonra hala loading ise spinner göster (kısa yüklemelerde flash önle)
  useEffect(() => {
    if (!loading) {
      setShowLoading(false);
      return;
    }
    const timer = setTimeout(() => setShowLoading(true), 150);
    return () => clearTimeout(timer);
  }, [loading]);

  // Mekan dokümanını dinle
  useEffect(() => {
    const ref = doc(db, collections.venues, venueId);
    const unsub = onSnapshot(
      ref,
      (snap) => {
        if (!snap.exists()) {
          setError('Mekan bulunamadı');
          setLoading(false);
          return;
        }
        setVenue({ id: snap.id, ...snap.data() });
        setLoading(false);
      },
      (err) => {
        setError(err.message);
        setLoading(false);
      }
    );
    return () => unsub();
  }, [venueId]);

  // Özet sayaçlar
  useEffect(() => {
    const unsubs = [];

    unsubs.push(onSnap(collection(db, venueCol(venueId, 'tables')), (snap) => {
      setStats(s => ({ ...s, tables: snap.size }));
    }));

    unsubs.push(onSnap(collection(db, venueCol(venueId, 'menu_items')), (snap) => {
      setStats(s => ({ ...s, menuItems: snap.size }));
    }));

    // Bu mekana atanmış venue_admin sayısı
    const adminsQ = query(
      collection(db, collections.users),
      where('venueId', '==', venueId),
      where('role', '==', 'venue_admin')
    );
    unsubs.push(onSnap(adminsQ, (snap) => {
      setStats(s => ({ ...s, admins: snap.size }));
    }));

    return () => unsubs.forEach(u => u());
  }, [venueId]);

  if (loading && showLoading) return <LoadingScreen theme="dark" message="Mekan yükleniyor..." />;
  if (loading) return null; // 150ms içinde gelirse hiç göstermez (flash önle)
  if (error) return <ErrorScreen theme="dark" title="Hata" message={error} />;

  const statusPill = venue.suspended
    ? { label: 'Askıda', color: 'bg-red-500/20 text-red-400' }
    : venue.published
      ? { label: 'Yayında', color: 'bg-emerald-500/20 text-emerald-400' }
      : { label: 'Taslak', color: 'bg-amber-500/20 text-amber-400' };

  return (
    <div className="space-y-6">
      {/* Geri dön + başlık */}
      <div>
        <Link
          to="/superadmin/mekanlar"
          className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-200 mb-3"
        >
          <ArrowLeft className="w-4 h-4" />
          Mekanlar
        </Link>

        <div className="flex items-start gap-4 flex-wrap">
          {venue.branding?.logo ? (
            <img src={venue.branding.logo} alt="" className="w-16 h-16 rounded-2xl object-cover" />
          ) : (
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center"
              style={{ backgroundColor: venue.branding?.primaryColor || '#f97316' }}
            >
              <Building2 className="w-7 h-7 text-white" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <h1 className="font-display text-3xl font-bold text-white">
                {venue.branding?.name || venue.id}
              </h1>
              <span className={`pill ${statusPill.color}`}>{statusPill.label}</span>
            </div>
            <div className="flex items-center gap-3 text-sm text-slate-500 flex-wrap">
              <span className="font-mono">/m/{venue.slug}</span>
              {venue.ownerEmail && <span>{venue.ownerEmail}</span>}
              {venue.createdAt && <span>Oluşturuldu: {relativeTime(venue.createdAt)}</span>}
            </div>
          </div>
          <a
            href={`/m/${venue.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center gap-1.5"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            Müşteri Görünümü
          </a>
        </div>
      </div>

      {/* Özet sayaçlar */}
      <div className="grid grid-cols-3 gap-4">
        <DarkStatCard icon={Building2} label="Masa" value={stats.tables} />
        <DarkStatCard icon={Settings} label="Ürün" value={stats.menuItems} />
        <DarkStatCard icon={Users} label="Yönetici" value={stats.admins} />
      </div>

      {/* Plan & Lisans */}
      <PlanSection venue={venue} />

      {/* Kullanıcı Yönetimi */}
      <UserManagementSection venue={venue} />

      {/* Özellikler (Feature Toggles) */}
      <FeaturesSection venue={venue} />
    </div>
  );
}

function DarkStatCard({ icon: Icon, label, value }) {
  return (
    <div className="bg-slate-900 rounded-2xl border border-slate-800 p-5">
      <div className="w-10 h-10 rounded-xl bg-orange-500/20 flex items-center justify-center mb-3">
        <Icon className="w-5 h-5 text-orange-400" />
      </div>
      <div className="text-2xl font-display font-bold text-slate-100">{value}</div>
      <div className="text-xs text-slate-500 mt-0.5">{label}</div>
    </div>
  );
}

// ═══════════════════════════════════════════════════
// Plan Section
// ═══════════════════════════════════════════════════
function PlanSection({ venue }) {
  const [plan, setPlan] = useState(venue.plan || 'free');
  const [licenseExpiry, setLicenseExpiry] = useState(
    venue.licenseExpiry ? new Date(venue.licenseExpiry.toDate()).toISOString().split('T')[0] : ''
  );
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const update = {
        plan,
        updatedAt: serverTimestamp()
      };
      if (licenseExpiry) {
        update.licenseExpiry = new Date(licenseExpiry);
      } else {
        update.licenseExpiry = null;
      }
      await setDoc(doc(db, collections.venues, venue.id), update, { merge: true });
      toast.success('Plan güncellendi');
    } catch (e) {
      toast.error('Güncellenemedi: ' + e.message);
    } finally {
      setSaving(false);
    }
  };

  const changed = plan !== (venue.plan || 'free') || licenseExpiry !== (
    venue.licenseExpiry ? new Date(venue.licenseExpiry.toDate()).toISOString().split('T')[0] : ''
  );

  return (
    <div className="bg-slate-900 rounded-2xl border border-slate-800 p-6">
      <div className="flex items-center gap-2 mb-4">
        <Crown className="w-5 h-5 text-orange-400" />
        <h3 className="font-display text-lg font-bold text-slate-100">Plan & Lisans</h3>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-semibold text-slate-300 mb-1.5">Plan</label>
          <select
            value={plan}
            onChange={(e) => setPlan(e.target.value)}
            className="w-full px-4 py-3 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
          >
            <option value="free">Ücretsiz (Deneme)</option>
            <option value="basic">Temel (Aylık)</option>
            <option value="pro">Pro (Aylık)</option>
            <option value="annual">Yıllık</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-semibold text-slate-300 mb-1.5">Lisans Bitiş Tarihi</label>
          <input
            type="date"
            value={licenseExpiry}
            onChange={(e) => setLicenseExpiry(e.target.value)}
            className="w-full px-4 py-3 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
          />
        </div>
      </div>

      {changed && (
        <div className="mt-4 flex items-center justify-end">
          <Button
            onClick={handleSave}
            loading={saving}
            size="sm"
            className="bg-gradient-to-r from-orange-500 to-red-600"
          >
            Kaydet
          </Button>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════
// User Management
// ═══════════════════════════════════════════════════
function UserManagementSection({ venue }) {
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [assignModalOpen, setAssignModalOpen] = useState(false);

  useEffect(() => {
    const q = query(
      collection(db, collections.users),
      where('venueId', '==', venue.id)
    );
    const unsub = onSnapshot(q, (snap) => {
      const list = [];
      snap.forEach((d) => list.push({ id: d.id, ...d.data() }));
      setAdmins(list);
      setLoading(false);
    });
    return () => unsub();
  }, [venue.id]);

  return (
    <div className="bg-slate-900 rounded-2xl border border-slate-800 p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-orange-400" />
          <h3 className="font-display text-lg font-bold text-slate-100">Kullanıcılar</h3>
        </div>
        <Button
          size="sm"
          icon={UserPlus}
          onClick={() => setAssignModalOpen(true)}
          className="bg-slate-800 hover:bg-slate-700"
          style={{ backgroundColor: undefined }}
        >
          Kullanıcı Ata
        </Button>
      </div>

      {loading ? (
        <div className="text-center py-6 text-slate-500 text-sm">Yükleniyor...</div>
      ) : admins.length === 0 ? (
        <div className="text-center py-6 text-sm text-slate-500">
          Henüz bu mekana atanmış kullanıcı yok. {venue.ownerEmail && (
            <span className="block mt-1 text-slate-400">İşletme sahibi: {venue.ownerEmail}</span>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {admins.map((a) => (
            <div key={a.id} className="flex items-center gap-3 p-3 rounded-xl bg-slate-800/50 border border-slate-800">
              <div className="w-9 h-9 rounded-full bg-slate-700 flex items-center justify-center text-slate-300 font-semibold text-sm">
                {(a.displayName || a.email || '?')[0].toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-slate-200 truncate">
                  {a.displayName || a.email}
                </div>
                <div className="text-xs text-slate-500 truncate">{a.email}</div>
              </div>
              <span className="pill bg-orange-500/20 text-orange-400 text-xs">
                {a.role === 'venue_admin' ? 'Yönetici' : a.role === 'waiter' ? 'Garson' : a.role}
              </span>
            </div>
          ))}
        </div>
      )}

      <AssignUserModal
        open={assignModalOpen}
        onClose={() => setAssignModalOpen(false)}
        venueId={venue.id}
      />
    </div>
  );
}

function AssignUserModal({ open, onClose, venueId }) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('venue_admin');
  const [saving, setSaving] = useState(false);

  const handleAssign = async () => {
    if (!email.trim()) {
      toast.error('E-posta gerekli');
      return;
    }

    setSaving(true);
    try {
      // E-postadan UID bul — Authentication'da kayıtlı olmalı
      // Önce kullanıcı var mı kontrol et (users koleksiyonunda)
      const q = query(
        collection(db, collections.users),
        where('email', '==', email.trim())
      );
      const snap = await getDocs(q);

      if (snap.empty) {
        toast.error(
          'Bu e-posta ile kayıtlı kullanıcı bulunamadı. Önce kullanıcı Firebase Authentication\'da oluşturulmalı.',
          { duration: 6000 }
        );
        setSaving(false);
        return;
      }

      const targetUid = snap.docs[0].id;

      // Cloud Function ile rol ata (güvenli)
      const assign = httpsCallable(functions, 'assignUserRole');
      await assign({ targetUid, role, venueId });

      toast.success(`${email} kullanıcısına ${role} rolü atandı`);
      onClose();
      setEmail('');
    } catch (e) {
      console.error(e);
      toast.error('Atama başarısız: ' + (e.message || e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Kullanıcı Ata"
      footer={
        <>
          <button
            onClick={onClose}
            disabled={saving}
            className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-100 disabled:opacity-50"
          >
            İptal
          </button>
          <Button onClick={handleAssign} loading={saving} className="bg-gradient-to-r from-orange-500 to-red-600">
            Ata
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-800">
          <strong>Not:</strong> Kullanıcı önce Firebase Authentication'da kayıtlı olmalı.
          Kullanıcı /giris sayfasından e-posta+şifre veya Google ile giriş yaptığında
          otomatik kullanıcı dokümanı oluşur. Sonra buradan rol atayabilirsin.
        </div>

        <Input
          label="Kullanıcı E-postası"
          icon={Mail}
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="ornek@mail.com"
          autoFocus
        />

        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1.5">Rol</label>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="input-field"
          >
            <option value="venue_admin">İşletme Yöneticisi</option>
            <option value="waiter">Garson</option>
          </select>
        </div>
      </div>
    </Modal>
  );
}

// ═══════════════════════════════════════════════════
// Features
// ═══════════════════════════════════════════════════
const FEATURE_OPTIONS = [
  { key: 'multiUserTable', label: 'Çoklu Kullanıcı Masa', description: 'Aynı masadaki birden fazla müşteri sipariş verebilir' },
  { key: 'separateOrders', label: 'Ayrı Sipariş Görünümü', description: 'Garson kim ne istedi görebilir (vs. masa toplam)' },
  { key: 'callWaiter', label: 'Garson Çağırma', description: 'Müşteri garson çağırma butonu görsün' },
  { key: 'productNotes', label: 'Ürün Notları', description: 'Müşteri ürüne özel not yazabilir' },
  { key: 'tipping', label: 'Bahşiş', description: 'Sipariş sonunda bahşiş seçeneği' }
];

function FeaturesSection({ venue }) {
  const [features, setFeatures] = useState(venue.features || {});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setFeatures(venue.features || {});
  }, [venue.features]);

  const handleToggle = (key) => {
    setFeatures({ ...features, [key]: !features[key] });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await setDoc(
        doc(db, collections.venues, venue.id),
        { features, updatedAt: serverTimestamp() },
        { merge: true }
      );
      toast.success('Özellikler güncellendi');
    } catch (e) {
      toast.error('Güncellenemedi: ' + e.message);
    } finally {
      setSaving(false);
    }
  };

  const changed = JSON.stringify(features) !== JSON.stringify(venue.features || {});

  return (
    <div className="bg-slate-900 rounded-2xl border border-slate-800 p-6">
      <div className="flex items-center gap-2 mb-4">
        <Settings className="w-5 h-5 text-orange-400" />
        <h3 className="font-display text-lg font-bold text-slate-100">Özellikler</h3>
      </div>

      <div className="space-y-1">
        {FEATURE_OPTIONS.map((opt) => (
          <label
            key={opt.key}
            className="flex items-center gap-4 p-3 rounded-xl hover:bg-slate-800/50 cursor-pointer transition-colors"
          >
            <input
              type="checkbox"
              checked={!!features[opt.key]}
              onChange={() => handleToggle(opt.key)}
              className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-orange-500 focus:ring-orange-500/20"
            />
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold text-slate-200">{opt.label}</div>
              <div className="text-xs text-slate-500 mt-0.5">{opt.description}</div>
            </div>
          </label>
        ))}
      </div>

      {changed && (
        <div className="mt-4 flex items-center justify-end">
          <Button
            onClick={handleSave}
            loading={saving}
            size="sm"
            className="bg-gradient-to-r from-orange-500 to-red-600"
          >
            Kaydet
          </Button>
        </div>
      )}
    </div>
  );
}
