import {
  collection,
  doc,
  getDoc,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import { auth, db, firebaseConfigurationError } from './config';

function valueOf(data, keys, fallback = undefined) {
  for (const key of keys) {
    if (data?.[key] !== undefined && data?.[key] !== null) return data[key];
  }
  return fallback;
}

function requireFirebase() {
  if (firebaseConfigurationError || !db || !auth) {
    throw new Error(firebaseConfigurationError || 'Firebase bağlantısı kurulamadı.');
  }
}

function requireStaffUser() {
  requireFirebase();
  const user = auth.currentUser;
  if (!user || user.isAnonymous) throw new Error('Personel oturumu bulunamadı.');
  return user;
}

function isProductAvailable(data) {
  const active = valueOf(data, ['aktif', 'active', 'satista'], true) !== false;
  const soldOut = valueOf(data, ['tukendi', 'soldOut'], false) === true;
  return active && !soldOut;
}

function normalizeOrder(snapshot) {
  const data = snapshot.data();
  return {
    id: snapshot.id,
    ...data,
    orderNo: data.orderNo || snapshot.id.slice(0, 6).toUpperCase(),
    tableName: data.tableName || data.tableId || '-',
    statusCode: data.statusCode || data.status || 'UNKNOWN',
    items: Array.isArray(data.urunler) ? data.urunler : Array.isArray(data.items) ? data.items : [],
    total: Number(data.toplam ?? data.total ?? 0),
    customerNote: data.musteriNotu || data.customerNote || '',
    createdAtMillis:
      data.createdAt?.toMillis?.() || Number(data.createdAtClient || 0) || Date.now(),
  };
}

export async function submitCustomerOrder({
  businessId,
  tableId,
  tableName,
  sessionId,
  cart,
  customerNote = '',
}) {
  requireFirebase();

  const customer = auth.currentUser;
  if (!customer) throw new Error('Müşteri oturumu bulunamadı. Sayfayı yenileyip tekrar deneyin.');
  if (!businessId || !tableId) throw new Error('İşletme veya masa bilgisi eksik.');
  if (!Array.isArray(cart) || cart.length === 0) throw new Error('Sepetiniz boş.');

  const validatedItems = [];

  for (const cartItem of cart) {
    const productSnapshot = await getDoc(
      doc(db, 'businesses', businessId, 'menu', String(cartItem.id)),
    );

    if (!productSnapshot.exists()) {
      throw new Error(`${cartItem.name || 'Bir ürün'} artık menüde bulunmuyor.`);
    }

    const product = productSnapshot.data();
    if (!isProductAvailable(product)) {
      throw new Error(`${valueOf(product, ['ad', 'name', 'title'], cartItem.name)} şu anda satışta değil.`);
    }

    const quantity = Math.max(1, Math.min(50, Number(cartItem.quantity || 1)));
    const unitPrice = Number(valueOf(product, ['fiyat', 'price', 'salePrice'], 0));
    if (!Number.isFinite(unitPrice) || unitPrice < 0) {
      throw new Error('Ürün fiyatı doğrulanamadı.');
    }

    validatedItems.push({
      productId: productSnapshot.id,
      ad: valueOf(product, ['ad', 'name', 'title'], 'Ürün'),
      birimFiyat: unitPrice,
      adet: quantity,
      toplam: unitPrice * quantity,
      istasyonId: valueOf(product, ['istasyonId', 'stationId'], null),
      not: '',
      durum: 'bekliyor',
    });
  }

  const total = validatedItems.reduce((sum, item) => sum + item.toplam, 0);
  const orderRef = doc(collection(db, 'businesses', businessId, 'orders'));
  const orderNo = orderRef.id.slice(0, 6).toUpperCase();

  await setDoc(orderRef, {
    id: orderRef.id,
    orderNo,
    businessId,
    tableId: String(tableId),
    tableName: String(tableName || tableId),
    sessionId: String(sessionId || ''),
    status: 'garson_onayi_bekliyor',
    statusCode: 'PENDING_WAITER_APPROVAL',
    musteri: {
      id: customer.uid,
      anonim: customer.isAnonymous === true,
    },
    urunler: validatedItems,
    araToplam: total,
    indirim: 0,
    toplam: total,
    musteriNotu: String(customerNote || '').trim().slice(0, 500),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    createdAtClient: Date.now(),
  });

  return {
    id: orderRef.id,
    orderNo,
    total,
    statusCode: 'PENDING_WAITER_APPROVAL',
  };
}

export function subscribeToWaiterOrders(businessId, onOrders, onError) {
  requireStaffUser();
  const normalizedBusinessId = String(businessId || '').trim();
  if (!normalizedBusinessId) throw new Error('İşletme kodu bulunamadı.');

  const ordersQuery = query(
    collection(db, 'businesses', normalizedBusinessId, 'orders'),
    orderBy('createdAt', 'desc'),
    limit(100),
  );

  return onSnapshot(
    ordersQuery,
    (snapshot) => onOrders(snapshot.docs.map(normalizeOrder)),
    (error) => onError?.(error),
  );
}

export async function approveOrder(businessId, orderId) {
  const user = requireStaffUser();
  await updateDoc(doc(db, 'businesses', String(businessId), 'orders', String(orderId)), {
    status: 'onaylandi',
    statusCode: 'APPROVED',
    approvedAt: serverTimestamp(),
    approvedBy: user.uid,
    updatedAt: serverTimestamp(),
  });
}

export async function rejectOrder(businessId, orderId, reason = '') {
  const user = requireStaffUser();
  await updateDoc(doc(db, 'businesses', String(businessId), 'orders', String(orderId)), {
    status: 'reddedildi',
    statusCode: 'REJECTED',
    rejectionReason: String(reason || 'İşletme tarafından reddedildi').trim().slice(0, 300),
    rejectedAt: serverTimestamp(),
    rejectedBy: user.uid,
    updatedAt: serverTimestamp(),
  });
}
