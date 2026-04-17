import { useEffect, useState } from 'react';
import { collection, query, where, orderBy, onSnapshot, Timestamp, limit } from 'firebase/firestore';
import { Link } from 'react-router-dom';
import {
  ShoppingBag,
  TrendingUp,
  DollarSign,
  Users,
  Clock,
  ArrowRight,
  Sparkles
} from 'lucide-react';
import { db } from '../../../lib/firebase';
import { venueCol } from '../../../lib/paths';
import { useAuth } from '../../../contexts/AuthContext';
import { useVenue } from '../../../contexts/VenueContext';
import { StatCard, Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { EmptyState } from '../../../components/ui/StateScreens';
import { formatPrice } from '../../../lib/security';
import { relativeTime } from '../../../lib/utils';

export default function DashboardPage() {
  const { venueId } = useAuth();
  const { venue } = useVenue();
  const [stats, setStats] = useState({ count: 0, revenue: 0, pending: 0 });
  const [recentOrders, setRecentOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!venueId) {
      setLoading(false);
      return;
    }

    // Bugünün başlangıcı
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    // Bugünkü siparişler
    const todayQ = query(
      collection(db, venueCol(venueId, 'orders')),
      where('createdAt', '>=', Timestamp.fromDate(todayStart)),
      orderBy('createdAt', 'desc')
    );

    const unsubToday = onSnapshot(
      todayQ,
      (snap) => {
        let count = 0;
        let revenue = 0;
        let pending = 0;
        const orders = [];
        snap.forEach((doc) => {
          const d = doc.data();
          count++;
          revenue += d.total || 0;
          if (d.status === 'pending' || d.status === 'preparing') pending++;
          if (orders.length < 5) orders.push({ id: doc.id, ...d });
        });
        setStats({ count, revenue, pending });
        setRecentOrders(orders);
        setLoading(false);
      },
      (err) => {
        console.error('[Dashboard] siparişler:', err);
        setLoading(false);
      }
    );

    return () => unsubToday();
  }, [venueId]);

  const isSetupIncomplete = !venue?.published;

  return (
    <div className="space-y-6">
      {/* Başlık */}
      <div>
        <h1 className="font-display text-3xl font-bold text-slate-900">Gösterge</h1>
        <p className="text-sm text-slate-500 mt-1">Bugünkü özet ve son hareketler</p>
      </div>

      {/* Setup uyarısı */}
      {isSetupIncomplete && (
        <Card className="bg-gradient-to-br from-orange-50 to-amber-50 border-orange-200">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center flex-shrink-0">
              <Sparkles className="w-5 h-5 text-orange-600" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-display font-bold text-slate-900 mb-1">Kuruluma devam et</h3>
              <p className="text-sm text-slate-600 mb-4">
                Mekanın müşterilere görünmesi için menünü ekle, masalarını tanımla ve marka bilgilerini tamamla.
              </p>
              <div className="flex flex-wrap gap-2">
                <Link to="/yonetim/branding">
                  <Button size="sm" variant="secondary">Marka Ayarları</Button>
                </Link>
                <Link to="/yonetim/menu">
                  <Button size="sm" variant="secondary">Menü Ekle</Button>
                </Link>
                <Link to="/yonetim/masalar">
                  <Button size="sm" variant="secondary">Masa Oluştur</Button>
                </Link>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Metrikler */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={ShoppingBag}
          label="Bugünkü Sipariş"
          value={loading ? '—' : stats.count}
        />
        <StatCard
          icon={DollarSign}
          label="Bugünkü Ciro"
          value={loading ? '—' : formatPrice(stats.revenue)}
        />
        <StatCard
          icon={Clock}
          label="Bekleyen"
          value={loading ? '—' : stats.pending}
          change={stats.pending > 0 ? 'İşlem var' : null}
          changeType={stats.pending > 0 ? 'positive' : 'neutral'}
        />
        <StatCard
          icon={TrendingUp}
          label="Ort. Sepet"
          value={loading ? '—' : (stats.count > 0 ? formatPrice(stats.revenue / stats.count) : '—')}
        />
      </div>

      {/* Son siparişler */}
      <Card>
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="font-display text-lg font-bold text-slate-900">Son Siparişler</h3>
            <p className="text-sm text-slate-500 mt-0.5">Bugünkü en son hareketler</p>
          </div>
          <Link to="/yonetim/siparisler">
            <Button size="sm" variant="ghost" icon={ArrowRight} iconPosition="right">
              Tümü
            </Button>
          </Link>
        </div>

        {loading ? (
          <div className="py-8 text-center text-sm text-slate-400">Yükleniyor...</div>
        ) : recentOrders.length === 0 ? (
          <EmptyState
            icon={ShoppingBag}
            title="Henüz sipariş yok"
            description="Bugünkü ilk sipariş geldiğinde burada görünecek."
          />
        ) : (
          <div className="divide-y divide-slate-100 -mx-5 md:-mx-6">
            {recentOrders.map((order) => (
              <OrderRow key={order.id} order={order} />
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

function OrderRow({ order }) {
  const statusConfig = {
    pending: { label: 'Bekliyor', color: 'bg-amber-100 text-amber-700' },
    preparing: { label: 'Hazırlanıyor', color: 'bg-blue-100 text-blue-700' },
    ready: { label: 'Hazır', color: 'bg-emerald-100 text-emerald-700' },
    served: { label: 'Servis edildi', color: 'bg-slate-100 text-slate-600' },
    cancelled: { label: 'İptal', color: 'bg-red-100 text-red-700' }
  };
  const cfg = statusConfig[order.status] || statusConfig.pending;

  return (
    <div className="px-5 md:px-6 py-3 flex items-center gap-4 hover:bg-slate-50 transition-colors">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-slate-900 text-sm">
            Masa {order.tableNo || order.tableId?.slice(0, 4)}
          </span>
          <span className={`pill ${cfg.color}`}>{cfg.label}</span>
        </div>
        <div className="text-xs text-slate-500 mt-0.5">
          {(order.items?.length || 0)} ürün · {relativeTime(order.createdAt)}
        </div>
      </div>
      <div className="font-display font-bold text-slate-900">{formatPrice(order.total)}</div>
    </div>
  );
}
