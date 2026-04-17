import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { signInAnonymously } from 'firebase/auth';
import { httpsCallable } from 'firebase/functions';
import { addDoc, collection, serverTimestamp, doc, onSnapshot } from 'firebase/firestore';
import { auth, functions, db } from '../lib/firebase';
import { venueCol } from '../lib/paths';
import { checkClientRateLimit, sanitizeText, validateQuantity } from '../lib/security';

const CustomerContext = createContext(null);

// Aktif sipariş ID'si localStorage anahtarı
const activeOrderStorageKey = (venueId, tableId) => `qrmasa_active_order_${venueId}_${tableId}`;

/**
 * CustomerProvider
 * ----------------
 * Müşteri deneyimi için ana context:
 * - Anonim auth + masa oturumu (openTableSession)
 * - Sepet yönetimi (localStorage'da saklar)
 * - Sipariş oluşturma ve aktif sipariş takibi
 *
 * Kullanım: <CustomerProvider venueId={..} tableId={..} token={..}>
 */
export function CustomerProvider({ venueId, tableId, token, children }) {
  const [session, setSession] = useState(null); // { sessionId, tableId, expiresAt, reused }
  const [sessionLoading, setSessionLoading] = useState(true);
  const [sessionError, setSessionError] = useState(null);

  // Sepet — localStorage ile persist
  const storageKey = `qrmasa_cart_${venueId}_${tableId}`;
  const [cart, setCart] = useState(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });

  // Aktif sipariş ID'si (localStorage'da persist)
  const [activeOrderId, setActiveOrderId] = useState(() => {
    try {
      return localStorage.getItem(activeOrderStorageKey(venueId, tableId)) || null;
    } catch { return null; }
  });

  // Aktif sipariş verisi (realtime)
  const [activeOrder, setActiveOrder] = useState(null);

  // Sipariş gönderme state
  const [submittingOrder, setSubmittingOrder] = useState(false);

  // Sepeti localStorage'a kaydet
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(cart));
    } catch (e) {
      console.warn('[Cart] localStorage:', e);
    }
  }, [cart, storageKey]);

  // Aktif sipariş ID'sini localStorage'a kaydet
  useEffect(() => {
    try {
      const key = activeOrderStorageKey(venueId, tableId);
      if (activeOrderId) {
        localStorage.setItem(key, activeOrderId);
      } else {
        localStorage.removeItem(key);
      }
    } catch (e) {
      console.warn('[ActiveOrder] localStorage:', e);
    }
  }, [activeOrderId, venueId, tableId]);

  // Anonim auth + masa oturumu aç (veya aktif olana katıl)
  useEffect(() => {
    if (!token) {
      setSessionLoading(false);
      setSessionError('Geçersiz QR kodu');
      return;
    }

    (async () => {
      try {
        // 1. Anonim auth (eğer henüz giriş yapmadıysa)
        if (!auth.currentUser) {
          await signInAnonymously(auth);
        }

        // 2. Oturum aç veya mevcut aktife katıl (token server'da doğrulanır)
        const openSession = httpsCallable(functions, 'openTableSession');
        const result = await openSession({ token });

        // result.data: { sessionId, venueId, tableId, expiresAt, reused }
        setSession(result.data);
        setSessionError(null);
      } catch (e) {
        console.error('[Session]', e);
        const msg = e?.message || 'Masa oturumu açılamadı';
        setSessionError(msg);
      } finally {
        setSessionLoading(false);
      }
    })();
  }, [token]);

  // Aktif siparişi realtime dinle
  useEffect(() => {
    if (!venueId || !activeOrderId) {
      setActiveOrder(null);
      return;
    }
    const ref = doc(db, venueCol(venueId, 'orders'), activeOrderId);
    const unsub = onSnapshot(
      ref,
      (snap) => {
        if (!snap.exists()) {
          setActiveOrder(null);
          setActiveOrderId(null);
          return;
        }
        setActiveOrder({ id: snap.id, ...snap.data() });
      },
      (err) => {
        console.warn('[ActiveOrder] realtime:', err);
      }
    );
    return () => unsub();
  }, [venueId, activeOrderId]);

  // ─── Sepet aksiyonları ──────────────────────────────
  const addToCart = useCallback((item, qty = 1, note = '') => {
    setCart(current => {
      // Aynı ürün + aynı not varsa miktarı arttır
      const existingIdx = current.findIndex(
        ci => ci.itemId === item.id && (ci.note || '') === (note || '')
      );
      if (existingIdx >= 0) {
        const updated = [...current];
        updated[existingIdx] = {
          ...updated[existingIdx],
          qty: updated[existingIdx].qty + qty
        };
        return updated;
      }
      // Yeni satır ekle
      return [
        ...current,
        {
          itemId: item.id,
          name: item.name,
          price: item.price,
          image: item.image || null,
          qty,
          note: note || ''
        }
      ];
    });
  }, []);

  const removeFromCart = useCallback((index) => {
    setCart(current => current.filter((_, i) => i !== index));
  }, []);

  const updateQty = useCallback((index, newQty) => {
    if (newQty <= 0) {
      removeFromCart(index);
      return;
    }
    setCart(current => {
      const updated = [...current];
      updated[index] = { ...updated[index], qty: newQty };
      return updated;
    });
  }, [removeFromCart]);

  const updateNote = useCallback((index, note) => {
    setCart(current => {
      const updated = [...current];
      updated[index] = { ...updated[index], note };
      return updated;
    });
  }, []);

  const clearCart = useCallback(() => {
    setCart([]);
  }, []);

  // ─── Sipariş gönderme ──────────────────────────────
  /**
   * Sepeti Firestore'a order olarak yazar.
   * Firestore Rules'a uyumlu:
   *   venueId, customerUid, status='pending', items, total, sessionId, tableId, createdAt=serverTimestamp
   *
   * @param {Object} options
   * @param {string} [options.customerNote] - Sipariş geneli müşteri notu
   * @returns { orderId } veya { error }
   */
  const submitOrder = useCallback(async ({ customerNote = '' } = {}) => {
    // Ön kontroller
    if (!auth.currentUser) {
      return { error: 'Oturum açılmamış. Lütfen sayfayı yenileyin.' };
    }
    if (!session?.sessionId) {
      return { error: 'Masa oturumu hazır değil. Lütfen sayfayı yenileyin.' };
    }
    if (!cart || cart.length === 0) {
      return { error: 'Sepetiniz boş' };
    }
    if (cart.length > 50) {
      return { error: 'Sepette en fazla 50 çeşit ürün olabilir' };
    }

    // Her satırın miktarını kontrol et
    for (const line of cart) {
      if (!validateQuantity(line.qty)) {
        return { error: `"${line.name}" için geçersiz miktar` };
      }
      if (typeof line.price !== 'number' || line.price < 0 || line.price > 100000) {
        return { error: `"${line.name}" için geçersiz fiyat` };
      }
    }

    // Client-side rate limit (1 dakikada 3 sipariş)
    const rl = checkClientRateLimit(`order_${venueId}_${tableId}`, {
      maxAttempts: 3, windowMs: 60_000
    });
    if (!rl.allowed) {
      return { error: `Çok hızlı sipariş veriyorsun. ${rl.retryAfter} sn bekle.` };
    }

    setSubmittingOrder(true);
    try {
      // Items'ı normalize et (rules'a uygun, fazla alan göndermeden)
      const items = cart.map(line => ({
        itemId: String(line.itemId),
        name: sanitizeText(line.name, 120),
        price: Number(line.price),
        qty: Number(line.qty),
        note: sanitizeText(line.note || '', 200),
        lineTotal: Number((line.price * line.qty).toFixed(2))
      }));

      const total = Number(
        items.reduce((sum, i) => sum + i.lineTotal, 0).toFixed(2)
      );

      if (total <= 0 || total > 50000) {
        setSubmittingOrder(false);
        return { error: 'Sipariş tutarı geçersiz' };
      }

      const orderData = {
        venueId,
        customerUid: auth.currentUser.uid,
        status: 'pending',
        items,
        total,
        sessionId: session.sessionId,
        tableId,
        customerNote: sanitizeText(customerNote, 300),
        createdAt: serverTimestamp()
      };

      const ref = await addDoc(
        collection(db, venueCol(venueId, 'orders')),
        orderData
      );

      // Başarılı → sepeti temizle, aktif sipariş olarak kaydet
      setCart([]);
      setActiveOrderId(ref.id);

      return { orderId: ref.id };
    } catch (e) {
      console.error('[SubmitOrder]', e);
      const msg = e?.code === 'permission-denied'
        ? 'Yetki hatası. Lütfen sayfayı yenileyip tekrar deneyin.'
        : (e?.message || 'Sipariş oluşturulamadı');
      return { error: msg };
    } finally {
      setSubmittingOrder(false);
    }
  }, [cart, session, venueId, tableId]);

  /**
   * Aktif sipariş takibini sıfırla (kullanıcı "yeni sipariş" demek istediğinde)
   */
  const clearActiveOrder = useCallback(() => {
    setActiveOrderId(null);
    setActiveOrder(null);
  }, []);

  // Hesaplamalar
  const cartTotal = cart.reduce((sum, i) => sum + i.price * i.qty, 0);
  const cartCount = cart.reduce((sum, i) => sum + i.qty, 0);

  const value = {
    session,
    sessionLoading,
    sessionError,
    cart,
    cartTotal,
    cartCount,
    addToCart,
    updateQty,
    removeFromCart,
    updateNote,
    clearCart,
    submitOrder,
    submittingOrder,
    activeOrder,
    activeOrderId,
    clearActiveOrder,
    venueId,
    tableId
  };

  return <CustomerContext.Provider value={value}>{children}</CustomerContext.Provider>;
}

export function useCustomer() {
  const ctx = useContext(CustomerContext);
  if (!ctx) throw new Error('useCustomer CustomerProvider içinde kullanılmalı');
  return ctx;
}
