/**
 * Genel yardımcılar
 */

/**
 * Slug oluşturucu (Türkçe karakter dönüşümü dahil)
 */
export function slugify(text) {
  if (!text) return '';
  const map = { ç: 'c', Ç: 'c', ğ: 'g', Ğ: 'g', ı: 'i', İ: 'i', ö: 'o', Ö: 'o', ş: 's', Ş: 's', ü: 'u', Ü: 'u' };
  return text
    .split('')
    .map((c) => map[c] || c)
    .join('')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * Class name birleştirici (tailwind'te koşullu class için)
 */
export function cn(...classes) {
  return classes.filter(Boolean).join(' ');
}

/**
 * HEX rengi "R G B" string'ine çevirir (CSS variable için).
 */
export function hexToRgbTriplet(hex) {
  if (!hex) return '15 23 42';
  const clean = hex.replace('#', '');
  const full = clean.length === 3 ? clean.split('').map((c) => c + c).join('') : clean;
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  if ([r, g, b].some(Number.isNaN)) return '15 23 42';
  return `${r} ${g} ${b}`;
}

/**
 * Göreceli zaman formatı (örn. "3 dk önce")
 */
export function relativeTime(date) {
  if (!date) return '';
  const d = date.toDate ? date.toDate() : new Date(date);
  const diffSec = Math.floor((Date.now() - d.getTime()) / 1000);
  if (diffSec < 60) return 'az önce';
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)} dk önce`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)} sa önce`;
  return d.toLocaleDateString('tr-TR');
}

/**
 * Debounce - arama input'ları için
 */
export function debounce(fn, ms = 300) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  };
}

/**
 * Rastgele ID üretici (client-side short ID)
 */
export function shortId(len = 8) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // karışabileceklerden arındırılmış
  let out = '';
  const arr = new Uint8Array(len);
  crypto.getRandomValues(arr);
  for (let i = 0; i < len; i++) out += chars[arr[i] % chars.length];
  return out;
}
