import { doc, getDoc } from 'firebase/firestore';
import { auth, db, firebaseConfigurationError } from './config';
import { permissionsForRole } from '../utils/staffDraft';

function requireFirebase() {
  if (firebaseConfigurationError || !db || !auth) {
    throw new Error(firebaseConfigurationError || 'Firebase bağlantısı kurulamadı.');
  }
}

export async function getStaffAccess(businessId, user = auth?.currentUser) {
  requireFirebase();

  const normalizedBusinessId = String(businessId || '').trim();
  if (!normalizedBusinessId) throw new Error('İşletme kodunu girin.');
  if (!user || user.isAnonymous) throw new Error('Personel oturumu bulunamadı.');

  // Önce işletme kaydı okunur. İşletme sahibi, staff belgesi olmasa bile
  // yönetim paneline erişebilmelidir.
  const businessSnapshot = await getDoc(doc(db, 'businesses', normalizedBusinessId));

  if (!businessSnapshot.exists()) {
    throw new Error('Bu kodla kayıtlı bir işletme bulunamadı.');
  }

  const business = { id: businessSnapshot.id, ...businessSnapshot.data() };
  const ownerUid = business?.iletisim?.sahipUid || business?.ownerUid || business?.sahipUid || business?.owner?.uid;
  const isOwner = ownerUid === user.uid;

  if (isOwner) {
    const ownerStaffSnapshot = await getDoc(doc(db, 'businesses', normalizedBusinessId, 'staff', user.uid)).catch(() => null);
    const ownerStaff = ownerStaffSnapshot?.exists()
      ? { id: ownerStaffSnapshot.id, ...ownerStaffSnapshot.data() }
      : {
          id: user.uid,
          ad: user.displayName || business?.owner?.name || 'İşletme sahibi',
          email: user.email || business?.owner?.email || '',
          rol: 'owner',
          aktif: true,
          yetkiler: permissionsForRole('owner'),
        };

    return {
      business,
      staff: ownerStaff,
      role: 'owner',
      permissions: ownerStaff.yetkiler || ownerStaff.permissions || permissionsForRole('owner'),
      isOwner: true,
    };
  }

  const staffSnapshot = await getDoc(doc(db, 'businesses', normalizedBusinessId, 'staff', user.uid));
  const staff = staffSnapshot.exists()
    ? { id: staffSnapshot.id, ...staffSnapshot.data() }
    : null;

  if (!staff) {
    throw new Error('Bu kullanıcı işletmenin personel listesinde kayıtlı değil.');
  }

  if (staff.aktif === false || staff.active === false) {
    throw new Error('Personel hesabınız pasif durumda.');
  }

  return {
    business,
    staff,
    role: staff.rol || staff.role || 'waiter',
    permissions: staff.yetkiler || staff.permissions || {},
    isOwner: false,
  };
}
