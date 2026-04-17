export default function SuperAdmin() {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-100 px-4 py-3 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <h1 className="text-lg font-bold text-gray-900">Süperadmin</h1>
          <span className="text-xs text-gray-500">Mekan yönetimi</span>
        </div>
      </header>

      <main className="max-w-5xl mx-auto p-4">
        <div className="bg-white rounded-2xl p-8 text-center border border-gray-100">
          <div className="text-5xl mb-4">⚙️</div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Süperadmin</h2>
          <p className="text-sm text-gray-500">
            Yeni mekan ekleme, feature toggle, abonelik yönetimi burada olacak.
          </p>
          <p className="text-xs text-gray-400 mt-4">
            (Adım 9'da geliştireceğiz)
          </p>
        </div>
      </main>
    </div>
  );
}
