/**
 * Güvenlik Yardımcıları
 * ----------------------
 * QR Token yapısı (server'ın ürettiği gerçek format):
 *   {payloadB64}.{signature}
 *   payloadB64 = base64url( JSON({ v, t, exp }) )
 *   signature  = base64url( HMAC-SHA256(payloadB64, QR_SIGNING_KEY) )
 *
 * Client tarafı:
 *   - Payload içindeki v (venueId), t (tableId), exp değerlerini okuyabilir
 *   - exp kontrolü yaparak "token süresi dolmuş mu" bilgisini gösterebilir
 *
 * Client tarafı İMZA DOĞRULAMASI YAPAMAZ (QR_SIGNING_KEY server'da).
 * Gerçek doğrulama Cloud Function `openTableSession` içinde yapılır.
 */

const INVALID_CHARS_RE = /[<>]/g;

/**
 * XSS önlemek için string temizler.
 * Not: React zaten default olarak escape eder, bu ek katman.
 * Sadece < ve > karakterlerini çıkarıyoruz — tırnak ve backtick'i
 * bırakıyoruz ki "D'Angelo" gibi isimler korunabilsin.
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
 * Base64URL decode (token içinden payload çıkarma).
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
 * Format: {payloadB64}.{signature}
 * İmza doğrulaması SERVER tarafında yapılır (Cloud Function).
 * Bu fonksiyon sadece client'ta hızlı ön-kontrol için kullanılır:
 *  - Token yapısı doğru mu?
 *  - Payload okunabiliyor mu?
 *  - exp geçmiş mi?
 *
 * @returns { valid, reason?, payload? }
 *   payload: { v, t, exp } (valid olsun olmasın dönebilir, kontrol amaçlı)
 */
export function parseTableToken(token) {
  if (!token || typeof token !== 'string') {
    return { valid: false, reason: 'missing' };
  }

  const parts = token.split('.');
  if (parts.length !== 2) {
    return { valid: false, reason: 'format' };
  }

  const [payloadB64] = parts;
  const decoded = base64UrlDecode(payloadB64);
  if (!decoded) {
    return { valid: false, reason: 'decode' };
  }

  let payload;
  try {
    payload = JSON.parse(decoded);
  } catch {
    return { valid: false, reason: 'parse' };
  }

  if (!payload.v || !payload.t || !payload.exp) {
    return { valid: false, reason: 'shape', payload };
  }

  const now = Math.floor(Date.now() / 1000);
  if (payload.exp < now) {
    return { valid: false, reason: 'expired', payload };
  }

  return { valid: true, payload };
}

/**
 * Client tarafı rate limit - spam sipariş önleme.
 * localStorage + action key bazlı, kısa süreli bloklama.
 * Not: Bu sadece UI seviyesinde hızlı kontrol. Gerçek koruma server'da.
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
