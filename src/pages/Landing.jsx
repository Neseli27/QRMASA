import { Link } from 'react-router-dom';

export default function Landing() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-orange-50">
      {/* Header */}
      <header className="px-6 py-5 flex items-center justify-between max-w-6xl mx-auto">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 bg-primary-500 rounded-lg flex items-center justify-center text-white font-bold">
            Q
          </div>
          <span className="text-xl font-bold text-gray-900">QRMASA</span>
        </div>
        <Link
          to="/panel/giris"
          className="text-sm font-medium text-gray-700 hover:text-primary-600 transition"
        >
          Panel Girişi →
        </Link>
      </header>

      {/* Hero */}
      <section className="px-6 pt-12 pb-20 max-w-4xl mx-auto text-center">
        <div className="inline-block bg-primary-100 text-primary-700 text-xs font-semibold px-3 py-1 rounded-full mb-6">
          Restoran & Kafeler İçin
        </div>
        <h1 className="text-4xl md:text-6xl font-bold text-gray-900 leading-tight mb-6">
          QR okut,<br />
          <span className="text-primary-600">masadan sipariş ver</span>
        </h1>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto mb-8">
          Müşteriniz masadaki QR kodu okutur, menüyü görür, doğrudan sipariş verir.
          Garson onaylar, mutfak hazırlar. Sade, hızlı, pratik.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            to="/m/demo/1"
            className="inline-block bg-primary-500 hover:bg-primary-600 text-white font-semibold px-8 py-3 rounded-xl shadow-lg shadow-primary-500/20 transition"
          >
            Demo Menüyü Gör
          </Link>
          <Link
            to="/panel/giris"
            className="inline-block bg-white hover:bg-gray-50 text-gray-900 font-semibold px-8 py-3 rounded-xl border border-gray-200 transition"
          >
            Mekanınızı Ekleyin
          </Link>
        </div>
      </section>

      {/* Özellikler */}
      <section className="px-6 pb-20 max-w-5xl mx-auto">
        <div className="grid md:grid-cols-3 gap-6">
          <Feature
            emoji="📱"
            title="QR ile Menü"
            text="Masaya yapıştırılan QR kod. Uygulama indirmek yok, okut ve başla."
          />
          <Feature
            emoji="⚡"
            title="Hızlı Sipariş"
            text="Müşteri seçer, sipariş verir. Garson panele düşen siparişi masadan teyit eder."
          />
          <Feature
            emoji="🔔"
            title="Canlı Takip"
            text="Müşteri siparişinin durumunu telefonda anlık görür. Hazır olunca bildirim gelir."
          />
        </div>
      </section>

      {/* Footer */}
      <footer className="px-6 py-8 border-t border-gray-100 text-center text-sm text-gray-500">
        © 2026 QRMASA · Gaziantep
      </footer>
    </div>
  );
}

function Feature({ emoji, title, text }) {
  return (
    <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
      <div className="text-3xl mb-3">{emoji}</div>
      <h3 className="font-bold text-gray-900 mb-2">{title}</h3>
      <p className="text-sm text-gray-600 leading-relaxed">{text}</p>
    </div>
  );
}
