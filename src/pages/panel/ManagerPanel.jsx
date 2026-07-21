import { useMemo, useState } from 'react';
import {
  clearManagerSetup,
  createBusinessCode,
  loadManagerSetup,
  saveManagerSetup,
} from '../../utils/managerDraft';

const STEPS = [
  { title: 'Yönetici', subtitle: 'Hesap sahibi bilgileri' },
  { title: 'İşletme', subtitle: 'Marka ve adres bilgileri' },
  { title: 'Çalışma düzeni', subtitle: 'Masa ve sipariş akışı' },
  { title: 'Modüller', subtitle: 'Kullanılacak özellikler' },
];

const BUSINESS_TYPES = [
  ['restaurant', 'Restoran'],
  ['cafe', 'Kafe'],
  ['bakery', 'Fırın / Börekçi'],
  ['fast-food', 'Fast food'],
  ['dessert', 'Tatlıcı'],
  ['other', 'Diğer'],
];

function Field({ label, hint, children }) {
  return (
    <label className="block">
      <span className="text-sm font-semibold text-neutral-100">{label}</span>
      {hint && <span className="ml-2 text-xs text-neutral-500">{hint}</span>}
      <div className="mt-2">{children}</div>
    </label>
  );
}

function Toggle({ label, description, checked, onChange }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="flex w-full items-center justify-between gap-4 rounded-2xl border border-white/10 bg-neutral-800/80 p-4 text-left"
    >
      <span>
        <strong className="block text-sm text-white">{label}</strong>
        <span className="mt-1 block text-xs leading-5 text-neutral-400">{description}</span>
      </span>
      <span className={`relative h-7 w-12 shrink-0 rounded-full transition ${checked ? 'bg-emerald-500' : 'bg-neutral-600'}`}>
        <span className={`absolute top-1 h-5 w-5 rounded-full bg-white transition ${checked ? 'left-6' : 'left-1'}`} />
      </span>
    </button>
  );
}

function Dashboard({ setup, onEdit, onReset }) {
  const enabledModules = Object.values(setup.modules).filter(Boolean).length;
  const cards = [
    { icon: '🍽️', label: 'Menü yönetimi', value: '0 ürün', note: 'Sıradaki aşama' },
    { icon: '👥', label: 'Personel', value: '1 yönetici', note: 'Yetkiler daha sonra' },
    { icon: '▦', label: 'Masalar', value: `${setup.operation.tableCount} masa`, note: 'QR üretimine hazır' },
    { icon: '⚙️', label: 'Aktif modüller', value: `${enabledModules} özellik`, note: 'Kurulum tercihi' },
  ];

  return (
    <div className="min-h-screen bg-neutral-950 text-white">
      <header className="border-b border-white/10 bg-neutral-900/95 px-4 py-4">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-400">QRMASA Yönetim</p>
            <h1 className="mt-1 text-2xl font-black">{setup.business.name}</h1>
            <p className="mt-1 text-sm text-neutral-400">İşletme kodu: {setup.business.code}</p>
          </div>
          <button onClick={onEdit} className="rounded-xl bg-white px-4 py-2 text-sm font-bold text-neutral-900">
            Kurulumu düzenle
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl p-4 py-7">
        <section className="mb-6 rounded-3xl border border-amber-400/20 bg-amber-400/10 p-5">
          <div className="flex items-start gap-3">
            <span className="text-2xl">🧪</span>
            <div>
              <h2 className="font-bold text-amber-200">Geliştirme önizlemesi</h2>
              <p className="mt-1 text-sm leading-6 text-amber-100/75">
                Bu işletme kurulumu şimdilik yalnızca bu tarayıcıda taslak olarak saklanıyor. Firebase kaydı, gerçek kullanıcı hesabı ve yetkiler uygulamanın bütün modülleri tamamlandıktan sonra bağlanacak.
              </p>
            </div>
          </div>
        </section>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {cards.map((card) => (
            <article key={card.label} className="rounded-3xl border border-white/10 bg-neutral-900 p-5">
              <div className="text-3xl">{card.icon}</div>
              <p className="mt-4 text-sm text-neutral-400">{card.label}</p>
              <strong className="mt-1 block text-2xl">{card.value}</strong>
              <p className="mt-2 text-xs text-emerald-400">{card.note}</p>
            </article>
          ))}
        </section>

        <section className="mt-6 grid gap-6 lg:grid-cols-[1.25fr_0.75fr]">
          <article className="rounded-3xl border border-white/10 bg-neutral-900 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-emerald-400">Kurulum durumu</p>
                <h2 className="mt-1 text-xl font-black">Temel işletme profili hazır</h2>
              </div>
              <span className="rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-bold text-emerald-300">%25</span>
            </div>

            <div className="mt-5 h-2 overflow-hidden rounded-full bg-neutral-800">
              <div className="h-full w-1/4 rounded-full bg-emerald-500" />
            </div>

            <div className="mt-6 space-y-3">
              {[
                ['İşletme ve yönetici bilgileri', true],
                ['Kategori ve ürün yönetimi', false],
                ['Personel ve görev yetkileri', false],
                ['Masa ve QR kod yönetimi', false],
              ].map(([label, done]) => (
                <div key={label} className="flex items-center justify-between rounded-2xl bg-neutral-800 p-4">
                  <span className="text-sm">{label}</span>
                  <span className={`text-sm font-bold ${done ? 'text-emerald-400' : 'text-neutral-500'}`}>{done ? 'Tamam' : 'Bekliyor'}</span>
                </div>
              ))}
            </div>
          </article>

          <article className="rounded-3xl border border-white/10 bg-neutral-900 p-6">
            <p className="text-xs font-bold uppercase tracking-wider text-emerald-400">İşletme özeti</p>
            <dl className="mt-5 space-y-4 text-sm">
              <div>
                <dt className="text-neutral-500">Yönetici</dt>
                <dd className="mt-1 font-semibold">{setup.owner.name}</dd>
                <dd className="text-neutral-400">{setup.owner.email}</dd>
              </div>
              <div>
                <dt className="text-neutral-500">Konum</dt>
                <dd className="mt-1 font-semibold">{setup.business.district ? `${setup.business.district} / ` : ''}{setup.business.city}</dd>
              </div>
              <div>
                <dt className="text-neutral-500">Çalışma saatleri</dt>
                <dd className="mt-1 font-semibold">{setup.operation.openingTime} – {setup.operation.closingTime}</dd>
              </div>
              <div>
                <dt className="text-neutral-500">Sipariş akışı</dt>
                <dd className="mt-1 font-semibold">{setup.operation.waiterApproval ? 'Garson onaylı' : 'Doğrudan mutfağa'}</dd>
              </div>
            </dl>

            <button onClick={onReset} className="mt-7 w-full rounded-xl border border-red-400/20 bg-red-400/10 py-3 text-sm font-semibold text-red-200">
              Taslağı sıfırla
            </button>
          </article>
        </section>
      </main>
    </div>
  );
}

export default function ManagerPanel() {
  const [setup, setSetup] = useState(() => loadManagerSetup());
  const [step, setStep] = useState(0);
  const [error, setError] = useState('');
  const [codeEdited, setCodeEdited] = useState(Boolean(setup.business.code));

  const progress = useMemo(() => ((step + 1) / STEPS.length) * 100, [step]);

  function updateSection(section, key, value) {
    setSetup((current) => ({
      ...current,
      [section]: {
        ...current[section],
        [key]: value,
      },
    }));
  }

  function updateBusinessName(value) {
    setSetup((current) => ({
      ...current,
      business: {
        ...current.business,
        name: value,
        code: codeEdited ? current.business.code : createBusinessCode(value),
      },
    }));
  }

  function validateCurrentStep() {
    if (step === 0) {
      if (!setup.owner.name.trim()) return 'Yönetici adını yazın.';
      if (!setup.owner.email.includes('@')) return 'Geçerli bir e-posta adresi yazın.';
    }

    if (step === 1) {
      if (!setup.business.name.trim()) return 'İşletme adını yazın.';
      if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(setup.business.code)) {
        return 'İşletme kodu yalnızca küçük harf, sayı ve tire içermelidir.';
      }
      if (!setup.business.city.trim()) return 'Şehir bilgisini yazın.';
    }

    if (step === 2) {
      const count = Number(setup.operation.tableCount);
      if (!Number.isInteger(count) || count < 1 || count > 500) return 'Masa sayısı 1 ile 500 arasında olmalıdır.';
    }

    return '';
  }

  function nextStep() {
    const validationError = validateCurrentStep();
    if (validationError) {
      setError(validationError);
      return;
    }

    setError('');
    const saved = saveManagerSetup(setup);
    setSetup(saved);

    if (step < STEPS.length - 1) {
      setStep((current) => current + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    const completed = saveManagerSetup({ ...setup, completed: true });
    setSetup(completed);
  }

  function resetDraft() {
    const confirmed = window.confirm('Bu tarayıcıdaki işletme kurulum taslağı silinsin mi?');
    if (!confirmed) return;
    clearManagerSetup();
    window.location.reload();
  }

  if (setup.completed) {
    return (
      <Dashboard
        setup={setup}
        onEdit={() => {
          setSetup({ ...setup, completed: false });
          setStep(0);
        }}
        onReset={resetDraft}
      />
    );
  }

  const inputClass = 'w-full rounded-2xl border border-white/10 bg-neutral-800 px-4 py-3 text-white outline-none placeholder:text-neutral-600 focus:border-emerald-500';

  return (
    <div className="min-h-screen bg-neutral-950 text-white">
      <header className="border-b border-white/10 bg-neutral-900 px-4 py-4">
        <div className="mx-auto max-w-5xl">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-400">QRMASA Kurulum Merkezi</p>
          <div className="mt-2 flex items-end justify-between gap-4">
            <div>
              <h1 className="text-2xl font-black">İşletmenizi hazırlayın</h1>
              <p className="mt-1 text-sm text-neutral-400">Kayıt ve yetkilendirme olmadan yönetim ekranlarını tasarlıyoruz.</p>
            </div>
            <span className="text-sm font-bold text-neutral-300">{step + 1}/{STEPS.length}</span>
          </div>
          <div className="mt-4 h-2 overflow-hidden rounded-full bg-neutral-800">
            <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${progress}%` }} />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl p-4 py-8">
        <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
          <aside className="h-fit rounded-3xl border border-white/10 bg-neutral-900 p-4">
            {STEPS.map((item, index) => (
              <div key={item.title} className={`flex gap-3 rounded-2xl p-3 ${index === step ? 'bg-emerald-500/10' : ''}`}>
                <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-sm font-bold ${index < step ? 'bg-emerald-500 text-white' : index === step ? 'border border-emerald-400 text-emerald-300' : 'bg-neutral-800 text-neutral-500'}`}>
                  {index < step ? '✓' : index + 1}
                </span>
                <span>
                  <strong className={`block text-sm ${index === step ? 'text-white' : 'text-neutral-400'}`}>{item.title}</strong>
                  <span className="mt-1 block text-xs text-neutral-600">{item.subtitle}</span>
                </span>
              </div>
            ))}
          </aside>

          <section className="rounded-3xl border border-white/10 bg-neutral-900 p-5 sm:p-7">
            <div className="mb-7">
              <p className="text-xs font-bold uppercase tracking-wider text-emerald-400">Adım {step + 1}</p>
              <h2 className="mt-1 text-2xl font-black">{STEPS[step].title}</h2>
              <p className="mt-2 text-sm text-neutral-400">{STEPS[step].subtitle}</p>
            </div>

            {step === 0 && (
              <div className="grid gap-5 sm:grid-cols-2">
                <Field label="Ad soyad">
                  <input className={inputClass} value={setup.owner.name} onChange={(event) => updateSection('owner', 'name', event.target.value)} placeholder="Yönetici adı" />
                </Field>
                <Field label="E-posta">
                  <input type="email" className={inputClass} value={setup.owner.email} onChange={(event) => updateSection('owner', 'email', event.target.value)} placeholder="ornek@eposta.com" />
                </Field>
                <Field label="Telefon" hint="isteğe bağlı">
                  <input className={inputClass} value={setup.owner.phone} onChange={(event) => updateSection('owner', 'phone', event.target.value)} placeholder="05xx xxx xx xx" />
                </Field>
                <div className="rounded-2xl border border-emerald-400/15 bg-emerald-400/10 p-4 text-sm leading-6 text-emerald-100/75">
                  Bu bilgiler henüz kullanıcı hesabı oluşturmaz. Uygulama tamamlandığında gerçek kimlik doğrulama sistemine bağlanacaktır.
                </div>
              </div>
            )}

            {step === 1 && (
              <div className="grid gap-5 sm:grid-cols-2">
                <Field label="İşletme adı">
                  <input className={inputClass} value={setup.business.name} onChange={(event) => updateBusinessName(event.target.value)} placeholder="Örneğin: Börekçi Resul" />
                </Field>
                <Field label="İşletme kodu" hint="QR adresinde kullanılacak">
                  <input
                    className={inputClass}
                    value={setup.business.code}
                    onChange={(event) => {
                      setCodeEdited(true);
                      updateSection('business', 'code', createBusinessCode(event.target.value));
                    }}
                    placeholder="borekci-resul"
                  />
                </Field>
                <Field label="İşletme türü">
                  <select className={inputClass} value={setup.business.type} onChange={(event) => updateSection('business', 'type', event.target.value)}>
                    {BUSINESS_TYPES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                  </select>
                </Field>
                <Field label="Şehir">
                  <input className={inputClass} value={setup.business.city} onChange={(event) => updateSection('business', 'city', event.target.value)} />
                </Field>
                <Field label="İlçe" hint="isteğe bağlı">
                  <input className={inputClass} value={setup.business.district} onChange={(event) => updateSection('business', 'district', event.target.value)} placeholder="Örneğin: Şahinbey" />
                </Field>
                <Field label="Açık adres" hint="isteğe bağlı">
                  <textarea rows={3} className={`${inputClass} resize-none`} value={setup.business.address} onChange={(event) => updateSection('business', 'address', event.target.value)} placeholder="Mahalle, cadde, sokak ve kapı numarası" />
                </Field>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-5">
                <div className="grid gap-5 sm:grid-cols-3">
                  <Field label="Masa sayısı">
                    <input type="number" min="1" max="500" className={inputClass} value={setup.operation.tableCount} onChange={(event) => updateSection('operation', 'tableCount', Number(event.target.value))} />
                  </Field>
                  <Field label="Açılış saati">
                    <input type="time" className={inputClass} value={setup.operation.openingTime} onChange={(event) => updateSection('operation', 'openingTime', event.target.value)} />
                  </Field>
                  <Field label="Kapanış saati">
                    <input type="time" className={inputClass} value={setup.operation.closingTime} onChange={(event) => updateSection('operation', 'closingTime', event.target.value)} />
                  </Field>
                </div>
                <Toggle label="Garson siparişi onaylasın" description="Müşterinin siparişi önce garson ekranına düşer; onaydan sonra mutfağa gider." checked={setup.operation.waiterApproval} onChange={(value) => updateSection('operation', 'waiterApproval', value)} />
                <Toggle label="Mutfak teslim alsın" description="Onaylanan siparişler mutfak ekranında ayrıca kabul edilerek hazırlanmaya başlanır." checked={setup.operation.kitchenApproval} onChange={(value) => updateSection('operation', 'kitchenApproval', value)} />
              </div>
            )}

            {step === 3 && (
              <div className="grid gap-4 sm:grid-cols-2">
                <Toggle label="Masadan sipariş" description="Müşteri QR menüden ürün seçip sipariş oluşturabilir." checked={setup.modules.tableOrder} onChange={(value) => updateSection('modules', 'tableOrder', value)} />
                <Toggle label="Garson çağırma" description="Müşteri tek dokunuşla garson talebi oluşturabilir." checked={setup.modules.waiterCall} onChange={(value) => updateSection('modules', 'waiterCall', value)} />
                <Toggle label="Hesap isteme" description="Müşteri ödeme veya hesap talebi gönderebilir." checked={setup.modules.billRequest} onChange={(value) => updateSection('modules', 'billRequest', value)} />
                <Toggle label="Mutfak paneli" description="Siparişler hazırlama istasyonlarına yönlendirilir." checked={setup.modules.kitchenPanel} onChange={(value) => updateSection('modules', 'kitchenPanel', value)} />
                <Toggle label="Paket sipariş" description="Masa dışı paket sipariş akışını etkinleştirir." checked={setup.modules.takeaway} onChange={(value) => updateSection('modules', 'takeaway', value)} />
                <Toggle label="Rezervasyon" description="Masa rezervasyonu ve uygunluk takibi ekler." checked={setup.modules.reservation} onChange={(value) => updateSection('modules', 'reservation', value)} />
              </div>
            )}

            {error && <div className="mt-6 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">{error}</div>}

            <div className="mt-8 flex items-center justify-between gap-3 border-t border-white/10 pt-6">
              <button
                type="button"
                onClick={() => {
                  setError('');
                  setStep((current) => Math.max(0, current - 1));
                }}
                disabled={step === 0}
                className="rounded-xl bg-neutral-800 px-5 py-3 text-sm font-bold disabled:opacity-30"
              >
                Geri
              </button>
              <button type="button" onClick={nextStep} className="rounded-xl bg-emerald-600 px-6 py-3 text-sm font-bold">
                {step === STEPS.length - 1 ? 'Kurulumu tamamla' : 'Kaydet ve devam et'}
              </button>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
