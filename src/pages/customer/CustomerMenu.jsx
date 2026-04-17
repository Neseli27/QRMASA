import { useParams } from 'react-router-dom';
import { useEffect } from 'react';
import { ensureTableSession } from '../../utils/session';

export default function CustomerMenu() {
  const { slug, table } = useParams();

  useEffect(() => {
    // QR'dan açıldığında session'ı hazırla
    ensureTableSession(slug, table);
  }, [slug, table]);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-100 px-4 py-3 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-lg font-bold text-gray-900">{slug}</h1>
          <p className="text-xs text-gray-500">Masa {table}</p>
        </div>
      </header>

      <main className="max-w-2xl mx-auto p-4">
        <div className="bg-white rounded-2xl p-8 text-center border border-gray-100">
          <div className="text-5xl mb-4">🍽️</div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Menü yükleniyor...</h2>
          <p className="text-sm text-gray-500">
            Bu sayfada ürün kartları, kategoriler ve sepet görünecek.
          </p>
          <p className="text-xs text-gray-400 mt-4">
            (Adım 2'de geliştireceğiz)
          </p>
        </div>
      </main>
    </div>
  );
}
