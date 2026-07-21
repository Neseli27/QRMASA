import { doc, getDoc } from 'firebase/firestore';
import { auth, db, firebaseConfigurationError } from './config';

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

  const [businessSnapshot, staffSnapshot] = await Promise.all([
    getDoc(doc(db, 'businesses', normalizedBusinessId)),
    getDoc(doc(db, 'businesses', normalizedBusinessId, 'staff', user.uid)),
  ]);

  if (!businessSnapshot.exists()) {
    throw new Error('Bu kodla kayıtlı bir işletme bulunamadı.');
  }

  const business = { id: businessSnapshot.id, ...businessSnapshot.data() };
  const ownerUid = business?.iletisim?.sahipUid;
  const isOwner = ownerUid === user.uid;
  const staff = staffSnapshot.exists()
    ? { id: staffSnapshot.id, ...staffSnapshot.data() }
    : null;

  if (!staff && !isOwner) {
    throw new Error('Bu kullanıcı işletmenin personel listesinde kayıtlı değil.');
  }

  // Mevcut Firestore sipariş okuma kuralı staff belgesi arıyor.
  if (!staff) {
    throw new Error('İşletme sahibi hesabı için staff kaydı eksik. Firebase staff koleksiyonuna kullanıcı UID kaydı eklenmelidir.');
  }

  if (staff.aktif === false || staff.active === false) {
    throw new Error('Personel hesabınız pasif durumda.');
  }

  return {
    business,
    staff,
    role: staff.rol || staff.role || 'waiter',
    permissions: staff.yetkiler || staff.permissions || {},
  };
}
