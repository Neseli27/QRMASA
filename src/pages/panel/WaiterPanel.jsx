import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { signOutStaff, waitForAuthUser } from '../../firebase/auth';
import { approveOrder, rejectOrder, subscribeToWaiterOrders } from '../../firebase/orders';
import { getStaffAccess } from '../../firebase/staff';

const PENDING = 'PENDING_WAITER_APPROVAL';

function formatPrice(value) {
  return Number(value || 0).toLocaleString('tr-TR');
}

function formatTime(milliseconds) {
  if (!milliseconds) return '-';
  return new Intl.DateTimeFormat('tr-TR', { hour: '2-digit', minute: '2-digit' }).format(new Date(milliseconds));
}

function statusLabel(statusCode) {
  const labels = {
    PENDING_WAITER_APPROVAL: 'Garson onayı bekliyor',
    APPROVED: 'Onaylandı',
    REJECTED: 'Reddedildi',
    IN_PREPARATION: 'Hazırlanıyor',
    READY: 'Hazır',
    SERVED: 'Servis edildi',
  };
  return labels[statusCode] || statusCode;
}

export default function WaiterPanel() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const businessId = searchParams.get('business') || localStorage.getItem('qrmasa_staff_business') || '';
  const [access, setAccess] = useState(null);
  const [orders, setOrders] = useState([]);
  const [filter, setFilter] = useState('pending');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [workingOrderId, setWorkingOrderId] = useState('');

  useEffect(() => {
    let unsubscribeOrders = null;
    let cancelled = false;

    async function initialize() {
      try {
        if (!businessId) {
          navigate('/panel/giris', { replace: true });
          return;
        }

        const user = await waitForAuthUser();
        if (!user || user.isAnonymous) {
          navigate('/panel/giris', { replace: true });
          return;
        }

        const staffAccess = await getStaffAccess(businessId, user);
        if (cancelled) return;
        setAccess(staffAccess);
        localStorage.setItem('qrmasa_staff_business', businessId);

        unsubscribeOrders = subscribeToWaiterOrders(
          businessId,
          (nextOrders) => {
            if (!cancelled) {
              setOrders(nextOrders);
              setLoading(false);
              setError('');
            }
          },
          (subscriptionError) => {
            if (!cancelled) {
              setError(subscriptionError?.message || 'Siparişler okunamadı.');
              setLoading(false);
            }
          },
        );
      } catch (initializationError) {
        if (!cancelled) {
          setError(initializationError?.message || 'Garson paneli açılamadı.');
          setLoading(false);
        }
      }
    }

    initialize();
    return () => {
      cancelled = true;
      unsubscribeOrders?.();
    };
  }, [businessId, navigate]);

  const visibleOrders = useMemo(() => {
    if (filter === 'pending') return orders.filter((order) => order.statusCode === PENDING);
    if (filter === 'active') return orders.filter((order) => !['REJECTED', 'SERVED', 'PAID'].includes(order.statusCode));
    return orders;
  }, [filter, orders]);

  const pendingCount = orders.filter((order) => order.statusCode === PENDING).length;

  async function handleApprove(orderId) {
    if (workingOrderId) return;
    setWorkingOrderId(orderId);
    try {
      await approveOrder(businessId, orderId);
    } catch (approveError) {
      setError(approveError?.message || 'Sipariş onaylanamadı.');
    } finally {
      setWorkingOrderId('');
    }
  }

  async function handleReject(orderId) {
    if (workingOrderId) return;
    const reason = window.prompt('Siparişin reddedilme nedenini yazın:', 'Ürün şu anda hazırlanamadığı için');
    if (reason === null) return;

    setWorkingOrderId(orderId);
    try {
      await rejectOrder(businessId, orderId, reason);
    } catch (rejectError) {
      setError(rejectError?.message || 'Sipariş reddedilemedi.');
    } finally {
      setWorkingOrderId('');
    }
  }

  async function handleLogout() {
    await signOutStaff().catch(() => {});
    navigate('/panel/giris', { replace: true });
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-950 text-white grid place-items-center p-6">
        <div className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent" />
          <h1 className="text-xl font-bold">Garson paneli hazırlanıyor</h1>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-white">
      <header className="sticky top-0 z-20 border-b border-white/10 bg-neutral-900/95 px-4 py-4 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-emerald-400">Garson paneli</p>
            <h1 className="text-xl font-black">{access?.business?.ad || access?.business?.name || businessId}</h1>
            <p className="mt-1 text-xs text-neutral-400">{access?.staff?.ad || access?.staff?.name || 'Personel'} · {pendingCount} yeni sipariş</p>
          </div>
          <button onClick={handleLogout} className="rounded-xl bg-neutral-800 px-4 py-2 text-sm font-semibold">Çıkış</button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl p-4">
        <div className="mb-5 flex gap-2 overflow-x-auto pb-2">
          <button onClick={() => setFilter('pending')} className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold ${filter === 'pending' ? 'bg-emerald-600' : 'bg-neutral-800'}`}>
            Yeni ({pendingCount})
          </button>
          <button onClick={() => setFilter('active')} className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold ${filter === 'active' ? 'bg-emerald-600' : 'bg-neutral-800'}`}>
            Aktif siparişler
          </button>
          <button onClick={() => setFilter('all')} className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold ${filter === 'all' ? 'bg-emerald-600' : 'bg-neutral-800'}`}>
            Tümü
          </button>
        </div>

        {error && <div className="mb-5 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">{error}</div>}

        {visibleOrders.length === 0 ? (
          <div className="rounded-3xl border border-white/10 bg-neutral-900 p-10 text-center">
            <div className="mb-4 text-5xl">✓</div>
            <h2 className="text-xl font-bold">Bekleyen sipariş yok</h2>
            <p className="mt-2 text-sm text-neutral-400">Yeni sipariş geldiğinde bu ekran otomatik güncellenir.</p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {visibleOrders.map((order) => (
              <article key={order.id} className={`overflow-hidden rounded-3xl border bg-neutral-900 ${order.statusCode === PENDING ? 'border-amber-400/50' : 'border-white/10'}`}>
                <header className="flex items-start justify-between gap-3 border-b border-white/10 p-5">
                  <div>
                    <p className="text-xs text-neutral-400">Sipariş {order.orderNo}</p>
                    <h2 className="mt-1 text-2xl font-black">Masa {order.tableName}</h2>
                    <p className="mt-1 text-xs text-neutral-500">{formatTime(order.createdAtMillis)}</p>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold ${order.statusCode === PENDING ? 'bg-amber-400/15 text-amber-300' : 'bg-emerald-500/15 text-emerald-300'}`}>
                    {statusLabel(order.statusCode)}
                  </span>
                </header>

                <div className="space-y-3 p-5">
                  {order.items.map((item, index) => (
                    <div key={`${item.productId || item.ad}-${index}`} className="flex items-start justify-between gap-4 rounded-2xl bg-neutral-800 p-3">
                      <div>
                        <h3 className="font-semibold">{item.adet || item.quantity || 1} × {item.ad || item.name || 'Ürün'}</h3>
                        {item.not && <p className="mt-1 text-xs text-amber-200">{item.not}</p>}
                      </div>
                      <span className="whitespace-nowrap text-sm text-emerald-400">{formatPrice(item.toplam ?? item.total ?? 0)} ₺</span>
                    </div>
                  ))}

                  {order.customerNote && (
                    <div className="rounded-2xl border border-amber-400/20 bg-amber-400/10 p-4">
                      <p className="text-xs font-semibold uppercase text-amber-300">Müşteri notu</p>
                      <p className="mt-1 text-sm text-amber-100">{order.customerNote}</p>
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-2">
                    <span className="text-sm text-neutral-400">Toplam</span>
                    <strong className="text-xl text-emerald-400">{formatPrice(order.total)} ₺</strong>
                  </div>
                </div>

                {order.statusCode === PENDING && (
                  <footer className="grid grid-cols-2 gap-3 border-t border-white/10 p-5">
                    <button onClick={() => handleReject(order.id)} disabled={workingOrderId === order.id} className="rounded-xl bg-red-500/15 py-3 font-semibold text-red-200 disabled:opacity-50">
                      Reddet
                    </button>
                    <button onClick={() => handleApprove(order.id)} disabled={workingOrderId === order.id} className="rounded-xl bg-emerald-600 py-3 font-semibold disabled:opacity-50">
                      {workingOrderId === order.id ? 'İşleniyor…' : 'Onayla'}
                    </button>
                  </footer>
                )}
              </article>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
