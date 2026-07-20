import { collection, doc, getDoc, getDocs, orderBy, query } from 'firebase/firestore';
import { db, firebaseConfigurationError } from './config';

function valueOf(data, keys, fallback = '') {
  for (const key of keys) {
    if (data?.[key] !== undefined && data?.[key] !== null) return data[key];
  }
  return fallback;
}

function normalizeCategory(snapshot) {
  const data = snapshot.data();
  return {
    id: snapshot.id,
    name: valueOf(data, ['ad', 'name', 'title'], 'Kategori'),
    imageUrl: valueOf(data, ['gorselUrl', 'imageUrl', 'image', 'fotoUrl']),
    sortOrder: Number(valueOf(data, ['sira', 'sortOrder', 'order'], 999)),
    active: valueOf(data, ['aktif', 'active'], true) !== false,
  };
}

function normalizeProduct(snapshot) {
  const data = snapshot.data();
  return {
    id: snapshot.id,
    name: valueOf(data, ['ad', 'name', 'title'], 'Ürün'),
    description: valueOf(data, ['aciklama', 'description'], ''),
    imageUrl: valueOf(data, ['gorselUrl', 'imageUrl', 'image', 'fotoUrl']),
    price: Number(valueOf(data, ['fiyat', 'price', 'salePrice'], 0)),
    categoryId: String(valueOf(data, ['kategoriId', 'categoryId', 'category'], 'diger')),
    active: valueOf(data, ['aktif', 'active', 'satista'], true) !== false,
    soldOut: valueOf(data, ['tukendi', 'soldOut'], false) === true,
  };
}

async function readCollection(pathParts, normalizer) {
  const ref = collection(db, ...pathParts);
  const snapshot = await getDocs(ref);
  return snapshot.docs.map(normalizer);
}

export async function getCustomerMenu(businessId, tableId) {
  if (firebaseConfigurationError || !db) {
    throw new Error(firebaseConfigurationError || 'Firestore başlatılamadı.');
  }

  let business = null;
  let table = null;

  try {
    const businessSnapshot = await getDoc(doc(db, 'businesses', businessId));
    if (businessSnapshot.exists()) business = { id: businessSnapshot.id, ...businessSnapshot.data() };
  } catch {
    business = null;
  }

  try {
    const tableSnapshot = await getDoc(doc(db, 'businesses', businessId, 'tables', String(tableId)));
    if (tableSnapshot.exists()) table = { id: tableSnapshot.id, ...tableSnapshot.data() };
  } catch {
    table = null;
  }

  const [categories, products] = await Promise.all([
    readCollection(['businesses', businessId, 'categories'], normalizeCategory),
    readCollection(['businesses', businessId, 'menu'], normalizeProduct),
  ]);

  return {
    business,
    table,
    categories: categories.filter((item) => item.active).sort((a, b) => a.sortOrder - b.sortOrder),
    products: products.filter((item) => item.active),
  };
}
