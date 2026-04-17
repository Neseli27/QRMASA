import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <div className="text-6xl mb-4">🤷</div>
      <h1 className="text-4xl font-bold text-gray-900">404</h1>
      <p className="text-gray-500 mt-2">Aradığın sayfa bulunamadı</p>
      <Link
        to="/"
        className="mt-6 bg-primary-500 hover:bg-primary-600 text-white font-semibold px-6 py-3 rounded-xl transition"
      >
        Ana sayfaya dön
      </Link>
    </div>
  );
}
