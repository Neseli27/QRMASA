import { cn } from '../../lib/utils';

export function Card({ children, className, padding = 'md', ...rest }) {
  const paddings = {
    none: '',
    sm: 'p-4',
    md: 'p-5 md:p-6',
    lg: 'p-6 md:p-8'
  };

  return (
    <div
      className={cn(
        'bg-white rounded-2xl border border-slate-200/70 shadow-sm',
        paddings[padding],
        className
      )}
      {...rest}
    >
      {children}
    </div>
  );
}

export function CardHeader({ title, subtitle, action, className }) {
  return (
    <div className={cn('flex items-start justify-between gap-4 mb-5', className)}>
      <div className="min-w-0">
        <h3 className="font-display text-lg font-bold text-slate-900 truncate">{title}</h3>
        {subtitle && <p className="text-sm text-slate-500 mt-0.5">{subtitle}</p>}
      </div>
      {action && <div className="flex-shrink-0">{action}</div>}
    </div>
  );
}

/**
 * StatCard — Dashboard için metrik kartı
 */
export function StatCard({ icon: Icon, label, value, change, changeType = 'neutral', className }) {
  const changeColors = {
    positive: 'text-emerald-600 bg-emerald-50',
    negative: 'text-red-600 bg-red-50',
    neutral: 'text-slate-600 bg-slate-50'
  };

  return (
    <div className={cn('bg-white rounded-2xl border border-slate-200/70 p-5 shadow-sm hover:shadow-md transition-shadow', className)}>
      <div className="flex items-center justify-between mb-3">
        {Icon && (
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ backgroundColor: 'rgb(var(--brand-rgb) / 0.1)' }}
          >
            <Icon className="w-5 h-5" style={{ color: 'rgb(var(--brand-rgb))' }} />
          </div>
        )}
        {change && (
          <span className={cn('text-xs font-semibold px-2 py-0.5 rounded-full', changeColors[changeType])}>
            {change}
          </span>
        )}
      </div>
      <div className="text-2xl font-display font-bold text-slate-900">{value}</div>
      <div className="text-xs text-slate-500 mt-0.5">{label}</div>
    </div>
  );
}
