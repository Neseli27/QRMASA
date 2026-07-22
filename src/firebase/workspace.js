import {
  collection,
  doc,
  getDoc,
  getDocs,
  serverTimestamp,
  setDoc,
  writeBatch,
} from 'firebase/firestore';
import { auth, db, firebaseConfigurationError } from './config';
import { loadManagerSetup, saveManagerSetup } from '../utils/managerDraft';
import { loadMenuDraft, saveMenuDraft } from '../utils/menuDraft';
import { loadStaffDraft, permissionsForRole, saveStaffDraft } from '../utils/staffDraft';
import { loadTableDraft, saveTableDraft } from '../utils/tableDraft';

const CURRENT_BUSINESS_KEY = 'qrmasa_current_business';
const HYDRATING_KEY = 'qrmasa_cloud_hydrating';

function requireCloud() {
  if (firebaseConfigurationError || !db || !auth) {
    throw new Error(firebaseConfigurationError || 'Firebase bağlantısı kurulamadı.');
  }
  return { firestore: db, firebaseAuth: auth };
}

function requireManagerUser(user = auth?.currentUser) {
  if (!user || user.isAnonymous) {
    throw new Error('İşletme hesabıyla giriş yapmanız gerekiyor.');
  }
  return user;
}

function ownerUidOf(data) {
  return data?.ownerUid || data?.sahipUid || data?.iletisim?.sahipUid || data?.owner?.uid || '';
}

function cleanObject(value) {
  if (Array.isArray(value)) return value.map(cleanObject);
  if (!value || typeof value !== 'object') return value;

  return Object.fromEntries(
    Object.entries(value)
      .filter(([, item]) => item !== undefined)
      .map(([key, item]) => [key, cleanObject(item)]),
  );
}

function chunk(items, size = 400) {
  const parts = [];
  for (let index = 0; index < items.length; index += size) {
    parts.push(items.slice(index, index + size));
  }
  return parts;
}

async function syncSubcollection(businessCode, collectionName, records, idOf, dataOf) {
  const collectionRef = collection(db, 'businesses', businessCode, collectionName);
  const existingSnapshot = await getDocs(collectionRef);
  const existingIds = new Set(existingSnapshot.docs.map((snapshot) => snapshot.id));
  const nextIds = new Set();
  const operations = [];

  records.forEach((record, index) => {
    const id = String(idOf(record, index) || '').trim();
    if (!id) return;
    nextIds.add(id);
    operations.push({
      type: 'set',
      ref: doc(collectionRef, id),
      data: cleanObject(dataOf(record, index)),
    });
  });

  existingIds.forEach((id) => {
    if (!nextIds.has(id)) {
      operations.push({ type: 'delete', ref: doc(collectionRef, id) });
    }
  });

  for (const operationChunk of chunk(operations)) {
    const batch = writeBatch(db);
    operationChunk.forEach((operation) => {
      if (operation.type === 'delete') batch.delete(operation.ref);
      else batch.set(operation.ref, operation.data, { merge: true });
    });
    await batch.commit();
  }
}

export function getCurrentBusinessCode() {
  if (typeof localStorage === 'undefined') return '';
  return localStorage.getItem(CURRENT_BUSINESS_KEY) || loadManagerSetup().business.code || '';
}

export function setCurrentBusinessCode(businessCode) {
  if (typeof localStorage === 'undefined') return;
  const normalizedCode = String(businessCode || '').trim();
  if (normalizedCode) localStorage.setItem(CURRENT_BUSINESS_KEY, normalizedCode);
  else localStorage.removeItem(CURRENT_BUSINESS_KEY);
}

export function isCloudHydrating() {
  return typeof sessionStorage !== 'undefined' && sessionStorage.getItem(HYDRATING_KEY) === '1';
}

export async function uploadCurrentWorkspace(user = auth?.currentUser, requestedBusinessCode = '') {
  requireCloud();
  const manager = requireManagerUser(user);
  const setup = loadManagerSetup();
  const businessCode = String(requestedBusinessCode || setup.business.code || '').trim();

  if (!setup.completed || !businessCode) {
    throw new Error('Önce işletme kurulumunu tamamlayın.');
  }
  if (setup.business.code !== businessCode) {
    throw new Error('Açık işletme kodu ile kurulum kaydı eşleşmiyor.');
  }

  const businessRef = doc(db, 'businesses', businessCode);
  const existingSnapshot = await getDoc(businessRef);
  if (existingSnapshot.exists()) {
    const existingOwnerUid = ownerUidOf(existingSnapshot.data());
    if (existingOwnerUid && existingOwnerUid !== manager.uid) {
      throw new Error('Bu işletme kodu başka bir kullanıcı hesabına bağlı.');
    }
  }

  const menu = loadMenuDraft(businessCode);
  const staff = loadStaffDraft(businessCode, setup.owner);
  const tables = loadTableDraft(businessCode, setup.operation.tableCount);
  const now = Date.now();

  const businessPayload = cleanObject({
    id: businessCode,
    code: businessCode,
    ad: setup.business.name,
    name: setup.business.name,
    type: setup.business.type,
    aktif: true,
    active: true,
    ownerUid: manager.uid,
    sahipUid: manager.uid,
    iletisim: {
      sahipUid: manager.uid,
      email: manager.email || setup.owner.email,
      telefon: setup.owner.phone || '',
    },
    owner: {
      uid: manager.uid,
      name: setup.owner.name,
      email: manager.email || setup.owner.email,
      phone: setup.owner.phone || '',
    },
    adres: {
      sehir: setup.business.city,
      ilce: setup.business.district,
      acikAdres: setup.business.address,
    },
    operation: setup.operation,
    modules: setup.modules,
    setup: {
      ...setup,
      owner: {
        ...setup.owner,
        email: manager.email || setup.owner.email,
      },
      business: {
        ...setup.business,
        code: businessCode,
      },
      completed: true,
    },
    counts: {
      categories: menu.categories.length,
      products: menu.products.length,
      staff: staff.members.length,
      tables: tables.tables.length,
    },
    updatedAt: serverTimestamp(),
    updatedAtClient: now,
    ...(!existingSnapshot.exists() ? { createdAt: serverTimestamp(), createdAtClient: now } : {}),
  });

  await setDoc(businessRef, businessPayload, { merge: true });

  await setDoc(doc(db, 'businesses', businessCode, 'publicSummary', 'menu'), cleanObject({
    ad: setup.business.name,
    name: setup.business.name,
    aktif: true,
    businessCode,
    modules: setup.modules,
    updatedAt: serverTimestamp(),
  }), { merge: true });

  await syncSubcollection(
    businessCode,
    'categories',
    menu.categories,
    (category) => category.id,
    (category) => ({
      ...category,
      ad: category.name,
      name: category.name,
      sira: category.sortOrder,
      aktif: category.active !== false,
      updatedAt: serverTimestamp(),
    }),
  );

  await syncSubcollection(
    businessCode,
    'menu',
    menu.products,
    (product) => product.id,
    (product) => ({
      ...product,
      ad: product.name,
      name: product.name,
      aciklama: product.description || '',
      fiyat: Number(product.price || 0),
      kategoriId: product.categoryId,
      gorselUrl: product.imageUrl || '',
      aktif: product.active !== false,
      tukendi: product.soldOut === true,
      updatedAt: serverTimestamp(),
    }),
  );

  await syncSubcollection(
    businessCode,
    'tables',
    tables.tables,
    (table) => table.number,
    (table) => ({
      ...table,
      id: String(table.number),
      ad: table.name,
      masaNo: String(table.number),
      aktif: table.active !== false,
      updatedAt: serverTimestamp(),
    }),
  );

  await syncSubcollection(
    businessCode,
    'staff',
    staff.members,
    (member) => member.id === 'owner' ? manager.uid : member.id,
    (member) => ({
      ...member,
      id: member.id === 'owner' ? manager.uid : member.id,
      ad: member.name,
      rol: member.id === 'owner' ? 'owner' : member.role,
      aktif: member.active !== false,
      yetkiler: member.id === 'owner' ? permissionsForRole('owner') : member.permissions,
      owner: member.id === 'owner',
      authUid: member.id === 'owner' ? manager.uid : member.authUid || null,
      email: member.id === 'owner' ? manager.email || member.email : member.email,
      updatedAt: serverTimestamp(),
    }),
  );

  setCurrentBusinessCode(businessCode);
  return {
    businessCode,
    categories: menu.categories.length,
    products: menu.products.length,
    staff: staff.members.length,
    tables: tables.tables.length,
  };
}

export async function downloadWorkspaceToLocal(businessCode, user = auth?.currentUser) {
  requireCloud();
  const manager = requireManagerUser(user);
  const normalizedCode = String(businessCode || '').trim();
  if (!normalizedCode) throw new Error('İşletme kodunu yazın.');

  const businessSnapshot = await getDoc(doc(db, 'businesses', normalizedCode));
  if (!businessSnapshot.exists()) {
    throw new Error('Bu kodla kayıtlı bir işletme bulunamadı.');
  }

  const business = businessSnapshot.data();
  if (ownerUidOf(business) !== manager.uid) {
    throw new Error('Bu işletme kaydı giriş yaptığınız hesaba ait değil.');
  }

  const [categoriesSnapshot, menuSnapshot, staffSnapshot, tablesSnapshot] = await Promise.all([
    getDocs(collection(db, 'businesses', normalizedCode, 'categories')),
    getDocs(collection(db, 'businesses', normalizedCode, 'menu')),
    getDocs(collection(db, 'businesses', normalizedCode, 'staff')),
    getDocs(collection(db, 'businesses', normalizedCode, 'tables')),
  ]);

  const baseSetup = business.setup || {};
  const setup = {
    owner: {
      name: baseSetup.owner?.name || business.owner?.name || manager.displayName || 'İşletme sahibi',
      email: manager.email || baseSetup.owner?.email || business.owner?.email || '',
      phone: baseSetup.owner?.phone || business.owner?.phone || business.iletisim?.telefon || '',
    },
    business: {
      name: baseSetup.business?.name || business.ad || business.name || normalizedCode,
      code: normalizedCode,
      type: baseSetup.business?.type || business.type || 'restaurant',
      city: baseSetup.business?.city || business.adres?.sehir || '',
      district: baseSetup.business?.district || business.adres?.ilce || '',
      address: baseSetup.business?.address || business.adres?.acikAdres || '',
    },
    operation: {
      tableCount: Number(baseSetup.operation?.tableCount || business.operation?.tableCount || tablesSnapshot.size || 1),
      openingTime: baseSetup.operation?.openingTime || business.operation?.openingTime || '08:00',
      closingTime: baseSetup.operation?.closingTime || business.operation?.closingTime || '23:00',
      waiterApproval: baseSetup.operation?.waiterApproval ?? business.operation?.waiterApproval ?? true,
      kitchenApproval: baseSetup.operation?.kitchenApproval ?? business.operation?.kitchenApproval ?? true,
    },
    modules: {
      tableOrder: baseSetup.modules?.tableOrder ?? business.modules?.tableOrder ?? true,
      waiterCall: baseSetup.modules?.waiterCall ?? business.modules?.waiterCall ?? true,
      billRequest: baseSetup.modules?.billRequest ?? business.modules?.billRequest ?? true,
      kitchenPanel: baseSetup.modules?.kitchenPanel ?? business.modules?.kitchenPanel ?? true,
      takeaway: baseSetup.modules?.takeaway ?? business.modules?.takeaway ?? false,
      reservation: baseSetup.modules?.reservation ?? business.modules?.reservation ?? false,
    },
    completed: true,
    updatedAt: Date.now(),
  };

  const categories = categoriesSnapshot.docs.map((snapshot) => {
    const data = snapshot.data();
    return {
      id: snapshot.id,
      name: data.name || data.ad || 'Kategori',
      sortOrder: Number(data.sortOrder ?? data.sira ?? 999),
      active: data.active !== false && data.aktif !== false,
      createdAt: data.createdAtClient || Date.now(),
      updatedAt: data.updatedAtClient || Date.now(),
    };
  });

  const products = menuSnapshot.docs.map((snapshot) => {
    const data = snapshot.data();
    return {
      id: snapshot.id,
      name: data.name || data.ad || 'Ürün',
      description: data.description || data.aciklama || '',
      price: Number(data.price ?? data.fiyat ?? 0),
      categoryId: data.categoryId || data.kategoriId || '',
      imageUrl: data.imageUrl || data.gorselUrl || '',
      active: data.active !== false && data.aktif !== false,
      soldOut: data.soldOut === true || data.tukendi === true,
      createdAt: data.createdAtClient || Date.now(),
      updatedAt: data.updatedAtClient || Date.now(),
    };
  });

  const members = staffSnapshot.docs.map((snapshot) => {
    const data = snapshot.data();
    const isOwner = snapshot.id === manager.uid || data.owner === true || data.rol === 'owner';
    const role = isOwner ? 'owner' : data.role || data.rol || 'waiter';
    return {
      id: isOwner ? 'owner' : snapshot.id,
      name: data.name || data.ad || (isOwner ? setup.owner.name : 'Personel'),
      email: data.email || (isOwner ? manager.email || '' : ''),
      phone: data.phone || data.telefon || '',
      role,
      active: data.active !== false && data.aktif !== false,
      locked: isOwner,
      permissions: data.permissions || data.yetkiler || permissionsForRole(role),
      authUid: data.authUid || (isOwner ? manager.uid : null),
      createdAt: data.createdAtClient || Date.now(),
      updatedAt: data.updatedAtClient || Date.now(),
    };
  });

  const tables = tablesSnapshot.docs.map((snapshot, index) => {
    const data = snapshot.data();
    const number = String(data.number || data.masaNo || snapshot.id);
    return {
      id: data.localId || data.id || `table-${number}`,
      number,
      name: data.name || data.ad || `Masa ${number}`,
      area: data.area || 'Salon',
      capacity: Number(data.capacity || 4),
      active: data.active !== false && data.aktif !== false,
      status: data.status || 'available',
      qrToken: data.qrToken || '',
      sortOrder: Number(data.sortOrder || index + 1),
      createdAt: data.createdAtClient || Date.now(),
      updatedAt: data.updatedAtClient || Date.now(),
    };
  });

  if (typeof sessionStorage !== 'undefined') sessionStorage.setItem(HYDRATING_KEY, '1');
  try {
    saveManagerSetup(setup);
    saveMenuDraft(normalizedCode, { categories, products });
    saveStaffDraft(normalizedCode, { members: members.length ? members : undefined });
    saveTableDraft(normalizedCode, { tables, areas: [...new Set(tables.map((table) => table.area))] });
    setCurrentBusinessCode(normalizedCode);
  } finally {
    if (typeof sessionStorage !== 'undefined') sessionStorage.removeItem(HYDRATING_KEY);
  }

  return { setup, categories, products, members, tables };
}

export async function businessBelongsToUser(businessCode, user = auth?.currentUser) {
  requireCloud();
  const manager = requireManagerUser(user);
  const snapshot = await getDoc(doc(db, 'businesses', String(businessCode || '').trim()));
  if (!snapshot.exists()) return false;
  return ownerUidOf(snapshot.data()) === manager.uid;
}
