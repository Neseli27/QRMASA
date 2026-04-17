import { Link } from 'react-router-dom';
import { QrCode } from 'lucide-react';

// LoginPage — Personel girişi. Faz 2'de email/password + rol-bazlı yönlendirme.
export default function LoginPage() {
  return (
    <div className="min-h-[100dvh] flex items-center justify-center p-6 bg-slate-50">
      <div className="w-full max-w-md card p-8">
        <Link to="/" className="flex items-center gap-2 mb-8">
          <div className="w-9 h-9 rounded-xl bg-slate-900 flex items-center justify-center">
            <QrCode className="w-5 h-5 text-white" />
          </div>
          <span className="font-display text-xl font-bold">QRMasa</span>
        </Link>

        <h1 className="font-display text-2xl font-bold mb-2">Personel Girişi</h1>
        <p className="text-sm text-slate-500 mb-6">
          Faz 2'de email/şifre girişi ve rol-bazlı yönlendirme eklenecek.
        </p>

        <div className="space-y-3">
          <input type="email" placeholder="E-posta" className="input-field" disabled />
          <input type="password" placeholder="Şifre" className="input-field" disabled />
          <button className="btn-primary w-full" disabled>Giriş yap (yakında)</button>
        </div>
      </div>
    </div>
  );
}
