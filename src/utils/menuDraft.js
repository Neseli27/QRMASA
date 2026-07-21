const MENU_STORAGE_PREFIX = 'qrmasa_menu_draft';

function storageKey(businessCode) {
  return `${MENU_STORAGE_PREFIX}:${String(businessCode || 'default')}`;
}

export function createDraftId(prefix = 'item') {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function defaultMenuDraft() {
  return {
    categories: [],
    products: [],
    updatedAt: null,
  };
}

export function loadMenuDraft(businessCode) {
  try {
    const raw = localStorage.getItem(storageKey(businessCode));
    if (!raw) return defaultMenuDraft();

    const parsed = JSON.parse(raw);
    return {
      categories: Array.isArray(parsed?.categories) ? parsed.categories : [],
      products: Array.isArray(parsed?.products) ? parsed.products : [],
      updatedAt: parsed?.updatedAt || null,
    };
  } catch {
    return defaultMenuDraft();
  }
}

export function saveMenuDraft(businessCode, menu) {
  const value = {
    categories: Array.isArray(menu?.categories) ? menu.categories : [],
    products: Array.isArray(menu?.products) ? menu.products : [],
    updatedAt: Date.now(),
  };
  localStorage.setItem(storageKey(businessCode), JSON.stringify(value));
  return value;
}

export function clearMenuDraft(businessCode) {
  localStorage.removeItem(storageKey(businessCode));
}
