import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { signInAnonymously } from 'firebase/auth';
import { httpsCallable } from 'firebase/functions';
import { auth, functions } from '../lib/firebase';

const CustomerContext = createContext(null);

/**
 * CustomerProvider
 * ----------------
 * Müşteri deneyimi için ana context:
 * - Anonim auth + masa oturumu (joinTableSession)
 * - Sepet yönetimi (localStorage'da saklar)
 * - Aktif sipariş takibi
 *
 * Kullanım: <CustomerProvider venueId={..} tableId={..} token={..}>
 */
export function CustomerProvider({ venueId, tableId, token, children }) {
  const [session, setSession] = useState(null); // { sessionId, tableId }
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

  // Sepeti localStorage'a kaydet
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(cart));
    } catch (e) {
      console.warn('[Cart] localStorage:', e);
    }
  }, [cart, storageKey]);

  // Anonim auth + masa oturumu aç
  useEffect(() => {
    if (!venueId || !tableId || !token) {
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

        // 2. Masa oturumu aç/katıl (Cloud Function ile token doğrulanır)
        const joinSession = httpsCallable(functions, 'joinTableSession');
        const result = await joinSession({ venueId, tableId, token });
        setSession(result.data); // { sessionId }
        setSessionError(null);
      } catch (e) {
        console.error('[Session]', e);
        const msg = e?.message || 'Masa oturumu açılamadı';
        setSessionError(msg);
      } finally {
        setSessionLoading(false);
      }
    })();
  }, [venueId, tableId, token]);

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
  }, []);

  const removeFromCart = useCallback((index) => {
    setCart(current => current.filter((_, i) => i !== index));
  }, []);

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
