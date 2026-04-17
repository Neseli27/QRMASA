import { forwardRef } from 'react';
import { cn } from '../../lib/utils';

/**
 * Input - Form input bileşeni
 * Icon desteği, error state, label dahili
 */
export const Input = forwardRef(function Input(
  { label, error, hint, icon: Icon, type = 'text', className, ...rest },
  ref
) {
  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-semibold text-slate-700 mb-1.5">{label}</label>
      )}
      <div className="relative">
        {Icon && (
          <Icon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
        )}
        <input
          ref={ref}
          type={type}
          className={cn(
            'w-full px-4 py-3 rounded-xl border bg-white transition-all outline-none text-slate-900 placeholder:text-slate-400',
            Icon && 'pl-10',
            error
              ? 'border-red-300 focus:border-red-500 focus:ring-2 focus:ring-red-100'
              : 'border-slate-200 focus:border-slate-400 focus:ring-2 focus:ring-slate-100',
            className
          )}
          {...rest}
        />
      </div>
      {error && <p className="mt-1.5 text-xs text-red-600 font-medium">{error}</p>}
      {hint && !error && <p className="mt-1.5 text-xs text-slate-500">{hint}</p>}
    </div>
  );
});

/**
 * Textarea — çok satırlı giriş
 */
export const Textarea = forwardRef(function Textarea(
  { label, error, hint, className, rows = 3, ...rest },
  ref
) {
  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-semibold text-slate-700 mb-1.5">{label}</label>
      )}
      <textarea
        ref={ref}
        rows={rows}
        className={cn(
          'w-full px-4 py-3 rounded-xl border bg-white transition-all outline-none text-slate-900 placeholder:text-slate-400 resize-y',
          error
            ? 'border-red-300 focus:border-red-500 focus:ring-2 focus:ring-red-100'
            : 'border-slate-200 focus:border-slate-400 focus:ring-2 focus:ring-slate-100',
          className
        )}
        {...rest}
      />
      {error && <p className="mt-1.5 text-xs text-red-600 font-medium">{error}</p>}
      {hint && !error && <p className="mt-1.5 text-xs text-slate-500">{hint}</p>}
    </div>
  );
});
