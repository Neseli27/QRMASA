import { collection, doc, getDoc, getDocs, setDoc, writeBatch } from 'firebase/firestore';
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
}

function requireOwner(user = auth?.currentUser) {
  if (!user || user.isAnonymous) throw new Error('İşletme hesabıyla giriş yapmanız gerekiyor.');
  return user;
}

function ownerUidOf(data) {
  return data?.ownerUid || data?.sahipUid || data?.iletisim?.sahipUid || data?.owner?.uid || '';
}

function plain(value) {
  return JSON.parse(JSON.stringify(value));
}

function split(items, size = 400) {
  const groups = [];
  for (let index = 0; index < items.length; index += size) groups.push(items.slice(index, index + size));
  return groups;
}

async function replaceCollection(businessCode, name, records) {
  const ref = collection(db, 'businesses', businessCode, name);
  const existing = await getDocs(ref);
  const nextIds = new Set(records.map((record) => String(record.id)));
  const operations = [];

  records.forEach((record) => operations.push({ type: 'set', ref: doc(ref, String(record.id)), data: plain(record.data) }));
  existing.docs.forEach((snapshot) => {
    if (!nextIds.has(snapshot.id)) operations.push({ type: 'delete', ref: snapshot.ref });
  });

  for (const group of split(operations)) {
    const batch = writeBatch(db);
    group.forEach((operation) => {
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

export function setCurrentBusinessCode(code) {
  if (typeof localStorage === 'undefined') return;
  const value = String(code || '').trim();
  if (value) localStorage.setItem(CURRENT_BUSINESS_KEY, value);
  else localStorage.removeItem(CURRENT_BUSINESS_KEY);
}

export function isCloudHydrating() {
  return typeof sessionStorage !== 'undefined' && sessionStorage.getItem(HYDRATING_KEY) === '1';
}

export async function uploadWorkspace(user = auth?.currentUser, requestedCode = '') {
  requireCloud();
  const owner = requireOwner(user);
  const setup = loadManagerSetup();
  const code = String(requestedCode || setup.business.code || '').trim();

  if (!setup.completed || !code) throw new Error('Önce işletme kurulumunu tamamlayın.');
  if (setup.business.code !== code) throw new Error('İşletme kodu ile açık kurulum kaydı eşleşmiyor.');

  const businessRef = doc(db, 'businesses', code);
  let existing = null;
  try {
    const snapshot = await getDoc(businessRef);
    existing = snapshot.exists() ? snapshot.data() : null;
  } catch (error) {
    if (error?.code !== 'permission-denied') throw error;
  }

  if (existing && ownerUidOf(existing) && ownerUidOf(existing) !== owner.uid) {
    throw new Error('Bu işletme kodu başka bir kullanıcı hesabına bağlı.');
  }

  const menu = loadMenuDraft(code);
  const staff = loadStaffDraft(code, setup.owner);
  const tables = loadTableDraft(code, setup.operation.tableCount);
  const now = Date.now();
  const normalizedSetup = {
    ...setup,
    owner: { ...setup.owner, email: owner.email || setup.owner.email },
    completed: true,
    updatedAt: now,
  };
  const workspace = plain({ setup: normalizedSetup, menu, staff, tables, version: 1, updatedAt: now });

  await setDoc(businessRef, plain({
    id: code,
    code,
    ad: setup.business.name,
    name: setup.business.name,
    type: setup.business.type,
    aktif: true,
    active: true,
    ownerUid: owner.uid,
    sahipUid: owner.uid,
    iletisim: { sahipUid: owner.uid, email: owner.email || setup.owner.email, telefon: setup.owner.phone || '' },
    owner: { uid: owner.uid, name: setup.owner.name, email: owner.email || setup.owner.email, phone: setup.owner.phone || '' },
    adres: { sehir: setup.business.city, ilce: setup.business.district, acikAdres: setup.business.address },
    operation: setup.operation,
    modules: setup.modules,
    workspace,
    counts: { categories: menu.categories.length, products: menu.products.length, staff: staff.members.length, tables: tables.tables.length },
    createdAtClient: existing?.createdAtClient || now,
    updatedAtClient: now,
  }), { merge: true });

  await setDoc(doc(db, 'businesses', code, 'publicSummary', 'menu'), plain({
    ad: setup.business.name,
    name: setup.business.name,
    businessCode: code,
    aktif: true,
    modules: setup.modules,
    updatedAtClient: now,
  }), { merge: true });

  await replaceCollection(code, 'categories', menu.categories.map((category) => ({
    id: category.id,
    data: { ...category, ad: category.name, sira: category.sortOrder, aktif: category.active !== false, updatedAtClient: now },
  })));

  await replaceCollection(code, 'menu', menu.products.map((product) => ({
    id: product.id,
    data: {
      ...product,
      ad: product.name,
      aciklama: product.description || '',
      fiyat: Number(product.price || 0),
      kategoriId: product.categoryId,
      gorselUrl: product.imageUrl || '',
      aktif: product.active !== false,
      tukendi: product.soldOut === true,
      updatedAtClient: now,
    },
  })));

  await replaceCollection(code, 'tables', tables.tables.map((table) => ({
    id: String(table.number),
    data: { ...table, localId: table.id, id: String(table.number), ad: table.name, masaNo: String(table.number), aktif: table.active !== false, updatedAtClient: now },
  })));

  await replaceCollection(code, 'staff', staff.members.map((member) => {
    const isOwner = member.id === 'owner';
    const role = isOwner ? 'owner' : member.role;
    return {
      id: isOwner ? owner.uid : member.id,
      data: {
        ...member,
        id: isOwner ? owner.uid : member.id,
        ad: member.name,
        role,
        rol: role,
        aktif: member.active !== false,
        permissions: isOwner ? permissionsForRole('owner') : member.permissions,
        yetkiler: isOwner ? permissionsForRole('owner') : member.permissions,
        owner: isOwner,
        authUid: isOwner ? owner.uid : member.authUid || null,
        email: isOwner ? owner.email || member.email : member.email,
        updatedAtClient: now,
      },
    };
  }));

  setCurrentBusinessCode(code);
  return { code, counts: { menu: menu.products.length, staff: staff.members.length, tables: tables.tables.length } };
}

export async function downloadWorkspace(code, user = auth?.currentUser) {
  requireCloud();
  const owner = requireOwner(user);
  const normalizedCode = String(code || '').trim();
  if (!normalizedCode) throw new Error('İşletme kodunu yazın.');

  const snapshot = await getDoc(doc(db, 'businesses', normalizedCode));
  if (!snapshot.exists()) throw new Error('Bu kodla kayıtlı bir işletme bulunamadı.');
  const business = snapshot.data();
  if (ownerUidOf(business) !== owner.uid) throw new Error('Bu işletme giriş yaptığınız hesaba ait değil.');
  if (!business.workspace?.setup) throw new Error('Bu işletmenin bulut çalışma alanı henüz oluşturulmamış.');

  const workspace = business.workspace;
  if (typeof sessionStorage !== 'undefined') sessionStorage.setItem(HYDRATING_KEY, '1');
  try {
    saveManagerSetup({ ...workspace.setup, completed: true });
    saveMenuDraft(normalizedCode, workspace.menu || { categories: [], products: [] });
    saveStaffDraft(normalizedCode, workspace.staff || { members: [] });
    saveTableDraft(normalizedCode, workspace.tables || { tables: [], areas: ['Salon'] });
    setCurrentBusinessCode(normalizedCode);
  } finally {
    if (typeof sessionStorage !== 'undefined') sessionStorage.removeItem(HYDRATING_KEY);
  }
  return workspace;
}

export async function workspaceBelongsToUser(code, user = auth?.currentUser) {
  requireCloud();
  const owner = requireOwner(user);
  const normalizedCode = String(code || '').trim();
  if (!normalizedCode) return false;
  const snapshot = await getDoc(doc(db, 'businesses', normalizedCode));
  return snapshot.exists() && ownerUidOf(snapshot.data()) === owner.uid;
}
