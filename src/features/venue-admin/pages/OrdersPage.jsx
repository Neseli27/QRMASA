import { useEffect, useState, useRef } from 'react';
import {
  collection, onSnapshot, orderBy, query, doc, setDoc,
  serverTimestamp, where, Timestamp
} from 'firebase/firestore';
import {
  Bell, BellOff, Clock, CheckCircle2, XCircle, Timer,
  UtensilsCrossed, Coffee, Volume2, VolumeX, ChevronDown
} from 'lucide-react';
import toast from 'react-hot-toast';
import { db } from '../../../lib/firebase';
import { venueCol } from '../../../lib/paths';
import { useAuth } from '../../../contexts/AuthContext';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { EmptyState, LoadingScreen } from '../../../components/ui/StateScreens';
import { formatPrice } from '../../../lib/security';
import { relativeTime, cn } from '../../../lib/utils';

const STATUS_CONFIG = {
  pending:    { label: 'Yeni',        color: 'bg-amber-100 text-amber-700',       dot: 'bg-amber-500',   next: 'preparing', nextLabel: 'Hazırla' },
  preparing:  { label: 'Hazırlanıyor', color: 'bg-blue-100 text-blue-700',         dot: 'bg-blue-500',    next: 'ready',     nextLabel: 'Hazır' },
  ready:      { label: 'Hazır',       color: 'bg-emerald-100 text-emerald-700',   dot: 'bg-emerald-500', next: 'served',    nextLabel: 'Servis Edildi' },
  served:     { label: 'Servis edildi', color: 'bg-slate-100 text-slate-600',     dot: 'bg-slate-400',   next: null },
  cancelled:  { label: 'İptal',       color: 'bg-red-100 text-red-700',           dot: 'bg-red-500',     next: null }
};

export default function OrdersPage() {
  const { venueId } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(() => {
    return localStorage.getItem('qrmasa_sound') !== 'false';
  });
  const [filter, setFilter] = useState('active'); // 'active' | 'today' | 'all'
  const prevOrderIdsRef = useRef(new Set());

  // Bugünün 00:00'ı
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  useEffect(() => {
    if (!venueId) return;

    const q = query(
      collection(db, venueCol(venueId, 'orders')),
      where('createdAt', '>=', Timestamp.fromDate(todayStart)),
      orderBy('createdAt', 'desc')
    );

    const unsub = onSnapshot(q, (snap) => {
      const list = [];
      const newIds = new Set();
      snap.forEach((d) => {
        list.push({ id: d.id, ...d.data() });
        newIds.add(d.id);
      });

      // Yeni sipariş geldi mi? (sesli uyarı)
      const prevIds = prevOrderIdsRef.current;
      if (prevIds.size > 0) {
        const brandNewIds = [...newIds].filter(id => !prevIds.has(id));
        if (brandNewIds.length > 0 && soundEnabled) {
          playNewOrderSound();
        }
      }
      prevOrderIdsRef.current = newIds;

      setOrders(list);
      setLoading(false);
    });

    return () => unsub();
  }, [venueId, soundEnabled]);

  // Filtrelenmiş siparişler
  const filteredOrders = orders.filter(o => {
    if (filter === 'active') return ['pending', 'preparing', 'ready'].includes(o.status);
    if (filter === 'today') return true; // zaten bugünle filtrelendi
    return true;
  });

  // Özet sayılar
  const counts = {
    pending: orders.filter(o => o.status === 'pending').length,
    preparing: orders.filter(o => o.status === 'preparing').length,
    ready: orders.filter(o => o.status === 'ready').length,
    total: orders.length
  };

  const handleUpdateStatus = async (order, newStatus) => {
    try {
      await setDoc(
        doc(db, venueCol(venueId, 'orders'), order.id),
        {
          status: newStatus,
          updatedAt: serverTimestamp(),
          [`status_${newStatus}_at`]: serverTimestamp()
        },
        { merge: true }
      );

      const lbl = STATUS_CONFIG[newStatus]?.label || newStatus;
      toast.success(`Durum: ${lbl}`);
    } catch (e) {
      toast.error('Güncellenemedi: ' + e.message);
    }
  };

  const toggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    localStorage.setItem('qrmasa_sound', next.toString());
    toast.success(next ? 'Ses uyarısı açık' : 'Ses uyarısı kapalı');
  };

  if (loading) return <LoadingScreen message="Siparişler yükleniyor..." />;

  return (
    <div className="space-y-6">
      {/* Başlık + kontroller */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-display text-3xl font-bold text-slate-900">Siparişler</h1>
          <p className="text-sm text-slate-500 mt-1">
            Bugün {counts.total} sipariş · Bekleyen {counts.pending} · Hazırlanan {counts.preparing} · Hazır {counts.ready}
          </p>
        </div>
        <button
          onClick={toggleSound}
          className={cn(
            'px-3 py-2 rounded-xl text-sm font-semibold transition-colors flex items-center gap-2',
            soundEnabled
              ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          )}
        >
          {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          {soundEnabled ? 'Ses Açık' : 'Ses Kapalı'}
        </button>
      </div>

      {/* Filtre sekmeleri */}
      <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl w-fit">
        <FilterTab
          active={filter === 'active'}
          onClick={() => setFilter('active')}
          label="Aktif"
          count={counts.pending + counts.preparing + counts.ready}
        />
        <FilterTab
          active={filter === 'today'}
          onClick={() => setFilter('today')}
          label="Bugün Tümü"
          count={counts.total}
        />
      </div>

      {/* Liste */}
      {filteredOrders.length === 0 ? (
        <Card>
          <EmptyState
            icon={Bell}
            title={filter === 'active' ? 'Aktif sipariş yok' : 'Bugün sipariş yok'}
            description="Yeni siparişler geldiğinde burada gerçek zamanlı görünecek."
          />
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredOrders.map((order) => (
            <OrderCard
              key={order.id}
              order={order}
              onUpdateStatus={handleUpdateStatus}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function FilterTab({ active, onClick, label, count }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'px-4 py-1.5 rounded-lg text-sm font-semibold transition-all flex items-center gap-2',
        active
          ? 'bg-white text-slate-900 shadow-sm'
          : 'text-slate-600 hover:text-slate-900'
      )}
    >
      {label}
      {count > 0 && (
        <span className={cn(
          'text-xs px-1.5 py-0.5 rounded-full font-bold',
          active ? 'bg-orange-100 text-orange-700' : 'bg-slate-200 text-slate-600'
        )}>{count}</span>
      )}
    </button>
  );
}

// ═══════════════════════════════════════════════════
// Sipariş Kartı
// ═══════════════════════════════════════════════════
function OrderCard({ order, onUpdateStatus }) {
  const [expanded, setExpanded] = useState(false);
  const cfg = STATUS_CONFIG[order.status] || STATUS_CONFIG.pending;

  // Yaş (kaç dk'dır beklendi)
  const ageMin = order.createdAt
    ? Math.floor((Date.now() - order.createdAt.toMillis()) / 60000)
    : 0;

  const isUrgent = ['pending', 'preparing'].includes(order.status) && ageMin > 10;

  return (
    <div
      className={cn(
        'bg-white rounded-2xl border transition-all overflow-hidden',
        isUrgent
          ? 'border-red-300 shadow-lg shadow-red-100 animate-pulse'
          : order.status === 'ready'
            ? 'border-emerald-200 shadow-sm'
            : 'border-slate-200 hover:border-slate-300'
      )}
    >
      {/* Üst kısım - özet */}
      <div className="p-4 flex items-center gap-4">
        <div className={cn('w-2.5 h-2.5 rounded-full flex-shrink-0', cfg.dot)} />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-display text-lg font-bold text-slate-900">
              {order.tableName || `Masa ${order.tableId?.slice(0, 4)}`}
            </span>
            <span className={cn('pill text-xs', cfg.color)}>{cfg.label}</span>
            {isUrgent && (
              <span className="pill bg-red-100 text-red-700 text-xs flex items-center gap-1">
                <Timer className="w-3 h-3" /> {ageMin}dk
              </span>
            )}
          </div>
          <div className="text-xs text-slate-500 mt-0.5">
            #{order.orderNo || order.id.slice(0, 6).toUpperCase()} ·
            {' '}{order.items?.length || 0} kalem ·
            {' '}{order.createdAt ? relativeTime(order.createdAt) : 'şimdi'}
          </div>
        </div>

        <div className="text-right">
          <div className="font-display font-bold text-lg text-orange-600">
            {formatPrice(order.total)}
          </div>
        </div>
      </div>

      {/* Ürün listesi toggle */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-4 pb-2 text-xs font-semibold text-slate-500 hover:text-slate-700 flex items-center justify-center gap-1"
      >
        <ChevronDown className={cn('w-3.5 h-3.5 transition-transform', expanded && 'rotate-180')} />
        {expanded ? 'Detayı kapat' : 'Detayı aç'}
      </button>

      {/* Ürünler - expanded */}
      {expanded && (
        <div className="border-t border-slate-100 p-4 bg-slate-50/50 space-y-2">
          {order.items?.map((item, i) => (
            <div key={i} className="flex items-start gap-3 text-sm">
              <span className="font-bold text-slate-700 w-6 flex-shrink-0">{item.qty}×</span>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-slate-900">{item.name}</div>
                {item.note && (
                  <div className="text-xs text-amber-700 mt-0.5 italic">Not: {item.note}</div>
                )}
              </div>
              <div className="text-sm text-slate-600 flex-shrink-0">
                {formatPrice(item.price * item.qty)}
              </div>
            </div>
          ))}

          {order.customerNote && (
            <div className="mt-3 p-2 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800">
              <strong>Müşteri notu:</strong> {order.customerNote}
            </div>
          )}
        </div>
      )}

      {/* Aksiyon butonları */}
      {cfg.next && (
        <div className="border-t border-slate-100 p-3 flex items-center gap-2">
          {order.status === 'pending' && (
            <button
              onClick={() => onUpdateStatus(order, 'cancelled')}
              className="flex-1 py-2 rounded-xl text-sm font-semibold text-red-600 hover:bg-red-50 transition-colors"
            >
              İptal
            </button>
          )}
          <button
            onClick={() => onUpdateStatus(order, cfg.next)}
            className="flex-1 py-2 rounded-xl text-sm font-bold bg-gradient-to-r from-orange-500 to-red-600 text-white hover:shadow-lg hover:shadow-orange-500/30 transition-all"
          >
            {cfg.nextLabel} →
          </button>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════
// Ses çal (basit beep)
// ═══════════════════════════════════════════════════
function playNewOrderSound() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.frequency.value = 880; // A5
    osc.type = 'sine';

    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);

    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.5);

    // Çift beep
    setTimeout(() => {
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.frequency.value = 1100;
      osc2.type = 'sine';
      gain2.gain.setValueAtTime(0.3, ctx.currentTime);
      gain2.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
      osc2.start(ctx.currentTime);
      osc2.stop(ctx.currentTime + 0.5);
    }, 200);
  } catch (e) {
    console.warn('[Sound]', e);
  }
}
