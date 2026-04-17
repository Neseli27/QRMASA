import { cn } from '../../lib/utils';
import { Loader2 } from 'lucide-react';

/**
 * Button - Ortak buton bileşeni
 * Varyasyonlar: primary, secondary, ghost, danger
 * Boyutlar: sm, md, lg
 */
export function Button({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  icon: Icon,
  iconPosition = 'left',
  type = 'button',
  className,
  onClick,
  ...rest
}) {
  const base = 'inline-flex items-center justify-center gap-2 font-semibold rounded-xl transition-all duration-200 active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100 whitespace-nowrap';

  const variants = {
    primary: 'text-white shadow-sm hover:shadow-md',
    secondary: 'text-slate-900 bg-white border border-slate-200 hover:bg-slate-50 hover:border-slate-300',
    ghost: 'text-slate-700 hover:bg-slate-100',
    danger: 'text-white bg-red-600 hover:bg-red-700 shadow-sm',
    outline: 'text-slate-900 border-2 border-slate-900 hover:bg-slate-900 hover:text-white'
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-5 py-2.5 text-sm',
    lg: 'px-6 py-3.5 text-base'
  };

  // Primary variant için brand rengini style ile ver (CSS variable)
  const primaryStyle = variant === 'primary' ? { backgroundColor: 'rgb(var(--brand-rgb))' } : undefined;

  return (
    <button
      type={type}
      disabled={disabled || loading}
      onClick={onClick}
      className={cn(base, variants[variant], sizes[size], className)}
      style={primaryStyle}
      {...rest}
    >
      {loading ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        Icon && iconPosition === 'left' && <Icon className="w-4 h-4" />
      )}
      {children}
      {!loading && Icon && iconPosition === 'right' && <Icon className="w-4 h-4" />}
    </button>
  );
}
