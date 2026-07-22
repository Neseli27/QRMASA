import { notifyDraftChanged } from './draftEvents';

const STAFF_STORAGE_PREFIX = 'qrmasa_staff_draft';

export const PERMISSION_DEFINITIONS = [
  { key: 'ordersView', label: 'Siparişleri görüntüle', group: 'Sipariş' },
  { key: 'ordersApprove', label: 'Sipariş onayla / reddet', group: 'Sipariş' },
  { key: 'ordersServe', label: 'Servis edildi işaretle', group: 'Sipariş' },
  { key: 'kitchenView', label: 'Mutfak ekranını görüntüle', group: 'Mutfak' },
  { key: 'kitchenUpdate', label: 'Hazırlama durumunu değiştir', group: 'Mutfak' },
  { key: 'callsManage', label: 'Garson çağrılarını yönet', group: 'Müşteri talepleri' },
  { key: 'billsManage', label: 'Hesap taleplerini yönet', group: 'Kasa' },
  { key: 'paymentsManage', label: 'Ödeme al ve hesabı kapat', group: 'Kasa' },
  { key: 'menuManage', label: 'Kategori ve ürün yönet', group: 'Yönetim' },
  { key: 'staffManage', label: 'Personel ve yetki yönet', group: 'Yönetim' },
  { key: 'tablesManage', label: 'Masa ve QR kod yönet', group: 'Yönetim' },
  { key: 'reportsView', label: 'Raporları görüntüle', group: 'Yönetim' },
  { key: 'settingsManage', label: 'İşletme ayarlarını değiştir', group: 'Yönetim' },
];

export const ROLE_DEFINITIONS = [
  { value: 'manager', label: 'Yönetici', description: 'İşletmenin tüm operasyonel ekranlarına erişir.' },
  { value: 'waiter', label: 'Garson', description: 'Sipariş, servis ve müşteri taleplerini yönetir.' },
  { value: 'kitchen', label: 'Mutfak', description: 'Hazırlama ekranını ve ürün durumlarını yönetir.' },
  { value: 'cashier', label: 'Kasa', description: 'Hesap, ödeme ve kasa işlemlerini yönetir.' },
  { value: 'service', label: 'Servis destek', description: 'Servis ve müşteri çağrılarına yardımcı olur.' },
];

const ROLE_PERMISSION_KEYS = {
  owner: PERMISSION_DEFINITIONS.map((item) => item.key),
  manager: PERMISSION_DEFINITIONS.map((item) => item.key),
  waiter: ['ordersView', 'ordersApprove', 'ordersServe', 'callsManage', 'billsManage'],
  kitchen: ['ordersView', 'kitchenView', 'kitchenUpdate'],
  cashier: ['ordersView', 'billsManage', 'paymentsManage', 'reportsView'],
  service: ['ordersView', 'ordersServe', 'callsManage'],
};

function storageKey(businessCode) {
  return `${STAFF_STORAGE_PREFIX}:${String(businessCode || 'default')}`;
}

export function createStaffId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `staff-${crypto.randomUUID()}`;
  }
  return `staff-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function permissionsForRole(role) {
  const allowed = new Set(ROLE_PERMISSION_KEYS[role] || []);
  return Object.fromEntries(PERMISSION_DEFINITIONS.map((item) => [item.key, allowed.has(item.key)]));
}

function ownerRecord(owner = {}) {
  return {
    id: 'owner',
    name: owner.name || 'İşletme sahibi',
    email: owner.email || '',
    phone: owner.phone || '',
    role: 'owner',
    active: true,
    locked: true,
    permissions: permissionsForRole('owner'),
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

function normalizeMember(member) {
  const role = member?.role || 'waiter';
  return {
    id: member?.id || createStaffId(),
    name: String(member?.name || ''),
    email: String(member?.email || ''),
    phone: String(member?.phone || ''),
    role,
    active: member?.active !== false,
    locked: member?.locked === true,
    permissions: {
      ...permissionsForRole(role),
      ...(member?.permissions || {}),
    },
    createdAt: member?.createdAt || Date.now(),
    updatedAt: member?.updatedAt || Date.now(),
  };
}

export function defaultStaffDraft(owner) {
  return {
    members: [ownerRecord(owner)],
    updatedAt: null,
  };
}

export function loadStaffDraft(businessCode, owner) {
  try {
    const raw = localStorage.getItem(storageKey(businessCode));
    if (!raw) return defaultStaffDraft(owner);

    const parsed = JSON.parse(raw);
    const members = Array.isArray(parsed?.members) ? parsed.members.map(normalizeMember) : [];
    const currentOwner = ownerRecord(owner);
    const ownerIndex = members.findIndex((member) => member.id === 'owner');

    if (ownerIndex >= 0) {
      members[ownerIndex] = {
        ...members[ownerIndex],
        ...currentOwner,
        createdAt: members[ownerIndex].createdAt || currentOwner.createdAt,
      };
    } else {
      members.unshift(currentOwner);
    }

    return {
      members,
      updatedAt: parsed?.updatedAt || null,
    };
  } catch {
    return defaultStaffDraft(owner);
  }
}

export function saveStaffDraft(businessCode, draft) {
  const value = {
    members: Array.isArray(draft?.members) ? draft.members.map(normalizeMember) : [],
    updatedAt: Date.now(),
  };
  localStorage.setItem(storageKey(businessCode), JSON.stringify(value));
  notifyDraftChanged(businessCode);
  return value;
}

export function clearStaffDraft(businessCode) {
  localStorage.removeItem(storageKey(businessCode));
  notifyDraftChanged(businessCode);
}
