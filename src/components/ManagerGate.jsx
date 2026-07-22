import { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { observeAuthState } from '../firebase/auth';

export default function ManagerGate({ children }) {
  const location = useLocation();
  const [state, setState] = useState({ loading: true, user: null, error: '' });

  useEffect(() => {
    let unsubscribe;
    try {
      unsubscribe = observeAuthState(
        (user) => setState({ loading: false, user, error: '' }),
        (error) => setState({ loading: false, user: null, error: error?.message || 'Hesap doğrulanamadı.' }),
      );
    } catch (error) {
      setState({ loading: false, user: null, error: error?.message || 'Hesap doğrulanamadı.' });
    }
    return () => unsubscribe?.();
  }, []);

  if (state.loading) {
    return (
      <div className="min-h-screen bg-neutral-950 text-white grid place-items-center p-6">
        <div className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent" />
          <h1 className="text-xl font-bold">İşletme hesabı doğrulanıyor</h1>
        </div>
      </div>
    );
  }

  if (state.error) {
    return (
      <div className="min-h-screen bg-neutral-950 text-white grid place-items-center p-6">
        <div className="w-full max-w-lg rounded-3xl border border-red-500/30 bg-neutral-900 p-7 text-center">
          <div className="text-5xl">⚠️</div>
          <h1 className="mt-4 text-2xl font-black">Hesap doğrulanamadı</h1>
          <p className="mt-2 text-sm text-red-200">{state.error}</p>
        </div>
      </div>
    );
  }

  if (!state.user || state.user.isAnonymous) {
    const returnPath = `${location.pathname}${location.search}`;
    return <Navigate to={`/panel/hesap?return=${encodeURIComponent(returnPath)}`} replace />;
  }

  return children;
}
