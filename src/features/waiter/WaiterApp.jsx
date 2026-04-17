import { useAuth } from '../../contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import { LoadingScreen } from '../../components/ui/StateScreens';

// Garson paneli — Faz 4'te: canlı sipariş listesi, masa durumu, çağrı
export default function WaiterApp() {
  const { loading, isAuthed, hasRole } = useAuth();

  if (loading) return <LoadingScreen />;
  if (!isAuthed) return <Navigate to="/giris" replace />;
  if (!hasRole('waiter', 'venue_admin', 'superadmin')) return <Navigate to="/" replace />;

  return (
    <div className="min-h-[100dvh] bg-slate-50">
      <header className="bg-white border-b border-slate-200 px-6 py-4">
        <h1 className="font-display text-xl font-bold">Garson Paneli</h1>
      </header>
      <main className="p-6">
        <div className="card p-8 text-center">
          <p className="text-slate-600">Garson paneli Faz 4'te geliştirilecek.</p>
        </div>
      </main>
    </div>
  );
}
