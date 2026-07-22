import { notifyDraftChanged } from './draftEvents';

const TABLE_STORAGE_PREFIX = 'qrmasa_table_draft';

export const TABLE_STATUSES = [
  { value: 'available', label: 'Boş', description: 'Yeni müşteri kabul edebilir.' },
  { value: 'occupied', label: 'Dolu', description: 'Masada aktif oturum bulunuyor.' },
  { value: 'reserved', label: 'Rezerve', description: 'Masa rezervasyon için ayrılmış.' },
  { value: 'service', label: 'Servis dışı', description: 'Geçici olarak kullanıma kapalı.' },
];

function storageKey(businessCode) {
  return `${TABLE_STORAGE_PREFIX}:${String(businessCode || 'default')}`;
}

export function createTableId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `table-${crypto.randomUUID()}`;
  }
  return `table-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function createQrToken() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID().replaceAll('-', '');
  }
  return `${Date.now()}${Math.random().toString(36).slice(2, 14)}`;
}

function normalizeTable(table, index = 0) {
  const number = String(table?.number || index + 1);
  return {
    id: table?.id || createTableId(),
    number,
    name: String(table?.name || `Masa ${number}`),
    area: String(table?.area || 'Salon'),
    capacity: Math.max(1, Math.min(50, Number(table?.capacity || 4))),
    active: table?.active !== false,
    status: TABLE_STATUSES.some((item) => item.value === table?.status) ? table.status : 'available',
    qrToken: String(table?.qrToken || createQrToken()),
    sortOrder: Number.isFinite(Number(table?.sortOrder)) ? Number(table.sortOrder) : index + 1,
    createdAt: table?.createdAt || Date.now(),
    updatedAt: table?.updatedAt || Date.now(),
  };
}

export function createTables(count = 10, startAt = 1, area = 'Salon') {
  const safeCount = Math.max(0, Math.min(500, Number(count) || 0));
  const safeStart = Math.max(1, Number(startAt) || 1);

  return Array.from({ length: safeCount }, (_, index) => {
    const number = String(safeStart + index);
    return normalizeTable({
      number,
      name: `Masa ${number}`,
      area,
      capacity: 4,
      sortOrder: safeStart + index,
    }, index);
  });
}

export function defaultTableDraft(tableCount = 10) {
  return {
    tables: createTables(tableCount),
    areas: ['Salon'],
    updatedAt: null,
  };
}

function normalizeAreas(areas, tables) {
  const values = Array.isArray(areas) ? areas : [];
  const tableAreas = tables.map((table) => table.area);
  const normalized = [...new Set([...values, ...tableAreas].map((item) => String(item || '').trim()).filter(Boolean))];
  return normalized.length > 0 ? normalized : ['Salon'];
}

export function loadTableDraft(businessCode, tableCount = 10) {
  try {
    const raw = localStorage.getItem(storageKey(businessCode));
    if (!raw) return defaultTableDraft(tableCount);

    const parsed = JSON.parse(raw);
    const tables = Array.isArray(parsed?.tables) ? parsed.tables.map(normalizeTable) : [];
    return {
      tables,
      areas: normalizeAreas(parsed?.areas, tables),
      updatedAt: parsed?.updatedAt || null,
    };
  } catch {
    return defaultTableDraft(tableCount);
  }
}

export function saveTableDraft(businessCode, draft) {
  const tables = Array.isArray(draft?.tables) ? draft.tables.map(normalizeTable) : [];
  const value = {
    tables,
    areas: normalizeAreas(draft?.areas, tables),
    updatedAt: Date.now(),
  };
  localStorage.setItem(storageKey(businessCode), JSON.stringify(value));
  notifyDraftChanged(businessCode);
  return value;
}

export function clearTableDraft(businessCode) {
  localStorage.removeItem(storageKey(businessCode));
  notifyDraftChanged(businessCode);
}
