import { useParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { collection, query, where, getDocs, limit } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { collections } from '../../lib/paths';
import { VenueProvider, useVenue } from '../../contexts/VenueContext';
import { LoadingScreen, ErrorScreen } from '../../components/ui/StateScreens';

// Müşteri uygulamasının giriş noktası — slug'dan venueId çözer, VenueProvider sarar
// Faz 3'te: QR token doğrulama, oturum, menü, sepet eklenir
export default function CustomerApp() {
  const { slug } = useParams();
  const [venueId, setVenueId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    async function resolveSlug() {
      try {
        // venues koleksiyonundan slug ile ara
        const q = query(collection(db, collections.venues), where('slug', '==', slug), limit(1));
        const snap = await getDocs(q);
        if (cancelled) return;
        if (snap.empty) {
          setError('Bu adreste bir mekan bulunamadı');
          setLoading(false);
          return;
        }
        setVenueId(snap.docs[0].id);
        setLoading(false);
      } catch (e) {
        if (!cancelled) {
          setError(e.message || 'Mekan yüklenemedi');
          setLoading(false);
        }
      }
    }
    resolveSlug();
    return () => { cancelled = true; };
  }, [slug]);

  if (loading) return <LoadingScreen message="Mekan hazırlanıyor..." />;
  if (error) return <ErrorScreen title="Mekan bulunamadı" message={error} />;

  return (
    <VenueProvider venueId={venueId}>
      <CustomerShell />
    </VenueProvider>
  );
}

function CustomerShell() {
  const { venue, loading } = useVenue();
  if (loading) return <LoadingScreen />;

  return (
    <div className="min-h-[100dvh] bg-white">
      <header className="px-5 py-6 border-b border-slate-100">
        <div className="flex items-center gap-3">
          {venue?.branding?.logo && (
            <img src={venue.branding.logo} alt="" className="w-12 h-12 rounded-xl object-cover" />
          )}
          <div>
            <h1 className="font-display text-2xl font-bold">{venue?.branding?.name || 'Mekan'}</h1>
            {venue?.branding?.welcomeText && (
              <p className="text-sm text-slate-500">{venue.branding.welcomeText}</p>
            )}
          </div>
        </div>
      </header>

      <main className="p-5">
        <div className="card p-6 text-center">
          <p className="text-slate-600">Müşteri menüsü Faz 3'te burada açılacak.</p>
          <p className="text-xs text-slate-400 mt-2">QR token doğrulama + menü + sepet + çoklu kullanıcı masa</p>
        </div>
      </main>
    </div>
  );
}
