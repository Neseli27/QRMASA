# QRMasa

> QR tabanlı modern sipariş ve sadakat platformu. Kafeler, restoranlar, hamburgerciler ve pizzacılar için.

## 🎯 Platform

- **Müşteri**: QR okut → menü gör → sipariş ver → puan kazan (PWA)
- **Garson**: Canlı sipariş ekranı, durum güncelleme
- **İşletme**: Menü, masa, personel, sadakat, kampanya, raporlar (white-label)
- **Süper Admin**: Mekan onay, feature toggle, global raporlar

## 🧱 Stack

- **Frontend**: React 18 + Vite + Tailwind CSS + React Router
- **Backend**: Firebase (Firestore + Auth + Functions + FCM + Storage)
- **PWA**: `vite-plugin-pwa` + Workbox
- **Güvenlik**: Firebase App Check (reCAPTCHA v3), Security Rules, HMAC QR Token
- **Deploy**: Vercel (frontend), Firebase (backend)

## 🔧 Firebase Projesi

- **Proje ID**: `qrmasa-74c03`
- **Firestore**: `eur3 (Europe multi-region)`
- **Storage**: `EU (multi-region)`
- **Functions Region**: `europe-west1`
- **Auth**: Email/Password + Google + Anonymous

## 📁 Klasör Yapısı

```
qrmasa/
├─ src/
│  ├─ app/                  # Routing
│  ├─ features/
│  │  ├─ landing/
│  │  ├─ auth/
│  │  ├─ customer/          # Müşteri PWA
│  │  ├─ venue-admin/       # İşletme paneli
│  │  ├─ waiter/            # Garson paneli
│  │  └─ superadmin/
│  ├─ components/ui/
│  ├─ contexts/             # AuthContext, VenueContext
│  ├─ lib/                  # firebase, security, utils, paths
│  └─ styles/
├─ functions/               # Cloud Functions
├─ public/
├─ firestore.rules
├─ storage.rules
├─ firestore.indexes.json
├─ firebase.json
├─ vercel.json
└─ vite.config.js
```

## 🚀 Kurulum (İlk Defa)

### 1. Bağımlılıkları kur

```powershell
npm install
cd functions
npm install
cd ..
```

### 2. `.env` oluştur

```powershell
copy .env.example .env
```

`.env.example` zaten QRMASA projesinin gerçek değerleriyle dolu — doğrudan `.env` olarak kopyala, değiştirme gerekmez. (App Check ve FCM key'leri sonraki fazlarda eklenecek.)

### 3. Firebase CLI

```powershell
npm install -g firebase-tools
firebase login
```

### 4. QR imzalama secret

```powershell
# Rastgele 32 byte hex key üret (PowerShell)
-join ((1..32) | ForEach-Object { '{0:x2}' -f (Get-Random -Max 256) })

# Firebase secret olarak kaydet
firebase functions:secrets:set QR_SIGNING_KEY
# prompt: üstte ürettiğin hex string'i yapıştır
```

### 5. Security Rules, Indexes ve Functions Deploy

```powershell
firebase deploy --only firestore:rules
firebase deploy --only storage
firebase deploy --only firestore:indexes
firebase deploy --only functions
```

### 6. İlk süper admini oluştur

1. Firebase Console → Authentication → Users → **Add user** (kendi e-postan ve güçlü bir şifre)
2. `npm run dev`
3. `http://localhost:5173/giris` sayfasından bu hesapla giriş yap
4. Tarayıcı console'unda (F12):

```js
const { getFunctions, httpsCallable } = await import('firebase/functions');
const { app } = await import('./src/lib/firebase');
const fns = getFunctions(app, 'europe-west1');
await httpsCallable(fns, 'bootstrapSuperAdmin')();
```

5. Sayfayı yenile — süper admin yetkileri aktif.

### 7. Lokal geliştirme

```powershell
npm run dev
```

### 8. Vercel Deploy

1. GitHub'a push et
2. Vercel Dashboard → Import project
3. Environment Variables → `.env` değerlerini ekle
4. Deploy

## 🔐 Güvenlik

- **Firestore Rules**: Rol bazlı, multi-tenant izolasyon, alan-seviyesi validation
- **Storage Rules**: Boyut + MIME type kontrolü
- **HMAC QR Token**: Cloud Functions tarafında imzalanır/doğrulanır
- **App Check**: reCAPTCHA v3 (Faz 6'da aktif)
- **Rate Limiting**: Client-side (localStorage) + Firestore Rules

## 🎨 White-Label

- Her işletme kendi markasıyla görünür (logo, renk, isim, favicon, PWA icon)
- Runtime'da CSS değişkenleri güncellenir
- Müşteri `QRMasa` adını görmez → direkt "Antep Kebap Evi" gibi açılır
- Müşteri URL'i: `qrmasa.com/m/{slug}?t={tableId}&k={token}`

## 📊 Firestore Veri Modeli

```
/users/{uid}                          → { role, venueId, email, displayName }
/slug_index/{slug}                    → { venueId }
/superadmin/{docId}                   → Global config
/venues/{venueId}                     → { branding, slug, features, published, plan }
  /categories/{catId}
  /menu_items/{itemId}
  /tables/{tableId}
  /staff/{staffId}
  /sessions/{sessionId}
  /orders/{orderId}
  /customers/{customerUid}
  /loyalty_transactions/{txId}
  /campaigns/{campaignId}
  /notifications/{notifId}
```

## ☁️ Cloud Functions

| Function | Tip | Açıklama |
|----------|-----|----------|
| `createTableToken` | Callable | Venue admin QR token üretir |
| `openTableSession` | Callable | Müşteri QR okuyunca oturum açar |
| `joinTableSession` | Callable | Arkadaş aynı masaya katılır |
| `assignUserRole` | Callable | Süper admin rol atar |
| `bootstrapSuperAdmin` | Callable | İlk süper admin (tek kullanımlık) |
| `onOrderCreated` | Trigger | Sipariş oluşunca sadakat puanı ekler |
| `sendBroadcastNotification` | Callable | Toplu push bildirim |

## 🛣 Yol Haritası

- [x] **Faz 1**: Proje iskeleti, Firebase kurulumu, Security Rules, Cloud Functions
- [ ] **Faz 2**: İşletme paneli (menü CRUD, masa/QR, personel)
- [ ] **Faz 3**: Müşteri PWA (QR → menü → sipariş)
- [ ] **Faz 4**: Garson paneli
- [ ] **Faz 5**: Sadakat + FCM bildirimler
- [ ] **Faz 6**: App Check, E2E test, güvenlik sıkılaştırma
- [ ] **Faz 7**: Production deploy + Google Play TWA
