import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  UtensilsCrossed,
  QrCode,
  Users,
  Bell,
  Palette,
  Gift,
  Settings,
  LogOut,
  Menu,
  X,
  ChevronDown
} from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';
import { useVenue } from '../../../contexts/VenueContext';
import { useAuthActions } from '../../../hooks/useAuthActions';
import { cn } from '../../../lib/utils';

const NAV_ITEMS = [
  { to: '/yonetim', icon: LayoutDashboard, label: 'Gösterge', end: true },
  { to: '/yonetim/menu', icon: UtensilsCrossed, label: 'Menü' },
  { to: '/yonetim/masalar', icon: QrCode, label: 'Masalar' },
  { to: '/yonetim/siparisler', icon: Bell, label: 'Siparişler', badge: true },
  { to: '/yonetim/sadakat', icon: Gift, label: 'Sadakat' },
  { to: '/yonetim/personel', icon: Users, label: 'Personel' },
  { to: '/yonetim/branding', icon: Palette, label: 'Marka' },
  { to: '/yonetim/ayarlar', icon: Settings, label: 'Ayarlar' }
];

export function VenueAdminLayout({ children }) {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const { venue } = useVenue();
  const { signOut } = useAuthActions();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate('/giris', { replace: true });
  };

  return (
    <div className="min-h-[100dvh] bg-slate-50">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-slate-900/50 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 w-64 bg-white border-r border-slate-200 transition-transform duration-300 lg:translate-x-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="px-5 py-5 border-b border-slate-100 flex items-center gap-3">
            {venue?.branding?.logo ? (
              <img src={venue.branding.logo} alt="" className="w-10 h-10 rounded-xl object-cover" />
            ) : (
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center">
                <QrCode className="w-5 h-5 text-white" strokeWidth={2.5} />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <div className="font-display text-sm font-bold text-slate-900 truncate">
                {venue?.branding?.name || 'QRMasa'}
              </div>
              <div className="text-xs text-slate-500">İşletme Paneli</div>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden p-1 rounded-lg hover:bg-slate-100"
            >
              <X className="w-5 h-5 text-slate-500" />
            </button>
          </div>

          {/* Nav */}
          <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
            {NAV_ITEMS.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                onClick={() => setSidebarOpen(false)}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-orange-50 text-orange-700'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  )
                }
              >
                <item.icon className="w-5 h-5 flex-shrink-0" />
                <span className="flex-1">{item.label}</span>
              </NavLink>
            ))}
          </nav>

          {/* User footer */}
          <div className="border-t border-slate-100 p-3">
            <div className="flex items-center gap-3 px-2 py-2">
              <div className="w-9 h-9 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 font-semibold text-sm flex-shrink-0">
                {(profile?.displayName || user?.email || '?')[0].toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold text-slate-900 truncate">
                  {profile?.displayName || user?.email}
                </div>
                <div className="text-xs text-slate-500">
                  {profile?.role === 'venue_admin' ? 'Yönetici' : profile?.role === 'superadmin' ? 'Süper Admin' : 'Kullanıcı'}
                </div>
              </div>
              <button
                onClick={handleSignOut}
                className="p-2 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                title="Çıkış"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="lg:pl-64">
        {/* Top bar (mobile) */}
        <header className="lg:hidden sticky top-0 z-20 bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-lg hover:bg-slate-100"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            {venue?.branding?.logo ? (
              <img src={venue.branding.logo} alt="" className="w-7 h-7 rounded-lg object-cover" />
            ) : (
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-orange-500 to-red-600" />
            )}
            <span className="font-display font-bold text-slate-900 text-sm">
              {venue?.branding?.name || 'QRMasa'}
            </span>
          </div>
          <div className="w-10" />
        </header>

        {/* Page content */}
        <main className="p-4 lg:p-8 max-w-7xl mx-auto">{children}</main>
      </div>
    </div>
  );
}
