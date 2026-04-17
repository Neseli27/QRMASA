import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from '../contexts/AuthContext';
import { LoadingScreen } from '../components/ui/StateScreens';
import { lazy, Suspense } from 'react';

// Lazy loading — her rol için ayrı bundle
const LandingPage = lazy(() => import('../features/landing/LandingPage.jsx'));
const CustomerApp = lazy(() => import('../features/customer/CustomerApp.jsx'));
const VenueAdminApp = lazy(() => import('../features/venue-admin/VenueAdminApp.jsx'));
const WaiterApp = lazy(() => import('../features/waiter/WaiterApp.jsx'));
const SuperAdminApp = lazy(() => import('../features/superadmin/SuperAdminApp.jsx'));
const LoginPage = lazy(() => import('../features/auth/LoginPage.jsx'));
const NotFoundPage = lazy(() => import('../features/landing/NotFoundPage.jsx'));

/**
 * URL yapısı:
 *   /                          → Tanıtım (QRMasa landing)
 *   /m/:slug?t=...&k=...       → Müşteri menüsü (QR ile geliş)
 *   /giris                     → Personel girişi
 *   /yonetim/*                 → İşletme paneli (venue_admin)
 *   /garson/*                  → Garson paneli
 *   /superadmin/*              → Süper admin
 */
export default function App() {
  return (
    <AuthProvider>
      <Suspense fallback={<LoadingScreen />}>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/m/:slug/*" element={<CustomerApp />} />
          <Route path="/giris" element={<LoginPage />} />
          <Route path="/yonetim/*" element={<VenueAdminApp />} />
          <Route path="/garson/*" element={<WaiterApp />} />
          <Route path="/superadmin/*" element={<SuperAdminApp />} />
          <Route path="/404" element={<NotFoundPage />} />
          <Route path="*" element={<Navigate to="/404" replace />} />
        </Routes>
      </Suspense>
    </AuthProvider>
  );
}
