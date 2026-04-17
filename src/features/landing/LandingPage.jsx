import { Link } from 'react-router-dom';
import {
  QrCode,
  Smartphone,
  Users,
  Gift,
  Zap,
  ArrowRight,
  ShoppingBag,
  BarChart3,
  Palette
} from 'lucide-react';
import { Button } from '../../components/ui/Button';

export default function LandingPage() {
  return (
    <div className="min-h-[100dvh] bg-white">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-lg border-b border-slate-100">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center shadow-lg shadow-orange-500/30 group-hover:scale-110 transition-transform">
              <QrCode className="w-5 h-5 text-white" strokeWidth={2.5} />
            </div>
            <span className="font-display text-xl font-bold tracking-tight">QRMasa</span>
          </Link>
          <Link to="/giris">
            <Button variant="ghost" icon={ArrowRight} iconPosition="right" size="sm">
              İşletme Girişi
            </Button>
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        {/* Dekoratif daireler */}
        <div className="absolute top-20 -right-20 w-96 h-96 bg-orange-200/40 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-40 -left-20 w-80 h-80 bg-red-200/40 rounded-full blur-3xl pointer-events-none" />

        <div className="relative max-w-6xl mx-auto px-6 pt-20 pb-24 md:pt-28 md:pb-32">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-orange-100 text-orange-700 text-xs font-bold mb-7 tracking-wider uppercase">
              <Zap className="w-3.5 h-3.5" fill="currentColor" />
              Yeni nesil QR sipariş
            </div>
            <h1 className="font-display text-5xl md:text-7xl font-bold text-slate-900 leading-[0.95] tracking-tight">
              Masada
              <br />
              <span className="bg-gradient-to-r from-orange-500 to-red-600 bg-clip-text text-transparent">
                tek dokunuş
              </span>
              <br />
              sipariş.
            </h1>
            <p className="mt-7 text-lg md:text-xl text-slate-600 max-w-xl leading-relaxed">
              Kafeniz, restoranınız veya pizzacınız için özel markanızla çalışan QR tabanlı sipariş ve sadakat sistemi. Uygulama yüklemeden, tek dokunuşla.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Link to="/giris">
                <Button
                  size="lg"
                  icon={ArrowRight}
                  iconPosition="right"
                  className="bg-gradient-to-r from-orange-500 to-red-600 shadow-lg shadow-orange-500/30 hover:shadow-xl hover:shadow-orange-500/40"
                  style={{ backgroundColor: undefined }}
                >
                  Hemen Başla
                </Button>
              </Link>
              <a href="#ozellikler">
                <Button size="lg" variant="secondary">Özellikleri Gör</Button>
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="ozellikler" className="py-20 md:py-28 bg-slate-50">
        <div className="max-w-6xl mx-auto px-6">
          <div className="max-w-2xl mb-16">
            <div className="text-xs font-bold tracking-wider uppercase text-orange-600 mb-3">Özellikler</div>
            <h2 className="font-display text-4xl md:text-5xl font-bold text-slate-900 leading-tight">
              Müşteri memnun,<br />
              <span className="italic text-slate-500">mutfak verimli.</span>
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-5">
            <FeatureCard
              icon={Smartphone}
              title="Müşteri PWA'sı"
              description="QR okut, menü aç, sipariş ver. Telefonuna ikon olarak ekleyebilir, her gelişinde tek tıkla açar."
              accent="bg-orange-500"
            />
            <FeatureCard
              icon={Users}
              title="Çoklu kullanıcı masa"
              description="Aynı masadaki herkes kendi telefonundan sipariş ekler. Garson masayı tek seferde görür."
              accent="bg-red-500"
            />
            <FeatureCard
              icon={Gift}
              title="Esnek sadakat"
              description="Cashback, puan, damga kart, seviye sistemi. İşletme kendi kurallarını belirler."
              accent="bg-amber-500"
            />
            <FeatureCard
              icon={Zap}
              title="Anlık sipariş akışı"
              description="Müşteri siparişi tamamlar, garson ve mutfak ekranına anında düşer. Sesli uyarı dahil."
              accent="bg-orange-500"
            />
            <FeatureCard
              icon={Palette}
              title="Kendi markan"
              description="Logo, renkler, PWA ikonu sizin. Müşteri QRMasa adını değil, sizin adınızı görür."
              accent="bg-red-500"
            />
            <FeatureCard
              icon={BarChart3}
              title="Canlı raporlar"
              description="Günlük ciro, ortalama sepet, yoğun saatler. Verilerinize hakim olun."
              accent="bg-amber-500"
            />
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-20 md:py-28">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <div className="text-xs font-bold tracking-wider uppercase text-orange-600 mb-3">Nasıl çalışır?</div>
            <h2 className="font-display text-4xl md:text-5xl font-bold text-slate-900">
              3 adımda sipariş
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <Step number="01" title="Müşteri QR okutur" description="Telefonun kamerası yeterli. Uygulama yüklemek zorunda değil." />
            <Step number="02" title="Menüden seçer" description="Kategoriler arasında gezer, sepete ekler, isterse arkadaşları da ekler." />
            <Step number="03" title="Siparişi tamamlar" description="Mutfak ve garson anında bildirim alır. Müşteri sipariş durumunu takip eder." />
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20">
        <div className="max-w-4xl mx-auto px-6">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-orange-500 to-red-600 p-12 md:p-16 text-center text-white shadow-2xl shadow-orange-500/30">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-white/10 rounded-full blur-3xl pointer-events-none" />
            <div className="relative">
              <ShoppingBag className="w-12 h-12 mx-auto mb-5 opacity-80" />
              <h2 className="font-display text-4xl md:text-5xl font-bold mb-4 leading-tight">
                Mekanını dijitale taşı
              </h2>
              <p className="text-lg opacity-90 max-w-xl mx-auto mb-8">
                Kurulum birkaç dakika. İlk siparişin bugün gelebilir.
              </p>
              <Link to="/giris">
                <button className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl bg-white text-orange-600 font-bold hover:scale-[1.03] transition-transform shadow-xl">
                  Hemen Başla <ArrowRight className="w-4 h-4" />
                </button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-100 py-10">
        <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-slate-500">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center">
              <QrCode className="w-3.5 h-3.5 text-white" strokeWidth={2.5} />
            </div>
            <span className="font-display font-bold text-slate-900">QRMasa</span>
          </div>
          <div>© {new Date().getFullYear()} QRMasa — Gaziantep</div>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({ icon: Icon, title, description, accent }) {
  return (
    <div className="group bg-white rounded-3xl p-7 border border-slate-200/70 hover:border-slate-300 hover:shadow-xl hover:shadow-slate-200/50 transition-all duration-300 hover:-translate-y-1">
      <div className={`w-12 h-12 rounded-2xl ${accent} flex items-center justify-center mb-5 shadow-lg group-hover:scale-110 transition-transform`}>
        <Icon className="w-6 h-6 text-white" strokeWidth={2.5} />
      </div>
      <h3 className="font-display text-xl font-bold text-slate-900 mb-2">{title}</h3>
      <p className="text-sm text-slate-600 leading-relaxed">{description}</p>
    </div>
  );
}

function Step({ number, title, description }) {
  return (
    <div className="relative text-center">
      <div className="font-display text-7xl font-bold bg-gradient-to-br from-orange-400 to-red-600 bg-clip-text text-transparent opacity-90 mb-3">
        {number}
      </div>
      <h3 className="font-display text-xl font-bold text-slate-900 mb-2">{title}</h3>
      <p className="text-sm text-slate-600 max-w-xs mx-auto leading-relaxed">{description}</p>
    </div>
  );
}
