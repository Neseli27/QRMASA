import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { VenueProvider } from '../../contexts/VenueContext';
import { LoadingScreen, ErrorScreen } from '../../components/ui/StateScreens';
import { VenueAdminLayout } from './components/VenueAdminLayout';
import DashboardPage from './pages/DashboardPage';
import MenuPage from './pages/MenuPage';
import TablesPage from './pages/TablesPage';
import StaffPage from './pages/StaffPage';
import OrdersPage from './pages/OrdersPage';
import BrandingPage from './pages/BrandingPage';
import SettingsPage from './pages/SettingsPage';
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
  const { loading, isAuthed, hasRole, venueId, role, profileLoaded } = useAuth();

  if (loading) return <LoadingScreen />;

  // Giriş yapmamış → login'e
  if (!isAuthed) {
    return <Navigate to="/giris" state={{ from: location }} replace />;
  }

  // Profile henüz yüklenmedi (Firestore'dan cevap bekleniyor)
  if (!profileLoaded) return <LoadingScreen message="Profil yükleniyor..." />;

  // Rol yok veya yanlış rol
  if (!hasRole('venue_admin')) {
    // Süper admin /yonetim'e giremez, kendi paneline yönlendir
    if (role === 'superadmin') {
      return <Navigate to="/superadmin" replace />;
    }
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

  // Venue admin ise venueId olmalı
  if (!venueId) {
    return (
      <ErrorScreen
        title="İşletme bilgisi eksik"
        message="Hesabına bir işletme atanmamış. Süper admin ile iletişime geç."
      />
    );
  }

  return (
    <VenueProvider venueId={venueId}>
      <VenueAdminLayout>
        <Routes>
          <Route index element={<DashboardPage />} />
          <Route path="menu" element={<MenuPage />} />
          <Route path="masalar" element={<TablesPage />} />
          <Route path="personel" element={<StaffPage />} />
          <Route path="siparisler" element={<OrdersPage />} />
          <Route path="branding" element={<BrandingPage />} />
          <Route path="ayarlar" element={<SettingsPage />} />
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
          <Route path="*" element={<Navigate to="/yonetim" replace />} />
        </Routes>
      </VenueAdminLayout>
    </VenueProvider>
  );
}
