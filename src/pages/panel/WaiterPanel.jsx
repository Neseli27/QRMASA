export default function WaiterPanel() {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-100 px-4 py-3 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <h1 className="text-lg font-bold text-gray-900">Garson Paneli</h1>
          <span className="text-xs text-gray-500">Bekleyen siparişler</span>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-4">
        <div className="bg-white rounded-2xl p-8 text-center border border-gray-100">
          <div className="text-5xl mb-4">🧑‍💼</div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Garson Paneli</h2>
          <p className="text-sm text-gray-500">
            Bekleyen siparişler, "ben alıyorum" butonu ve onay akışı burada olacak.
          </p>
          <p className="text-xs text-gray-400 mt-4">
            (Adım 4'te geliştireceğiz)
          </p>
        </div>
      </main>
    </div>
  );
}
