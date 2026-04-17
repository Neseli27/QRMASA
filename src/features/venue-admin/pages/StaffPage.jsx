import { useEffect, useState } from 'react';
import {
  collection, onSnapshot, query, where, doc, setDoc, serverTimestamp
} from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import {
  Users, UserPlus, Trash2, Mail, UserX, Shield
} from 'lucide-react';
import toast from 'react-hot-toast';
import { db, functions } from '../../../lib/firebase';
import { collections } from '../../../lib/paths';
import { useAuth } from '../../../contexts/AuthContext';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Modal, ConfirmDialog } from '../../../components/ui/Modal';
import { Card } from '../../../components/ui/Card';
import { EmptyState, LoadingScreen } from '../../../components/ui/StateScreens';
import { relativeTime, cn } from '../../../lib/utils';

export default function StaffPage() {
  const { venueId, user: currentUser } = useAuth();
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(null);

  useEffect(() => {
    if (!venueId) return;
    const q = query(
      collection(db, collections.users),
      where('venueId', '==', venueId)
    );
    const unsub = onSnapshot(q, (snap) => {
      const list = [];
      snap.forEach((d) => list.push({ id: d.id, ...d.data() }));
      // Garson ve yönetici rollerini göster
      setStaff(list.filter(u => ['venue_admin', 'waiter'].includes(u.role)));
      setLoading(false);
    });
    return () => unsub();
  }, [venueId]);

  const handleRemove = async (user) => {
    try {
      // Rolü kaldır (Cloud Function ile) - admin SDK lazım
      const assign = httpsCallable(functions, 'assignUserRole');
      await assign({ targetUid: user.id, role: 'none', venueId: null });
      toast.success('Personel çıkarıldı');
    } catch (e) {
      toast.error('Çıkarılamadı: ' + (e.message || e));
    }
  };

  if (loading) return <LoadingScreen message="Personel yükleniyor..." />;

  const admins = staff.filter(s => s.role === 'venue_admin');
  const waiters = staff.filter(s => s.role === 'waiter');

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-display text-3xl font-bold text-slate-900">Personel</h1>
          <p className="text-sm text-slate-500 mt-1">
            {admins.length} yönetici · {waiters.length} garson
          </p>
        </div>
        <Button
          icon={UserPlus}
          onClick={() => setInviteOpen(true)}
          className="bg-gradient-to-r from-orange-500 to-red-600"
        >
          Personel Davet Et
        </Button>
      </div>

      {staff.length === 0 ? (
        <Card>
          <EmptyState
            icon={Users}
            title="Henüz personel yok"
            description="Yöneticiler ve garsonları e-posta ile davet edebilirsin."
          />
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Yöneticiler */}
          {admins.length > 0 && (
            <div>
              <h3 className="font-semibold text-sm text-slate-700 mb-3 flex items-center gap-2">
                <Shield className="w-4 h-4 text-orange-500" />
                Yöneticiler ({admins.length})
              </h3>
              <Card padding="none">
                <div className="divide-y divide-slate-100">
                  {admins.map((user) => (
                    <StaffRow
                      key={user.id}
                      user={user}
                      currentUserId={currentUser?.uid}
                      onRemove={() => setConfirmRemove(user)}
                    />
                  ))}
                </div>
              </Card>
            </div>
          )}

          {/* Garsonlar */}
          {waiters.length > 0 && (
            <div>
              <h3 className="font-semibold text-sm text-slate-700 mb-3 flex items-center gap-2">
                <Users className="w-4 h-4 text-blue-500" />
                Garsonlar ({waiters.length})
              </h3>
              <Card padding="none">
                <div className="divide-y divide-slate-100">
                  {waiters.map((user) => (
                    <StaffRow
                      key={user.id}
                      user={user}
                      currentUserId={currentUser?.uid}
                      onRemove={() => setConfirmRemove(user)}
                    />
                  ))}
                </div>
              </Card>
            </div>
          )}
        </div>
      )}

      <InviteStaffModal
        open={inviteOpen}
        onClose={() => setInviteOpen(false)}
        venueId={venueId}
      />

      <ConfirmDialog
        open={!!confirmRemove}
        onClose={() => setConfirmRemove(null)}
        onConfirm={async () => {
          await handleRemove(confirmRemove);
          setConfirmRemove(null);
        }}
        title="Personeli Çıkar"
        message={
          confirmRemove
            ? `${confirmRemove.displayName || confirmRemove.email} kullanıcısı bu mekandan çıkarılacak. Emin misin?`
            : ''
        }
        confirmText="Çıkar"
        danger
      />
    </div>
  );
}

// ═══════════════════════════════════════════════════
// Personel Satırı
// ═══════════════════════════════════════════════════
function StaffRow({ user, currentUserId, onRemove }) {
  const isMe = user.id === currentUserId;
  const initials = (user.displayName || user.email || '?')[0].toUpperCase();

  return (
    <div className="px-5 py-3 flex items-center gap-3 hover:bg-slate-50 transition-colors">
      <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 font-semibold text-sm flex-shrink-0">
        {initials}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-slate-900 text-sm truncate">
            {user.displayName || user.email}
          </span>
          {isMe && (
            <span className="pill bg-emerald-100 text-emerald-700 text-xs">Sen</span>
          )}
        </div>
        <div className="text-xs text-slate-500 truncate">{user.email}</div>
      </div>

      {!isMe && (
        <button
          onClick={onRemove}
          className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-red-600 hover:bg-red-50"
          title="Çıkar"
        >
          <UserX className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════
// Davet Modal
// ═══════════════════════════════════════════════════
function InviteStaffModal({ open, onClose, venueId }) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('waiter');
  const [saving, setSaving] = useState(false);

  const handleInvite = async () => {
    if (!email.trim()) {
      toast.error('E-posta gerekli');
      return;
    }

    setSaving(true);
    try {
      // E-postadan UID bul
      const q = query(
        collection(db, collections.users),
        where('email', '==', email.trim().toLowerCase())
      );
      // onSnapshot yerine getDocs kullanıyoruz (tek seferlik okuma)
      const { getDocs } = await import('firebase/firestore');
      const snap = await getDocs(q);

      if (snap.empty) {
        toast.error(
          'Bu e-posta ile kayıtlı kullanıcı bulunamadı. Önce bu kişi /giris sayfasından giriş yapmalı.',
          { duration: 6000 }
        );
        setSaving(false);
        return;
      }

      const targetUid = snap.docs[0].id;
      const assign = httpsCallable(functions, 'assignUserRole');
      await assign({ targetUid, role, venueId });

      toast.success(`${email} kullanıcısına ${role === 'venue_admin' ? 'yönetici' : 'garson'} rolü verildi`);
      onClose();
      setEmail('');
      setRole('waiter');
    } catch (e) {
      console.error(e);
      toast.error('Davet başarısız: ' + (e.message || e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Personel Davet Et"
      footer={
        <>
          <button
            onClick={onClose}
            disabled={saving}
            className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-100 disabled:opacity-50"
          >
            İptal
          </button>
          <Button
            onClick={handleInvite}
            loading={saving}
            className="bg-gradient-to-r from-orange-500 to-red-600"
          >
            Davet Et
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-800">
          <strong>Önemli:</strong> Bu kişi önce /giris sayfasından Google veya E-posta ile
          sisteme giriş yapmış olmalı. Sonra buradan rol atanır, otomatik yönlendirilir.
        </div>

        <Input
          label="Personelin E-postası"
          icon={Mail}
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="garson@mail.com"
          autoFocus
        />

        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1.5">Rol</label>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="input-field"
          >
            <option value="waiter">Garson</option>
            <option value="venue_admin">Yönetici (diğer yönetici)</option>
          </select>
        </div>
      </div>
    </Modal>
  );
}
