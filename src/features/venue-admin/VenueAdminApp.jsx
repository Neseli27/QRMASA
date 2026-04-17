import { useAuth } from '../../contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import { LoadingScreen } from '../../components/ui/StateScreens';

// İşletme yönetim paneli — Faz 2'de: menü CRUD, masa/QR, personel, siparişler, sadakat, raporlar
export default function VenueAdminApp() {
  const { loading, isAuthed, hasRole } = useAuth();

  if (loading) return <LoadingScreen />;
  if (!isAuthed) return <Navigate to="/giris" replace />;
  if (!hasRole('venue_admin', 'superadmin')) return <Navigate to="/" replace />;

  return (
    <div className="min-h-[100dvh] bg-slate-50">
      <header className="bg-white border-b border-slate-200 px-6 py-4">
        <h1 className="font-display text-xl font-bold">İşletme Yönetimi</h1>
      </header>
      <main className="p-6">
        <div className="card p-8 text-center">
          <p className="text-slate-600">İşletme paneli Faz 2'de geliştirilecek.</p>
          <ul className="mt-4 text-sm text-slate-500 space-y-1 inline-block text-left">
            <li>• Menü & kategori CRUD</li>
            <li>• Masa & QR kod üretimi</li>
            <li>• Personel yönetimi</li>
            <li>• Canlı sipariş ekranı</li>
            <li>• Sadakat & kampanya</li>
            <li>• Raporlar</li>
          </ul>
        </div>
      </main>
    </div>
  );
}
