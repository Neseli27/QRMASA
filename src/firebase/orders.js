import { collection, doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { auth, db, firebaseConfigurationError } from './config';

function valueOf(data, keys, fallback = undefined) {
  for (const key of keys) {
    if (data?.[key] !== undefined && data?.[key] !== null) return data[key];
  }
  return fallback;
}

function isProductAvailable(data) {
  const active = valueOf(data, ['aktif', 'active', 'satista'], true) !== false;
  const soldOut = valueOf(data, ['tukendi', 'soldOut'], false) === true;
  return active && !soldOut;
}

export async function submitCustomerOrder({
  businessId,
  tableId,
  tableName,
  sessionId,
  cart,
  customerNote = '',
}) {
  if (firebaseConfigurationError || !db || !auth) {
    throw new Error(firebaseConfigurationError || 'Firebase bağlantısı kurulamadı.');
  }

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
