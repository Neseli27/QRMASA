import { NavLink, useNavigate } from 'react-router-dom';
import { Building2, Home, LogOut, Shield } from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';
import { useAuthActions } from '../../../hooks/useAuthActions';
import { cn } from '../../../lib/utils';

const NAV = [
  { to: '/superadmin', icon: Home, label: 'Gösterge', end: true },
  { to: '/superadmin/mekanlar', icon: Building2, label: 'Mekanlar' }
];

export function SuperAdminLayout({ children }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { signOut } = useAuthActions();

  const handleSignOut = async () => {
    await signOut();
    navigate('/', { replace: true });
  };

  return (
    <div className="min-h-[100dvh] bg-slate-950 text-slate-100">
      <header className="sticky top-0 z-20 border-b border-slate-800 bg-slate-950/80 backdrop-blur-lg">
        <div className="max-w-7xl mx-auto px-4 lg:px-6 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center">
              <Shield className="w-4.5 h-4.5 text-white" strokeWidth={2.5} />
            </div>
            <div>
              <div className="font-display text-sm font-bold">QRMasa</div>
              <div className="text-xs text-slate-500 -mt-0.5">Süper Admin</div>
            </div>
          </div>

          <nav className="hidden md:flex items-center gap-1">
            {NAV.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-orange-500/20 text-orange-400'
                      : 'text-slate-400 hover:text-slate-100 hover:bg-slate-900'
                  )
                }
              >
                <item.icon className="w-4 h-4" />
                {item.label}
              </NavLink>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <div className="hidden md:block text-right">
              <div className="text-xs font-semibold text-slate-200 truncate max-w-[180px]">
                {user?.email}
              </div>
              <div className="text-[10px] text-orange-400 uppercase tracking-wider font-bold">Süper Admin</div>
            </div>
            <button
              onClick={handleSignOut}
              className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
              title="Çıkış"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Mobil nav */}
        <nav className="md:hidden flex items-center gap-1 px-4 pb-3 overflow-x-auto">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors',
                  isActive
                    ? 'bg-orange-500/20 text-orange-400'
                    : 'text-slate-400 hover:text-slate-100 hover:bg-slate-900'
                )
              }
            >
              <item.icon className="w-3.5 h-3.5" />
              {item.label}
            </NavLink>
          ))}
        </nav>
      </header>

      <main className="max-w-7xl mx-auto px-4 lg:px-6 py-8">{children}</main>
    </div>
  );
}
