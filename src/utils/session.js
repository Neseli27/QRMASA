// Müşteri masa oturumunu localStorage'da tutar
const KEY = 'qrmasa_session';

export function getSession() {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setSession(data) {
  localStorage.setItem(KEY, JSON.stringify(data));
}

export function clearSession() {
  localStorage.removeItem(KEY);
}

// Yeni masaya geçildiğinde (farklı QR) session yenilenir
export function ensureTableSession(venueSlug, tableNumber) {
  const current = getSession();
  if (
    !current ||
    current.venueSlug !== venueSlug ||
    String(current.tableNumber) !== String(tableNumber)
  ) {
    const newSession = {
      venueSlug,
      tableNumber: String(tableNumber),
      sessionId: crypto.randomUUID(),
      orderId: null,
      startedAt: Date.now(),
    };
    setSession(newSession);
    return newSession;
  }
  return current;
}
