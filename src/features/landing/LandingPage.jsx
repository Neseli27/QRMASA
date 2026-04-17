import { Link } from 'react-router-dom';
import { QrCode, Sparkles, Smartphone, Users } from 'lucide-react';

// QRMasa platform landing sayfası — Faz 2'de zenginleştirilecek
export default function LandingPage() {
  return (
    <div className="min-h-[100dvh] bg-gradient-to-br from-slate-50 to-white">
      <header className="max-w-6xl mx-auto px-6 py-8 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-slate-900 flex items-center justify-center">
            <QrCode className="w-5 h-5 text-white" />
          </div>
          <span className="font-display text-2xl font-bold text-slate-900">QRMasa</span>
        </div>
        <Link to="/giris" className="text-sm font-medium text-slate-600 hover:text-slate-900">
          İşletme Girişi →
        </Link>
      </header>

      <main className="max-w-6xl mx-auto px-6 pt-16 pb-24">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-50 text-amber-700 text-xs font-semibold mb-6">
            <Sparkles className="w-3.5 h-3.5" /> Yeni nesil QR sipariş platformu
          </div>
          <h1 className="font-display text-5xl md:text-6xl font-bold text-slate-900 leading-tight tracking-tight">
            Masadan
            <br />
            <span className="italic text-slate-500">tek dokunuşla</span>
            <br />
            sipariş.
          </h1>
          <p className="mt-6 text-lg text-slate-600 max-w-xl">
            Kafeniz, restoranınız veya pizzacınız için özel markanızla çalışan, QR tabanlı sipariş ve sadakat sistemi.
          </p>
        </div>

        <div className="mt-20 grid md:grid-cols-3 gap-6">
          <FeatureCard
            icon={Smartphone}
            title="Müşteri PWA'sı"
            text="QR okut, menü aç, sipariş ver. Tek akış, uygulama yüklemeden."
          />
          <FeatureCard
            icon={Users}
            title="Çoklu kullanıcı masa"
            text="Aynı masadaki herkes kendi siparişini ekler, garson masayı tek görür."
          />
          <FeatureCard
            icon={Sparkles}
            title="Sadakat & bildirim"
            text="Puan, indirim, özel kampanyalar. Müşteri bir kere gelir, tekrar gelir."
          />
        </div>
      </main>

      <footer className="border-t border-slate-100 py-8 text-center text-xs text-slate-400">
        © {new Date().getFullYear()} QRMasa — Gaziantep
      </footer>
    </div>
  );
}

function FeatureCard({ icon: Icon, title, text }) {
  return (
    <div className="card p-6 hover:shadow-md transition-shadow">
      <div className="w-11 h-11 rounded-xl bg-slate-900 flex items-center justify-center mb-4">
        <Icon className="w-5 h-5 text-white" />
      </div>
      <h3 className="font-semibold text-slate-900 mb-2">{title}</h3>
      <p className="text-sm text-slate-500 leading-relaxed">{text}</p>
    </div>
  );
}
