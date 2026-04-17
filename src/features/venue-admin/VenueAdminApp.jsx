import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { VenueProvider } from '../../contexts/VenueContext';
import { LoadingScreen, ErrorScreen } from '../../components/ui/StateScreens';
import { VenueAdminLayout } from './components/VenueAdminLayout';
import DashboardPage from './pages/DashboardPage';
import { ComingSoonPage } from './pages/ComingSoonPage';

/**
 * VenueAdminApp
 * --------------
 * - Yetki kontrolü (venue_admin, superadmin)
 * - Kendi venue'sunu VenueContext ile sarar
 * - Alt route'lar için layout sağlar
 */
export default function VenueAdminApp() {
  const location = useLocation();
  const { loading, isAuthed, hasRole, venueId, role, profile } = useAuth();

  if (loading) return <LoadingScreen />;

  // Giriş yapmamış → login'e
  if (!isAuthed) {
    return <Navigate to="/giris" state={{ from: location }} replace />;
  }

  // Rol yok veya yanlış rol
  if (!hasRole('venue_admin', 'superadmin')) {
    return (
      <ErrorScreen
        title="Erişim yetkin yok"
        message={
          role === 'waiter'
            ? 'Garson hesapları yönetim paneline erişemez. /garson adresine git.'
            : 'Bu alana erişmek için işletme yöneticisi olmalısın.'
        }
      />
    );
  }

  // Venue admin ise ama venueId yoksa — profil hatası
  if (role === 'venue_admin' && !venueId) {
    return (
      <ErrorScreen
        title="İşletme bilgisi eksik"
        message="Hesabına bir işletme atanmamış. Süper admin ile iletişime geç."
      />
    );
  }

  // Superadmin için venueId seçilmeli (Faz 2'de süper admin mekan seçim arayüzü eklenecek)
  // Şimdilik sadece venue_admin'e odaklıyoruz
  if (role === 'superadmin' && !venueId) {
    return (
      <ErrorScreen
        title="Mekan seçilmedi"
        message="Süper admin olarak bir mekan seçmek için /superadmin paneline git."
      />
    );
  }

  return (
    <VenueProvider venueId={venueId}>
      <VenueAdminLayout>
        <Routes>
          <Route index element={<DashboardPage />} />
          <Route
            path="menu"
            element={
              <ComingSoonPage
                title="Menü Yönetimi"
                description="Kategoriler ve ürünler"
                features={[
                  'Kategori ekle / sırala / sil',
                  'Ürün ekle (ad, açıklama, fiyat, resim)',
                  'Varyant ve opsiyonlar',
                  'Stok / tükendi durumu',
                  'Toplu fiyat güncelleme'
                ]}
              />
            }
          />
          <Route
            path="masalar"
            element={
              <ComingSoonPage
                title="Masa Yönetimi"
                description="Masa ve QR kodları"
                features={[
                  'Masa ekle (isim, kapasite, bölge)',
                  'Her masa için QR kod üretme',
                  'Toplu QR yazdırma (PDF)',
                  'QR pasif etme / yenileme'
                ]}
              />
            }
          />
          <Route
            path="siparisler"
            element={
              <ComingSoonPage
                title="Siparişler"
                description="Canlı sipariş ekranı"
                features={[
                  'Gerçek zamanlı sipariş listesi',
                  'Durum güncelleme (Alındı → Hazırlanıyor → Hazır → Servis)',
                  'Sesli uyarı',
                  'Masa bazlı gruplama'
                ]}
              />
            }
          />
          <Route
            path="sadakat"
            element={
              <ComingSoonPage
                title="Sadakat & Kampanyalar"
                description="Müşteri kazanma ve tutma araçları"
                features={[
                  'Cashback (iade harcama)',
                  'Puan sistemi',
                  'Damga kart (10 al 1 bedava)',
                  'Seviye sistemi (Bronz/Gümüş/Altın)',
                  'Kampanya yönetimi',
                  'Push bildirim'
                ]}
              />
            }
          />
          <Route
            path="personel"
            element={
              <ComingSoonPage
                title="Personel"
                description="Garson ve çalışan yönetimi"
                features={[
                  'Garson ekle (email ile davet)',
                  'Rol atama',
                  'Aktif / pasif durumu'
                ]}
              />
            }
          />
          <Route
            path="branding"
            element={
              <ComingSoonPage
                title="Marka Ayarları"
                description="Logo, renkler, PWA ikonu"
                features={[
                  'Logo yükleme',
                  'Favicon',
                  'PWA ikonu (192x192, 512x512)',
                  'Primary / Accent renkler',
                  'Hoş geldin metni',
                  'Önizleme paneli'
                ]}
              />
            }
          />
          <Route
            path="ayarlar"
            element={
              <ComingSoonPage
                title="Ayarlar"
                description="Özellik anahtarları ve işletme bilgileri"
                features={[
                  'Feature toggle: çoklu kullanıcı masa',
                  'Feature toggle: garson çağırma',
                  'Feature toggle: ürün notları',
                  'Müşteri kayıt modu (anonim / zorunlu)',
                  'Sadakat modları'
                ]}
              />
            }
          />
          <Route path="*" element={<Navigate to="/yonetim" replace />} />
        </Routes>
      </VenueAdminLayout>
    </VenueProvider>
  );
}
