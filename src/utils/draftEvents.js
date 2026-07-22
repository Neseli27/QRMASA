export function notifyDraftChanged(businessCode) {
  if (typeof window === 'undefined') return;
  const normalizedCode = String(businessCode || '').trim();
  if (!normalizedCode) return;

  window.dispatchEvent(new CustomEvent('qrmasa:draft-changed', {
    detail: { businessCode: normalizedCode },
  }));
}

export function notifyCloudStatus(status, message = '') {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent('qrmasa:cloud-status', {
    detail: { status, message },
  }));
}
