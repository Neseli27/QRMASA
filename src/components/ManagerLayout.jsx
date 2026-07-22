import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { signOutStaff } from '../firebase/auth';
import { loadManagerSetup } from '../utils/managerDraft';

const NAV_ITEMS = [
  { key: 'overview', label: 'Genel Bakış', icon: '⌂', path: '/panel/yonetici', end: true },
  { key: 'orders', label: 'Siparişler', icon: '◫', path: '/panel/yonetici/siparisler' },
  { key: 'menu', label: 'Menü ve Ürünler', icon: '🍽', path: '/panel/yonetici/menu' },
  { key: 'staff', label: 'Personel', icon: '👥', path: '/panel/yonetici/personel' },
  { key: 'tables', label: 'Masalar ve QR', icon: '▦', path: '/panel/yonetici/masalar' },
  { key: 'kitchen', label: 'Mutfak', icon: '♨', path: '/panel/yonetici/mutfak' },
];

const PAGE_META = {
  '/panel/yonetici': ['Genel Bakış', 'İşletmenizin yönetim özeti'],
  '/panel/yonetici/siparisler': ['Siparişler', 'Yeni ve aktif siparişleri yönetin'],
  '/panel/yonetici/menu': ['Menü ve Ürünler', 'Kategori, ürün, fiyat ve satış durumları'],
  '/panel/yonetici/personel': ['Personel', 'Görevler, hesaplar ve erişim yetkileri'],
  '/panel/yonetici/masalar': ['Masalar ve QR', 'Masa düzeni, kapasite ve QR kodları'],
  '/panel/yonetici/mutfak': ['Mutfak', 'Hazırlanacak siparişleri takip edin'],
};

function navClass({ isActive }) {
  return `group flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold transition ${
    isActive
      ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-950/30'
      : 'text-neutral-400 hover:bg-white/5 hover:text-white'
  }`;
}

export default function ManagerLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const setup = loadManagerSetup();
  const businessCode = setup.business.code || localStorage.getItem('qrmasa_staff_business') || '';
  const [title, subtitle] = PAGE_META[location.pathname] || PAGE_META['/panel/yonetici'];

  async function handleLogout() {
    await signOutStaff().catch(() => {});
    navigate('/panel/giris', { replace: true });
  }

  function itemPath(item) {
    if (!businessCode || !['orders', 'kitchen'].includes(item.key)) return item.path;
    return `${item.path}?business=${encodeURIComponent(businessCode)}`;
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-white lg:flex">
      <aside className="hidden w-[280px] shrink-0 border-r border-white/10 bg-neutral-900 lg:flex lg:min-h-screen lg:flex-col lg:sticky lg:top-0 lg:h-screen">
        <div className="border-b border-white/10 p-6">
          <div className="flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-2xl bg-emerald-500 text-xl font-black text-white">Q</div>
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-400">QRMASA</p>
              <h1 className="truncate text-lg font-black">{setup.business.name || 'İşletme Yönetimi'}</h1>
            </div>
          </div>
          <p className="mt-4 truncate rounded-xl bg-black/20 px-3 py-2 text-xs text-neutral-400">Kod: {businessCode || 'tanımsız'}</p>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto p-4">
          <p className="px-4 pb-2 pt-2 text-[11px] font-bold uppercase tracking-[0.18em] text-neutral-600">Yönetim</p>
          {NAV_ITEMS.map((item) => (
            <NavLink key={item.key} to={itemPath(item)} end={item.end} className={navClass}>
              <span className="grid h-8 w-8 place-items-center rounded-xl bg-black/15 text-base">{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-white/10 p-4">
          <button onClick={() => navigate('/panel/hesap')} className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-semibold text-neutral-300 transition hover:bg-white/5 hover:text-white">
            <span className="grid h-8 w-8 place-items-center rounded-xl bg-white/5">⚙</span>
            Hesabım ve işletme
          </button>
          <button onClick={handleLogout} className="mt-1 flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-semibold text-red-300 transition hover:bg-red-500/10">
            <span className="grid h-8 w-8 place-items-center rounded-xl bg-red-500/10">↪</span>
            Güvenli çıkış
          </button>
        </div>
      </aside>

      <section className="min-w-0 flex-1">
        <header className="sticky top-0 z-40 border-b border-white/10 bg-neutral-900/95 backdrop-blur">
          <div className="flex items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-400 lg:hidden">{setup.business.name || 'QRMASA'}</p>
              <h2 className="truncate text-xl font-black sm:text-2xl">{title}</h2>
              <p className="mt-1 hidden text-sm text-neutral-400 sm:block">{subtitle}</p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <button onClick={() => navigate('/panel/hesap')} className="rounded-xl bg-neutral-800 px-3 py-2 text-xs font-bold text-neutral-200 sm:px-4 sm:text-sm">Hesabım</button>
              <button onClick={handleLogout} className="rounded-xl border border-red-400/20 bg-red-400/10 px-3 py-2 text-xs font-bold text-red-200 sm:px-4 sm:text-sm">Çıkış</button>
            </div>
          </div>

          <nav className="flex gap-2 overflow-x-auto border-t border-white/5 px-3 py-3 lg:hidden">
            {NAV_ITEMS.map((item) => (
              <NavLink
                key={item.key}
                to={itemPath(item)}
                end={item.end}
                className={({ isActive }) => `shrink-0 rounded-xl px-3 py-2 text-xs font-bold transition ${
                  isActive ? 'bg-emerald-500 text-white' : 'bg-neutral-800 text-neutral-400'
                }`}
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
        </header>

        <main className="manager-shell-content min-h-[calc(100vh-73px)] bg-neutral-950">
          <Outlet />
        </main>
      </section>
    </div>
  );
}
