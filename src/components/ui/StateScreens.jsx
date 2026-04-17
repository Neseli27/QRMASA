import { AlertCircle, Loader2 } from 'lucide-react';

export function LoadingScreen({ message = 'Yükleniyor...' }) {
  return (
    <div className="min-h-[100dvh] flex flex-col items-center justify-center gap-4 bg-white">
      <Loader2 className="w-10 h-10 animate-spin text-brand" />
      <p className="text-sm text-slate-500 font-medium">{message}</p>
    </div>
  );
}

export function ErrorScreen({ title = 'Bir şeyler ters gitti', message, onRetry }) {
  return (
    <div className="min-h-[100dvh] flex flex-col items-center justify-center gap-4 p-6 text-center bg-white">
      <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center">
        <AlertCircle className="w-8 h-8 text-red-500" />
      </div>
      <h2 className="text-xl font-semibold text-slate-900">{title}</h2>
      {message && <p className="text-sm text-slate-500 max-w-sm">{message}</p>}
      {onRetry && (
        <button onClick={onRetry} className="btn-primary mt-2">
          Tekrar dene
        </button>
      )}
    </div>
  );
}

export function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center gap-3">
      {Icon && (
        <div className="w-14 h-14 rounded-2xl bg-slate-50 flex items-center justify-center">
          <Icon className="w-7 h-7 text-slate-400" />
        </div>
      )}
      <h3 className="text-base font-semibold text-slate-900">{title}</h3>
      {description && <p className="text-sm text-slate-500 max-w-xs">{description}</p>}
      {action}
    </div>
  );
}
