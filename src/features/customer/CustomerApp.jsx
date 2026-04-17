import { useEffect, useState } from 'react';
import { useParams, useSearchParams, Routes, Route, Navigate } from 'react-router-dom';
import { collection, query, where, limit, getDocs, doc, getDoc } from 'firebase/firestore';
import { ShieldAlert, QrCode, RefreshCw } from 'lucide-react';
import { db } from '../../lib/firebase';
import { collections } from '../../lib/paths';
import { VenueProvider } from '../../contexts/VenueContext';
import { CustomerProvider, useCustomer } from '../../contexts/CustomerContext';
import CustomerMenuPage from './pages/CustomerMenuPage';
import CartPage from './pages/CartPage';

/**
 * CustomerApp
 * ------------
 * URL: /m/:slug?t=TABLE_ID&k=TOKEN
 *
 * 1. Slug → venueId (slug_index)
 * 2. Token doğrula (Cloud Function joinTableSession)
 * 3. VenueProvider + CustomerProvider sağla
 * 4. Alt route'lar: menü, sepet
 */
export default function CustomerApp() {
  const { slug } = useParams();
  const [searchParams] = useSearchParams();
  const tableId = searchParams.get('t');
  const token = searchParams.get('k');

  const [venueId, setVenueId] = useState(null);
  const [venueStatus, setVenueStatus] = useState(null); // 'ok' | 'suspended' | 'notfound' | null
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Slug → venueId lookup
  useEffect(() => {
    if (!slug) {
      setError('Geçersiz adres');
      setLoading(false);
      return;
    }

    (async () => {
      try {
        // slug_index'ten venueId'yi bul
        const slugDoc = await getDoc(doc(db, collections.slugIndex, slug));
        if (!slugDoc.exists()) {
          setVenueStatus('notfound');
          setLoading(false);
          return;
        }

        const vId = slugDoc.data().venueId;

        // Venue status kontrolü
        const venueDoc = await getDoc(doc(db, collections.venues, vId));
        if (!venueDoc.exists()) {
          setVenueStatus('notfound');
          setLoading(false);
          return;
        }

        const venueData = venueDoc.data();
        if (venueData.suspended) {
          setVenueStatus('suspended');
          setLoading(false);
          return;
        }
        if (!venueData.published) {
          setVenueStatus('notpublished');
          setLoading(false);
          return;
        }

        setVenueId(vId);
        setVenueStatus('ok');
        setLoading(false);
      } catch (e) {
        console.error('[CustomerApp] venue lookup:', e);
        setError(e.message || 'Mekan bilgisi alınamadı');
        setLoading(false);
      }
    })();
  }, [slug]);

  if (loading) return <LoadingState />;

  if (error) return <ErrorState title="Bir sorun oluştu" message={error} showRetry />;

  if (venueStatus === 'notfound') {
    return <ErrorState title="Mekan bulunamadı" message="Bu QR kod geçersiz veya mekan kapanmış olabilir." />;
  }

  if (venueStatus === 'suspended') {
    return <ErrorState title="Mekan geçici olarak kapalı" message="İşletme bir süre hizmet vermiyor. Daha sonra tekrar dene." />;
  }

  if (venueStatus === 'notpublished') {
    return <ErrorState title="Mekan henüz hizmette değil" message="İşletme sistemi henüz aktifleştirmemiş." />;
  }

  // Token/tableId eksikse hata
  if (!tableId || !token) {
    return (
      <ErrorState
        title="Geçersiz QR"
        message="QR kodu eksik veya bozuk. Masadaki QR'ı tekrar tara veya garsona haber ver."
      />
    );
  }

  return (
    <VenueProvider venueId={venueId}>
      <CustomerProvider venueId={venueId} tableId={tableId} token={token}>
        <CustomerRouter />
      </CustomerProvider>
    </VenueProvider>
  );
}

/**
 * Session durumuna göre routing
 */
function CustomerRouter() {
  const { sessionLoading, sessionError } = useCustomer();

  if (sessionLoading) return <LoadingState message="Masa oturumu açılıyor..." />;

  if (sessionError) {
    return (
      <ErrorState
        title="Masa oturumu açılamadı"
        message={sessionError}
        showRetry
      />
    );
  }

  return (
    <div
      className="min-h-[100dvh]"
      style={{ backgroundColor: 'rgb(var(--brand-soft-rgb))' }}
    >
      <Routes>
        <Route index element={<CustomerMenuPage />} />
        <Route path="sepet" element={<CartPage />} />
        <Route path="*" element={<Navigate to="." replace />} />
      </Routes>
    </div>
  );
}

// ═══════════════════════════════════════════════════
// Loading / Error state'leri
// ═══════════════════════════════════════════════════
function LoadingState({ message = 'Yükleniyor...' }) {
  return (
    <div className="min-h-[100dvh] flex flex-col items-center justify-center p-6 bg-slate-50">
      <div className="w-12 h-12 border-4 border-slate-200 border-t-orange-500 rounded-full animate-spin mb-4" />
      <p className="text-sm text-slate-600 font-medium">{message}</p>
    </div>
  );
}

function ErrorState({ title, message, showRetry }) {
  return (
    <div className="min-h-[100dvh] flex flex-col items-center justify-center p-6 bg-slate-50 text-center">
      <div className="w-16 h-16 rounded-2xl bg-red-50 flex items-center justify-center mb-4">
        <ShieldAlert className="w-8 h-8 text-red-500" />
      </div>
      <h1 className="font-display text-2xl font-bold text-slate-900 mb-2">{title}</h1>
      <p className="text-sm text-slate-600 max-w-md mb-6">{message}</p>
      {showRetry && (
        <button
          onClick={() => window.location.reload()}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900 text-white font-semibold hover:bg-slate-800 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Tekrar Dene
        </button>
      )}
    </div>
  );
}
