import { useAuth } from '../../contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import { LoadingScreen } from '../../components/ui/StateScreens';

// Süper admin — Faz 2'de: mekan ekle/onayla, feature toggle, abonelik, global raporlar
export default function SuperAdminApp() {
  const { loading, isAuthed, hasRole } = useAuth();

  if (loading) return <LoadingScreen />;
  if (!isAuthed) return <Navigate to="/giris" replace />;
  if (!hasRole('superadmin')) return <Navigate to="/" replace />;

  return (
    <div className="min-h-[100dvh] bg-slate-950 text-slate-100">
      <header className="border-b border-slate-800 px-6 py-4">
        <h1 className="font-display text-xl font-bold">Süper Admin</h1>
      </header>
      <main className="p-6">
        <div className="bg-slate-900 rounded-2xl p-8 text-center border border-slate-800">
          <p className="text-slate-300">Süper admin paneli Faz 2'de geliştirilecek.</p>
        </div>
      </main>
    </div>
  );
}
