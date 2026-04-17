/**
 * Güvenlik Yardımcıları
 * ----------------------
 * QR token yapısı: Base64URL(JSON({ v, t, exp, sig }))
 *   v: venueId, t: tableId, exp: unix timestamp (sn), sig: HMAC-SHA256 (Cloud Functions tarafında doğrulanır)
 *
 * Client tarafında sadece DECODE + exp kontrolü yapılır.
 * Gerçek imza doğrulaması Cloud Functions'ta `verifyTableToken` HTTPS callable ile yapılır.
 */

const INVALID_CHARS_RE = /[<>"'`]/g;

/**
 * XSS önlemek için string temizler.
 * Not: React zaten default olarak escape eder, bu ek katman.
 */
export function sanitizeText(input, maxLen = 500) {
  if (typeof input !== 'string') return '';
  return input.trim().replace(INVALID_CHARS_RE, '').slice(0, maxLen);
}

/**
 * Telefon numarasını E.164 formatına çevirir (TR odaklı).
 */
export function normalizePhone(phone) {
  if (!phone) return '';
  const digits = phone.replace(/\D/g, '');
  if (digits.startsWith('90') && digits.length === 12) return `+${digits}`;
  if (digits.startsWith('0') && digits.length === 11) return `+9${digits}`;
  if (digits.length === 10) return `+90${digits}`;
  return phone.startsWith('+') ? phone : `+${digits}`;
}

/**
 * Base64URL decode (token içinden veri çıkarma).
 */
export function base64UrlDecode(str) {
  try {
    const pad = '='.repeat((4 - (str.length % 4)) % 4);
    const base64 = (str + pad).replace(/-/g, '+').replace(/_/g, '/');
    return decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + c.charCodeAt(0).toString(16).padStart(2, '0'))
        .join('')
    );
  } catch {
    return null;
  }
}

/**
 * QR token'ı parse et ve süresini kontrol et.
 * İmza doğrulaması SERVER tarafında yapılır (Cloud Function).
 */
export function parseTableToken(token) {
  if (!token) return { valid: false, reason: 'missing' };
  const decoded = base64UrlDecode(token);
  if (!decoded) return { valid: false, reason: 'decode' };
  try {
    const payload = JSON.parse(decoded);
    if (!payload.v || !payload.t || !payload.exp || !payload.sig) {
      return { valid: false, reason: 'shape' };
    }
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp < now) return { valid: false, reason: 'expired', payload };
    return { valid: true, payload };
  } catch {
    return { valid: false, reason: 'parse' };
  }
}

/**
 * Client tarafı rate limit - spam sipariş önleme.
 * localStorage + action key bazlı, kısa süreli bloklama.
 */
export function checkClientRateLimit(actionKey, { maxAttempts = 5, windowMs = 60_000 } = {}) {
  const now = Date.now();
  const key = `rl:${actionKey}`;
  try {
    const raw = localStorage.getItem(key);
    const attempts = raw ? JSON.parse(raw).filter((t) => now - t < windowMs) : [];
    if (attempts.length >= maxAttempts) {
      return { allowed: false, retryAfter: Math.ceil((windowMs - (now - attempts[0])) / 1000) };
    }
    attempts.push(now);
    localStorage.setItem(key, JSON.stringify(attempts));
    return { allowed: true };
  } catch {
    // localStorage erişilemezse allow et, server-side zaten koruyor
    return { allowed: true };
  }
}

/**
 * Sipariş miktarı kontrolü - makul sınırlar içinde mi?
 */
export function validateQuantity(qty) {
  const n = Number(qty);
  return Number.isInteger(n) && n >= 1 && n <= 99;
}

/**
 * Fiyat formatı (TL)
 */
export function formatPrice(amount) {
  const n = Number(amount) || 0;
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY',
    minimumFractionDigits: 2
  }).format(n);
}
