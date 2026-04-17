import { useState, useEffect } from 'react';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { Settings, Users, Bell, Receipt, MessageSquare, DollarSign, UserCheck } from 'lucide-react';
import toast from 'react-hot-toast';
import { db } from '../../../lib/firebase';
import { collections } from '../../../lib/paths';
import { useAuth } from '../../../contexts/AuthContext';
import { useVenue } from '../../../contexts/VenueContext';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { LoadingScreen } from '../../../components/ui/StateScreens';
import { cn } from '../../../lib/utils';

const FEATURE_GROUPS = [
  {
    title: 'Sipariş Akışı',
    icon: Receipt,
    items: [
      {
        key: 'multiUserTable',
        label: 'Çoklu Kullanıcı Masa',
        description: 'Aynı masadaki birden fazla müşteri kendi telefonundan sipariş ekleyebilsin. Garson masayı tek seferde görür.'
      },
      {
        key: 'separateOrders',
        label: 'Ayrı Kişi Sipariş Görünümü',
        description: 'Garson ekranında her müşterinin siparişi ayrı görünsün (yerine masa toplamı yerine). Aile/grup için faydalı.'
      },
      {
        key: 'productNotes',
        label: 'Ürün Notları',
        description: 'Müşteri ürüne özel not yazabilsin (örn. "az tuzlu", "soğansız")'
      }
    ]
  },
  {
    title: 'Müşteri Etkileşimi',
    icon: MessageSquare,
    items: [
      {
        key: 'callWaiter',
        label: 'Garson Çağırma',
        description: 'Müşteri menüde "Garson Çağır" butonu görsün. Garson cihazına bildirim gider.'
      },
      {
        key: 'tipping',
        label: 'Bahşiş',
        description: 'Sipariş sonunda bahşiş seçeneği sunulsun (10%, 15%, 20%, özel)'
      }
    ]
  }
];

const CUSTOMER_REGISTER_OPTIONS = [
  {
    value: 'anonymous',
    label: 'Anonim',
    description: 'Müşteri kayıt/giriş yapmadan kullanabilir. En basit deneyim.'
  },
  {
    value: 'optional',
    label: 'Opsiyonel',
    description: 'Müşteri isterse hesap açar (sadakat, geçmiş sipariş için). Zorunlu değil.'
  },
  {
    value: 'required',
    label: 'Zorunlu',
    description: 'Müşteri önce kayıt/giriş yapmalı. İsim + telefon istenir.'
  }
];

export default function SettingsPage() {
  const { venueId } = useAuth();
  const { venue, loading } = useVenue();
  const [features, setFeatures] = useState({});
  const [customerRegister, setCustomerRegister] = useState('anonymous');
  const [minOrderAmount, setMinOrderAmount] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!venue) return;
    const f = venue.features || {};
    setFeatures(f);
    setCustomerRegister(f.customerRegister || 'anonymous');
    setMinOrderAmount(venue.minOrderAmount?.toString() || '');
  }, [venue]);

  const handleToggle = (key) => {
    setFeatures({ ...features, [key]: !features[key] });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        features: {
          ...features,
          customerRegister
        },
        updatedAt: serverTimestamp()
      };
      if (minOrderAmount && !isNaN(parseFloat(minOrderAmount))) {
        payload.minOrderAmount = parseFloat(minOrderAmount);
      } else {
        payload.minOrderAmount = null;
      }

      await setDoc(doc(db, collections.venues, venueId), payload, { merge: true });
      toast.success('Ayarlar kaydedildi');
    } catch (e) {
      toast.error('Kaydedilemedi: ' + e.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingScreen message="Ayarlar yükleniyor..." />;

  const originalFeatures = venue?.features || {};
  const hasChanges =
    JSON.stringify({ ...features, customerRegister }) !==
    JSON.stringify({ ...originalFeatures, customerRegister: originalFeatures.customerRegister || 'anonymous' }) ||
    minOrderAmount !== (venue?.minOrderAmount?.toString() || '');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold text-slate-900">Ayarlar</h1>
        <p className="text-sm text-slate-500 mt-1">Mekanının özelliklerini ve iş kurallarını yönet</p>
      </div>

      {/* Müşteri Giriş Modu */}
      <Card>
        <div className="flex items-center gap-2 mb-1">
          <UserCheck className="w-5 h-5 text-orange-500" />
          <h3 className="font-display text-lg font-bold text-slate-900">Müşteri Giriş Modu</h3>
        </div>
        <p className="text-sm text-slate-500 mb-4">
          Müşteri QR okuduğunda neyle karşılaşsın?
        </p>

        <div className="space-y-2">
          {CUSTOMER_REGISTER_OPTIONS.map((opt) => (
            <label
              key={opt.value}
              className={cn(
                'flex items-start gap-3 p-3 rounded-xl border-2 cursor-pointer transition-colors',
                customerRegister === opt.value
                  ? 'border-orange-500 bg-orange-50'
                  : 'border-slate-200 hover:border-slate-300'
              )}
            >
              <input
                type="radio"
                name="customerRegister"
                value={opt.value}
                checked={customerRegister === opt.value}
                onChange={() => setCustomerRegister(opt.value)}
                className="mt-0.5 w-4 h-4 text-orange-500 focus:ring-orange-200"
              />
              <div className="flex-1">
                <div className="font-semibold text-sm text-slate-900">{opt.label}</div>
                <div className="text-xs text-slate-500 mt-0.5">{opt.description}</div>
              </div>
            </label>
          ))}
        </div>
      </Card>

      {/* Feature Grupları */}
      {FEATURE_GROUPS.map((group) => (
        <Card key={group.title}>
          <div className="flex items-center gap-2 mb-4">
            <group.icon className="w-5 h-5 text-orange-500" />
            <h3 className="font-display text-lg font-bold text-slate-900">{group.title}</h3>
          </div>

          <div className="space-y-1">
            {group.items.map((item) => (
              <label
                key={item.key}
                className="flex items-start gap-4 p-3 rounded-xl hover:bg-slate-50 cursor-pointer transition-colors"
              >
                <Toggle
                  checked={!!features[item.key]}
                  onChange={() => handleToggle(item.key)}
                />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-slate-900">{item.label}</div>
                  <div className="text-xs text-slate-500 mt-0.5">{item.description}</div>
                </div>
              </label>
            ))}
          </div>
        </Card>
      ))}

      {/* İş Kuralları */}
      <Card>
        <div className="flex items-center gap-2 mb-1">
          <DollarSign className="w-5 h-5 text-orange-500" />
          <h3 className="font-display text-lg font-bold text-slate-900">İş Kuralları</h3>
        </div>
        <p className="text-sm text-slate-500 mb-4">Sipariş limitleri ve koşullar</p>

        <div className="space-y-4 max-w-md">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">
              Minimum Sipariş Tutarı (₺)
            </label>
            <input
              type="number"
              step="0.01"
              value={minOrderAmount}
              onChange={(e) => setMinOrderAmount(e.target.value)}
              placeholder="0 = limitsiz"
              className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
            />
            <p className="text-xs text-slate-500 mt-1">
              Boş bırakırsan minimum sipariş tutarı olmaz
            </p>
          </div>
        </div>
      </Card>

      {/* Kaydet - sticky */}
      {hasChanges && (
        <div className="sticky bottom-4 bg-white rounded-xl border border-slate-200 p-3 shadow-lg flex items-center justify-between gap-2">
          <div className="text-sm text-slate-600">Kaydedilmemiş değişiklikler var</div>
          <Button
            onClick={handleSave}
            loading={saving}
            className="bg-gradient-to-r from-orange-500 to-red-600"
          >
            Kaydet
          </Button>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════
// Custom Toggle (iOS tarzı)
// ═══════════════════════════════════════════════════
function Toggle({ checked, onChange }) {
  return (
    <button
      type="button"
      onClick={onChange}
      className={cn(
        'relative inline-flex h-6 w-11 items-center rounded-full transition-colors flex-shrink-0 mt-0.5',
        checked ? 'bg-orange-500' : 'bg-slate-300'
      )}
    >
      <span
        className={cn(
          'inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform',
          checked ? 'translate-x-6' : 'translate-x-1'
        )}
      />
    </button>
  );
}
