import { Link } from 'react-router-dom';

export default function NotFoundPage() {
  return (
    <div className="min-h-[100dvh] flex flex-col items-center justify-center gap-4 p-6 text-center bg-white">
      <div className="font-display text-7xl font-bold text-slate-900">404</div>
      <p className="text-slate-500 max-w-sm">Aradığınız sayfa bulunamadı. QR kodunuzu tekrar taramayı deneyin.</p>
      <Link to="/" className="btn-primary mt-2">Ana sayfa</Link>
    </div>
  );
}
