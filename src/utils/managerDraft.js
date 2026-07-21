const STORAGE_KEY = 'qrmasa_manager_setup_draft';

export const defaultManagerSetup = {
  owner: {
    name: 'Murat Aydın',
    email: 'neseli27@gmail.com',
    phone: '',
  },
  business: {
    name: '',
    code: '',
    type: 'restaurant',
    city: 'Gaziantep',
    district: '',
    address: '',
  },
  operation: {
    tableCount: 10,
    openingTime: '08:00',
    closingTime: '23:00',
    waiterApproval: true,
    kitchenApproval: true,
  },
  modules: {
    tableOrder: true,
    waiterCall: true,
    billRequest: true,
    kitchenPanel: true,
    takeaway: false,
    reservation: false,
  },
  completed: false,
  updatedAt: null,
};

function mergeSetup(parsed) {
  return {
    ...defaultManagerSetup,
    ...parsed,
    owner: { ...defaultManagerSetup.owner, ...(parsed?.owner || {}) },
    business: { ...defaultManagerSetup.business, ...(parsed?.business || {}) },
    operation: { ...defaultManagerSetup.operation, ...(parsed?.operation || {}) },
    modules: { ...defaultManagerSetup.modules, ...(parsed?.modules || {}) },
  };
}

export function loadManagerSetup() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? mergeSetup(JSON.parse(raw)) : defaultManagerSetup;
  } catch {
    return defaultManagerSetup;
  }
}

export function saveManagerSetup(setup) {
  const value = {
    ...setup,
    updatedAt: Date.now(),
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
  return value;
}

export function clearManagerSetup() {
  localStorage.removeItem(STORAGE_KEY);
}

export function createBusinessCode(name) {
  return String(name || '')
    .trim()
    .toLocaleLowerCase('tr-TR')
    .replaceAll('ı', 'i')
    .replaceAll('ğ', 'g')
    .replaceAll('ü', 'u')
    .replaceAll('ş', 's')
    .replaceAll('ö', 'o')
    .replaceAll('ç', 'c')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
}
