# QRMASA

QR kod ile masadan sipariş sistemi. Müşteri masadaki QR'ı okutur, menüden sipariş verir, garson onaylar, mutfak hazırlar, kasada ödeme yapılır.

## Stack

- **Frontend:** React 18 + Vite 5
- **Styling:** Tailwind CSS 3
- **Backend:** Firebase (Firestore, Storage, Auth)
- **Routing:** React Router v6
- **Deploy:** Vercel

## Kurulum

```bash
npm install
```

`.env.example` dosyasını `.env` olarak kopyala ve Firebase değerlerini doldur:

```
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
```

## Geliştirme

```bash
npm run dev
```

`http://localhost:5173` adresinde açılır.

## Build

```bash
npm run build
```

Çıktı `dist/` klasöründe.

## Rotalar

| Rota | Açıklama |
|------|----------|
| `/` | Landing page |
| `/m/:slug/:table` | Müşteri menüsü (QR'dan açılan) |
| `/panel/giris` | Personel giriş |
| `/panel/garson` | Garson paneli |
| `/panel/mutfak` | Mutfak paneli |
| `/panel/yonetici` | Yönetici paneli |
| `/admin` | Süperadmin |

## Deploy

GitHub'a push → Vercel otomatik deploy.

Vercel'de environment variables olarak `.env` değerlerini tek tek ekle.

## Firestore Koleksiyonları

```
venues/{venueId}
  ├─ tables/{tableId}
  ├─ categories/{categoryId}
  ├─ products/{productId}
  ├─ staff/{staffId}
  ├─ orders/{orderId}
  └─ sessions/{sessionId}
```
