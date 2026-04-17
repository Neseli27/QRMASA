import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { LoadingScreen } from '../../components/ui/StateScreens';
import { SuperAdminLayout } from './components/SuperAdminLayout';
import SuperAdminDashboardPage from './pages/SuperAdminDashboardPage';
import SuperAdminVenuesPage from './pages/SuperAdminVenuesPage';
import SuperAdminVenueDetailPage from './pages/SuperAdminVenueDetailPage';

export default function SuperAdminApp() {
  const { loading, isAuthed, hasRole, profileLoaded } = useAuth();

  if (loading) return <LoadingScreen theme="dark" />;
  if (!isAuthed) return <Navigate to="/giris" replace />;
  if (!profileLoaded) return <LoadingScreen theme="dark" message="Profil yükleniyor..." />;
  if (!hasRole('superadmin')) return <Navigate to="/" replace />;

  return (
    <SuperAdminLayout>
      <Routes>
        <Route index element={<SuperAdminDashboardPage />} />
        <Route path="mekanlar" element={<SuperAdminVenuesPage />} />
        <Route path="mekanlar/:venueId" element={<SuperAdminVenueDetailPage />} />
        <Route path="*" element={<Navigate to="/superadmin" replace />} />
      </Routes>
    </SuperAdminLayout>
  );
}
