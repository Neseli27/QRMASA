export default function KitchenPanel() {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-100 px-4 py-3 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <h1 className="text-lg font-bold text-gray-900">Mutfak Paneli</h1>
          <span className="text-xs text-gray-500">Hazırlanacak siparişler</span>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-4">
        <div className="bg-white rounded-2xl p-8 text-center border border-gray-100">
          <div className="text-5xl mb-4">🍳</div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Mutfak Paneli</h2>
          <p className="text-sm text-gray-500">
            Onaylanmış siparişler ve "hazır" butonu burada olacak.
          </p>
          <p className="text-xs text-gray-400 mt-4">
            (Adım 5'te geliştireceğiz)
          </p>
        </div>
      </main>
    </div>
  );
}
