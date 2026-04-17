import { AlertCircle, Loader2 } from 'lucide-react';
import { cn } from '../../lib/utils';

/**
 * LoadingScreen — Tam sayfa yükleme ekranı
 * Props:
 *   message: gösterilecek metin
 *   theme: 'light' | 'dark' (varsayılan light)
 *   inline: true ise tam sayfa yerine inline spinner döner
 */
export function LoadingScreen({ message = 'Yükleniyor...', theme = 'light', inline = false }) {
  const isDark = theme === 'dark';

  if (inline) {
    return (
      <div className="flex items-center justify-center gap-2 py-8">
        <Loader2 className={cn('w-5 h-5 animate-spin', isDark ? 'text-orange-400' : 'text-orange-500')} />
        <span className={cn('text-sm font-medium', isDark ? 'text-slate-400' : 'text-slate-500')}>{message}</span>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'min-h-[100dvh] flex flex-col items-center justify-center gap-4',
        isDark ? 'bg-slate-950' : 'bg-white'
      )}
    >
      <Loader2 className={cn('w-10 h-10 animate-spin', isDark ? 'text-orange-400' : 'text-orange-500')} />
      <p className={cn('text-sm font-medium', isDark ? 'text-slate-400' : 'text-slate-500')}>{message}</p>
    </div>
  );
}

export function ErrorScreen({ title = 'Bir şeyler ters gitti', message, onRetry, theme = 'light' }) {
  const isDark = theme === 'dark';
  return (
    <div
      className={cn(
        'min-h-[100dvh] flex flex-col items-center justify-center gap-4 p-6 text-center',
        isDark ? 'bg-slate-950' : 'bg-white'
      )}
    >
      <div className={cn(
        'w-16 h-16 rounded-full flex items-center justify-center',
        isDark ? 'bg-red-500/20' : 'bg-red-50'
      )}>
        <AlertCircle className={cn('w-8 h-8', isDark ? 'text-red-400' : 'text-red-500')} />
      </div>
      <h2 className={cn('text-xl font-semibold', isDark ? 'text-slate-100' : 'text-slate-900')}>{title}</h2>
      {message && <p className={cn('text-sm max-w-sm', isDark ? 'text-slate-400' : 'text-slate-500')}>{message}</p>}
      {onRetry && (
        <button onClick={onRetry} className="btn-primary mt-2">
          Tekrar dene
        </button>
      )}
    </div>
  );
}

export function EmptyState({ icon: Icon, title, description, action, theme = 'light' }) {
  const isDark = theme === 'dark';
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center gap-3">
      {Icon && (
        <div className={cn(
          'w-14 h-14 rounded-2xl flex items-center justify-center',
          isDark ? 'bg-slate-800' : 'bg-slate-50'
        )}>
          <Icon className={cn('w-7 h-7', isDark ? 'text-slate-500' : 'text-slate-400')} />
        </div>
      )}
      <h3 className={cn('text-base font-semibold', isDark ? 'text-slate-100' : 'text-slate-900')}>{title}</h3>
      {description && <p className={cn('text-sm max-w-xs', isDark ? 'text-slate-400' : 'text-slate-500')}>{description}</p>}
      {action}
    </div>
  );
}
