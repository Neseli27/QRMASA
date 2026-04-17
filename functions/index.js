/**
 * QRMasa Cloud Functions
 * -----------------------
 * Proje: qrmasa-74c03
 * Region: europe-west1 (Türkiye'ye yakın)
 *
 * Function'lar:
 * - createTableToken          : Venue admin QR token üretir (HMAC-SHA256)
 * - openTableSession          : Müşteri QR okuyunca oturum açar
 * - joinTableSession          : Arkadaş aynı masaya katılır
 * - assignUserRole            : Süper admin rol atar
 * - bootstrapSuperAdmin       : İlk süper admini oluşturur (tek kullanımlık)
 * - onOrderCreated            : Firestore trigger, sipariş oluşunca sadakat puanı ekler
 * - sendBroadcastNotification : Toplu push bildirim gönderir
 */

import { initializeApp } from 'firebase-admin/app';
import { getFirestore, FieldValue, Timestamp } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { getMessaging } from 'firebase-admin/messaging';
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import { defineSecret } from 'firebase-functions/params';
import crypto from 'node:crypto';

initializeApp();
const db = getFirestore();
const auth = getAuth();

const REGION = 'europe-west1';

// QR imzalama anahtarı — Firebase secret:
// firebase functions:secrets:set QR_SIGNING_KEY
const QR_SIGNING_KEY = defineSecret('QR_SIGNING_KEY');

// ============================================================
// Yardımcılar
// ============================================================

function base64UrlEncode(buf) {
  return Buffer.from(buf).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlDecodeToString(str) {
  const pad = '='.repeat((4 - (str.length % 4)) % 4);
  return Buffer.from((str + pad).replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8');
}

function hmacSign(payload, key) {
  return base64UrlEncode(crypto.createHmac('sha256', key).update(payload).digest());
}

async function requireAuth(request) {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Giriş gerekli');
  return request.auth;
}

async function requireRole(request, ...roles) {
  const authData = await requireAuth(request);
  const userSnap = await db.doc(`users/${authData.uid}`).get();
  if (!userSnap.exists) throw new HttpsError('permission-denied', 'Kullanıcı profili yok');
  const role = userSnap.get('role');
  if (!roles.includes(role)) {
    throw new HttpsError('permission-denied', `Yetki yok (${roles.join(' veya ')} gerekli)`);
  }
  return { uid: authData.uid, role, venueId: userSnap.get('venueId') };
}

// ============================================================
// createTableToken — Masa için imzalı QR token üretir
// Format: payloadB64.signature
// Payload: { v: venueId, t: tableId, exp }
// ============================================================
export const createTableToken = onCall(
  { region: REGION, secrets: [QR_SIGNING_KEY] },
  async (request) => {
    const { venueId, tableId, ttlDays = 365 } = request.data || {};
    const user = await requireRole(request, 'venue_admin', 'superadmin');

    if (!venueId || !tableId) throw new HttpsError('invalid-argument', 'venueId ve tableId gerekli');
    if (user.role === 'venue_admin' && user.venueId !== venueId) {
      throw new HttpsError('permission-denied', 'Bu mekana yetkin yok');
    }

    // Masa varlığını doğrula
    const tableSnap = await db.doc(`venues/${venueId}/tables/${tableId}`).get();
    if (!tableSnap.exists) throw new HttpsError('not-found', 'Masa bulunamadı');

    const exp = Math.floor(Date.now() / 1000) + ttlDays * 86400;
    const payload = { v: venueId, t: tableId, exp };
    const payloadB64 = base64UrlEncode(JSON.stringify(payload));
    const sig = hmacSign(payloadB64, QR_SIGNING_KEY.value());
    const token = `${payloadB64}.${sig}`;

    return { token, exp };
  }
);

// ============================================================
// openTableSession — Müşteri QR okuyunca oturum açar
// ============================================================
export const openTableSession = onCall(
  { region: REGION, secrets: [QR_SIGNING_KEY] },
  async (request) => {
    const { token } = request.data || {};
    const authData = await requireAuth(request);

    if (!token) throw new HttpsError('invalid-argument', 'Token gerekli');
    const parts = token.split('.');
    if (parts.length !== 2) throw new HttpsError('invalid-argument', 'Token formatı hatalı');

    const [payloadB64, sig] = parts;
    const expectedSig = hmacSign(payloadB64, QR_SIGNING_KEY.value());
    if (sig !== expectedSig) throw new HttpsError('permission-denied', 'Token imzası geçersiz');

    let payload;
    try {
      payload = JSON.parse(base64UrlDecodeToString(payloadB64));
    } catch {
      throw new HttpsError('invalid-argument', 'Token çözülemedi');
    }

    const now = Math.floor(Date.now() / 1000);
    if (payload.exp < now) throw new HttpsError('deadline-exceeded', 'Token süresi dolmuş');

    const { v: venueId, t: tableId } = payload;

    // Venue yayında mı?
    const venueSnap = await db.doc(`venues/${venueId}`).get();
    if (!venueSnap.exists || !venueSnap.get('published')) {
      throw new HttpsError('not-found', 'Mekan aktif değil');
    }

    // Oturum oluştur (3 saat geçerli)
    const sessionRef = db.collection(`venues/${venueId}/sessions`).doc();
    const sessionData = {
      venueId,
      tableId,
      openedBy: authData.uid,
      participants: [authData.uid],
      status: 'active',
      createdAt: FieldValue.serverTimestamp(),
      expiresAt: Timestamp.fromMillis(Date.now() + 3 * 60 * 60 * 1000)
    };
    await sessionRef.set(sessionData);

    return {
      sessionId: sessionRef.id,
      venueId,
      tableId,
      expiresAt: sessionData.expiresAt.toMillis()
    };
  }
);

// ============================================================
// joinTableSession — Arkadaş aynı masaya katılır
// ============================================================
export const joinTableSession = onCall({ region: REGION }, async (request) => {
  const { venueId, sessionId } = request.data || {};
  const authData = await requireAuth(request);

  if (!venueId || !sessionId) throw new HttpsError('invalid-argument', 'venueId ve sessionId gerekli');

  const ref = db.doc(`venues/${venueId}/sessions/${sessionId}`);
  const snap = await ref.get();
  if (!snap.exists) throw new HttpsError('not-found', 'Oturum bulunamadı');

  const session = snap.data();
  if (session.status !== 'active') throw new HttpsError('failed-precondition', 'Oturum kapalı');
  if (session.expiresAt.toMillis() < Date.now()) {
    throw new HttpsError('deadline-exceeded', 'Oturum süresi doldu');
  }

  await ref.update({ participants: FieldValue.arrayUnion(authData.uid) });
  return { success: true, tableId: session.tableId };
});

// ============================================================
// ============================================================
// createVenueWithOwner — Süper admin mekan oluşturur ve sahibine
// e-posta/şifre ile venue_admin hesabı atar
// ============================================================
export const createVenueWithOwner = onCall({ region: REGION }, async (request) => {
  await requireRole(request, 'superadmin');
  const {
    name, slug, ownerEmail, ownerPassword,
    ownerDisplayName, welcomeText, description, plan
  } = request.data || {};

  // Validasyon
  if (!name?.trim()) throw new HttpsError('invalid-argument', 'Mekan adı gerekli');
  if (!slug?.trim()) throw new HttpsError('invalid-argument', 'Slug gerekli');
  if (!ownerEmail?.trim()) throw new HttpsError('invalid-argument', 'Sahibin e-postası gerekli');
  if (!ownerPassword || ownerPassword.length < 6) {
    throw new HttpsError('invalid-argument', 'Şifre en az 6 karakter olmalı');
  }

  // Slug zaten var mı?
  const slugDoc = await db.doc(`slug_index/${slug.trim()}`).get();
  if (slugDoc.exists) {
    throw new HttpsError('already-exists', 'Bu slug zaten kullanımda');
  }

  // 1. Auth kullanıcısı oluştur veya mevcut kullanıcıyı bul
  let ownerUid;
  let isNewUser = false;
  try {
    const existing = await auth.getUserByEmail(ownerEmail.trim().toLowerCase()).catch(() => null);
    if (existing) {
      // Mevcut kullanıcı: şifreyi güncelle
      ownerUid = existing.uid;
      await auth.updateUser(ownerUid, { password: ownerPassword });
    } else {
      // Yeni kullanıcı oluştur
      const newUser = await auth.createUser({
        email: ownerEmail.trim().toLowerCase(),
        password: ownerPassword,
        displayName: ownerDisplayName || name.trim(),
        emailVerified: false
      });
      ownerUid = newUser.uid;
      isNewUser = true;
    }
  } catch (e) {
    console.error('[createVenueWithOwner] auth:', e);
    throw new HttpsError('internal', 'Kullanıcı oluşturulamadı: ' + e.message);
  }

  // 2. Venue ID üret
  const venueId = 'v_' + crypto.randomBytes(6).toString('hex');

  // 3. Venue dokümanı
  const venueData = {
    branding: {
      name: name.trim(),
      welcomeText: welcomeText?.trim() || null,
      description: description?.trim() || null,
      primaryColor: '#f97316',
      softColor: '#fff7ed',
      accentColor: '#eab308'
    },
    slug: slug.trim(),
    ownerEmail: ownerEmail.trim().toLowerCase(),
    ownerUid,
    published: false,
    suspended: false,
    plan: plan || 'free',
    features: {
      multiUserTable: true,
      separateOrders: false,
      callWaiter: true,
      productNotes: true,
      tipping: false,
      customerRegister: 'anonymous',
      loyalty: { enabled: false }
    },
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp()
  };

  // 4. Batch: venue + slug_index + user role
  const batch = db.batch();
  batch.set(db.doc(`venues/${venueId}`), venueData);
  batch.set(db.doc(`slug_index/${slug.trim()}`), {
    venueId,
    createdAt: FieldValue.serverTimestamp()
  });
  batch.set(db.doc(`users/${ownerUid}`), {
    role: 'venue_admin',
    venueId,
    email: ownerEmail.trim().toLowerCase(),
    displayName: ownerDisplayName || name.trim(),
    updatedAt: FieldValue.serverTimestamp(),
    createdAt: FieldValue.serverTimestamp()
  }, { merge: true });

  await batch.commit();

  // 5. Custom claims
  await auth.setCustomUserClaims(ownerUid, { role: 'venue_admin', venueId });

  return {
    success: true,
    venueId,
    ownerUid,
    isNewUser,
    credentials: {
      email: ownerEmail.trim().toLowerCase(),
      password: ownerPassword
    }
  };
});

// ============================================================
// assignUserRole — Süper admin rol atar
// ============================================================
export const assignUserRole = onCall({ region: REGION }, async (request) => {
  await requireRole(request, 'superadmin');
  const { targetUid, role, venueId } = request.data || {};

  const validRoles = ['venue_admin', 'waiter', 'superadmin'];
  if (!validRoles.includes(role)) throw new HttpsError('invalid-argument', 'Geçersiz rol');
  if (role !== 'superadmin' && !venueId) {
    throw new HttpsError('invalid-argument', 'venueId gerekli');
  }

  const targetUser = await auth.getUser(targetUid).catch(() => null);
  if (!targetUser) throw new HttpsError('not-found', 'Hedef kullanıcı yok');

  // Custom claims (opsiyonel, ileride faydalı)
  await auth.setCustomUserClaims(targetUid, { role, venueId: venueId || null });

  // Firestore user doc
  await db.doc(`users/${targetUid}`).set(
    {
      role,
      venueId: venueId || null,
      email: targetUser.email || null,
      displayName: targetUser.displayName || null,
      updatedAt: FieldValue.serverTimestamp()
    },
    { merge: true }
  );

  return { success: true };
});

// ============================================================
// bootstrapSuperAdmin — İlk süper admini oluşturur
// Sadece hiç süper admin yoksa çalışır (tek kullanımlık)
// ============================================================
export const bootstrapSuperAdmin = onCall({ region: REGION }, async (request) => {
  const authData = await requireAuth(request);

  // Zaten süper admin var mı?
  const existingSnap = await db.collection('users').where('role', '==', 'superadmin').limit(1).get();
  if (!existingSnap.empty) {
    throw new HttpsError('already-exists', 'Süper admin zaten mevcut');
  }

  await auth.setCustomUserClaims(authData.uid, { role: 'superadmin' });
  await db.doc(`users/${authData.uid}`).set(
    {
      role: 'superadmin',
      email: authData.token.email || null,
      createdAt: FieldValue.serverTimestamp()
    },
    { merge: true }
  );

  return { success: true };
});

// ============================================================
// onOrderCreated — Sipariş oluşunca sadakat puanı ekler
// Kural: her 10 TL için 1 puan (feature toggle: venue.features.loyalty)
// ============================================================
export const onOrderCreated = onDocumentCreated(
  { region: REGION, document: 'venues/{venueId}/orders/{orderId}' },
  async (event) => {
    const order = event.data?.data();
    if (!order) return;

    const { venueId } = event.params;
    const customerUid = order.customerUid;
    if (!customerUid) return;

    const venueSnap = await db.doc(`venues/${venueId}`).get();
    const features = venueSnap.get('features') || {};
    if (!features.loyalty) return;

    const points = Math.floor((order.total || 0) / 10);
    if (points <= 0) return;

    const customerRef = db.doc(`venues/${venueId}/customers/${customerUid}`);
    const txRef = db.collection(`venues/${venueId}/loyalty_transactions`).doc();

    await db.runTransaction(async (tx) => {
      const custSnap = await tx.get(customerRef);
      const current = custSnap.exists ? custSnap.get('points') || 0 : 0;
      const totalSpent = custSnap.exists ? custSnap.get('totalSpent') || 0 : 0;

      if (custSnap.exists) {
        tx.update(customerRef, {
          points: current + points,
          totalSpent: totalSpent + (order.total || 0),
          lastVisit: FieldValue.serverTimestamp()
        });
      } else {
        tx.set(customerRef, {
          points,
          totalSpent: order.total || 0,
          lastVisit: FieldValue.serverTimestamp(),
          createdAt: FieldValue.serverTimestamp()
        });
      }

      tx.set(txRef, {
        customerUid,
        orderId: event.params.orderId,
        points,
        amount: order.total || 0,
        type: 'earn',
        createdAt: FieldValue.serverTimestamp()
      });
    });
  }
);

// ============================================================
// sendBroadcastNotification — Toplu push bildirim
// ============================================================
export const sendBroadcastNotification = onCall({ region: REGION }, async (request) => {
  const user = await requireRole(request, 'venue_admin', 'superadmin');
  const { venueId, title, body, imageUrl } = request.data || {};

  if (!venueId || !title || !body) {
    throw new HttpsError('invalid-argument', 'venueId, title, body gerekli');
  }
  if (user.role === 'venue_admin' && user.venueId !== venueId) {
    throw new HttpsError('permission-denied', 'Bu mekana yetkin yok');
  }

  const topic = `venue_${venueId}`;
  const message = {
    topic,
    notification: {
      title: title.slice(0, 100),
      body: body.slice(0, 500),
      imageUrl: imageUrl || undefined
    }
  };

  const notifRef = db.collection(`venues/${venueId}/notifications`).doc();
  await notifRef.set({
    title,
    body,
    imageUrl: imageUrl || null,
    sentBy: user.uid,
    topic,
    createdAt: FieldValue.serverTimestamp()
  });

  try {
    await getMessaging().send(message);
    await notifRef.update({ status: 'sent' });
    return { success: true, notificationId: notifRef.id };
  } catch (e) {
    await notifRef.update({ status: 'error', error: String(e.message || e) });
    throw new HttpsError('internal', 'Bildirim gönderilemedi: ' + e.message);
  }
});
