import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { loadManagerSetup } from '../../utils/managerDraft';
import {
  clearTableDraft,
  createQrToken,
  createTableId,
  createTables,
  loadTableDraft,
  saveTableDraft,
  TABLE_STATUSES,
} from '../../utils/tableDraft';

function blankTable(area = 'Salon') {
  return {
    id: '',
    number: '',
    name: '',
    area,
    capacity: 4,
    active: true,
    status: 'available',
    qrToken: createQrToken(),
    sortOrder: 1,
  };
}

function statusInfo(value) {
  return TABLE_STATUSES.find((item) => item.value === value) || TABLE_STATUSES[0];
}

function statusClass(value) {
  const classes = {
    available: 'bg-emerald-500/15 text-emerald-300',
    occupied: 'bg-red-500/15 text-red-200',
    reserved: 'bg-amber-500/15 text-amber-200',
    service: 'bg-neutral-700 text-neutral-300',
  };
  return classes[value] || classes.available;
}

function tableUrl(businessCode, table) {
  const url = new URL(`/m/${encodeURIComponent(businessCode)}/${encodeURIComponent(table.number)}`, window.location.origin);
  url.searchParams.set('qr', table.qrToken);
  return url.toString();
}

function qrImageUrl(payload, size = 320) {
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&margin=12&data=${encodeURIComponent(payload)}`;
}

function escapeHtml(value) {
  return String(value || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

export default function TableManagement() {
  const navigate = useNavigate();
  const setup = useMemo(() => loadManagerSetup(), []);
  const businessCode = setup.business.code;
  const [draft, setDraft] = useState(() => loadTableDraft(businessCode, setup.operation.tableCount));
  const [search, setSearch] = useState('');
  const [areaFilter, setAreaFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [form, setForm] = useState(() => blankTable());
  const [modalOpen, setModalOpen] = useState(false);
  const [qrTable, setQrTable] = useState(null);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulk, setBulk] = useState({ count: 5, startAt: draft.tables.length + 1, area: draft.areas[0] || 'Salon' });
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const tables = useMemo(
    () => [...draft.tables].sort((a, b) => Number(a.sortOrder || 9999) - Number(b.sortOrder || 9999) || String(a.number).localeCompare(String(b.number), 'tr', { numeric: true })),
    [draft.tables],
  );

  const visibleTables = useMemo(() => {
    const needle = search.trim().toLocaleLowerCase('tr-TR');
    return tables
      .filter((table) => areaFilter === 'all' || table.area === areaFilter)
      .filter((table) => statusFilter === 'all' || table.status === statusFilter)
      .filter((table) => !needle || `${table.name} ${table.number} ${table.area}`.toLocaleLowerCase('tr-TR').includes(needle));
  }, [areaFilter, search, statusFilter, tables]);

  const activeCount = draft.tables.filter((table) => table.active).length;
  const occupiedCount = draft.tables.filter((table) => table.status === 'occupied').length;

  function persist(nextDraft, message = 'Değişiklikler kaydedildi.') {
    const saved = saveTableDraft(businessCode, nextDraft);
    setDraft(saved);
    setNotice(message);
    window.setTimeout(() => setNotice(''), 2200);
  }

  function openNewTable() {
    const nextNumber = draft.tables.reduce((maximum, table) => Math.max(maximum, Number(table.number) || 0), 0) + 1;
    setForm({
      ...blankTable(draft.areas[0] || 'Salon'),
      number: String(nextNumber),
      name: `Masa ${nextNumber}`,
      sortOrder: nextNumber,
    });
    setError('');
    setModalOpen(true);
  }

  function openEditTable(table) {
    setForm({ ...table });
    setError('');
    setModalOpen(true);
  }

  function updateField(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function submitTable(event) {
    event.preventDefault();
    const number = String(form.number || '').trim();
    const name = String(form.name || '').trim();
    const area = String(form.area || '').trim();
    const capacity = Number(form.capacity);
    const sortOrder = Number(form.sortOrder);

    if (!number) {
      setError('Masa numarasını yazın.');
      return;
    }
    if (!name) {
      setError('Masa adını yazın.');
      return;
    }
    if (!area) {
      setError('Masanın bulunduğu alanı yazın.');
      return;
    }
    if (!Number.isInteger(capacity) || capacity < 1 || capacity > 50) {
      setError('Kapasite 1 ile 50 kişi arasında olmalıdır.');
      return;
    }
    if (!Number.isFinite(sortOrder) || sortOrder < 1) {
      setError('Gösterim sırası 1 veya daha büyük olmalıdır.');
      return;
    }

    const duplicateNumber = draft.tables.some((table) => table.id !== form.id && String(table.number).toLocaleLowerCase('tr-TR') === number.toLocaleLowerCase('tr-TR'));
    if (duplicateNumber) {
      setError('Bu masa numarası daha önce kullanılmış.');
      return;
    }

    const table = {
      ...form,
      id: form.id || createTableId(),
      number,
      name,
      area,
      capacity,
      sortOrder,
      qrToken: form.qrToken || createQrToken(),
      createdAt: form.createdAt || Date.now(),
      updatedAt: Date.now(),
    };

    const nextTables = form.id
      ? draft.tables.map((item) => (item.id === form.id ? table : item))
      : [...draft.tables, table];
    const nextAreas = draft.areas.includes(area) ? draft.areas : [...draft.areas, area];

    persist({ ...draft, tables: nextTables, areas: nextAreas }, form.id ? 'Masa bilgileri güncellendi.' : 'Yeni masa eklendi.');
    setModalOpen(false);
    setError('');
  }

  function createBulkTables(event) {
    event.preventDefault();
    const count = Number(bulk.count);
    const startAt = Number(bulk.startAt);
    const area = String(bulk.area || '').trim();

    if (!Number.isInteger(count) || count < 1 || count > 100) {
      setError('Tek seferde 1 ile 100 arasında masa oluşturabilirsiniz.');
      return;
    }
    if (!Number.isInteger(startAt) || startAt < 1) {
      setError('Başlangıç numarası 1 veya daha büyük olmalıdır.');
      return;
    }
    if (!area) {
      setError('Masa alanını yazın.');
      return;
    }

    const generated = createTables(count, startAt, area);
    const existingNumbers = new Set(draft.tables.map((table) => String(table.number).toLocaleLowerCase('tr-TR')));
    const duplicates = generated.filter((table) => existingNumbers.has(String(table.number).toLocaleLowerCase('tr-TR')));
    if (duplicates.length > 0) {
      setError(`Masa ${duplicates.map((table) => table.number).join(', ')} numaraları zaten kullanılıyor.`);
      return;
    }

    const nextAreas = draft.areas.includes(area) ? draft.areas : [...draft.areas, area];
    persist({ ...draft, tables: [...draft.tables, ...generated], areas: nextAreas }, `${count} masa toplu olarak oluşturuldu.`);
    setBulkOpen(false);
    setBulk({ count: 5, startAt: startAt + count, area });
    setError('');
  }

  function toggleActive(table) {
    persist({
      ...draft,
      tables: draft.tables.map((item) => item.id === table.id ? { ...item, active: !item.active, updatedAt: Date.now() } : item),
    }, table.active ? 'Masa QR menüsüne kapatıldı.' : 'Masa yeniden aktifleştirildi.');
  }

  function changeStatus(table, status) {
    persist({
      ...draft,
      tables: draft.tables.map((item) => item.id === table.id ? { ...item, status, updatedAt: Date.now() } : item),
    }, 'Masa durumu güncellendi.');
  }

  function regenerateQr(table) {
    if (!window.confirm(`${table.name} için mevcut QR bağlantısı iptal edilip yenisi oluşturulsun mu?`)) return;
    const qrToken = createQrToken();
    const nextTables = draft.tables.map((item) => item.id === table.id ? { ...item, qrToken, updatedAt: Date.now() } : item);
    persist({ ...draft, tables: nextTables }, 'Yeni QR güvenlik kodu oluşturuldu.');
    setQrTable({ ...table, qrToken });
  }

  function deleteTable(table) {
    if (!window.confirm(`“${table.name}” silinsin mi? Bu masanın QR kodu geçersiz olacaktır.`)) return;
    persist({ ...draft, tables: draft.tables.filter((item) => item.id !== table.id) }, 'Masa silindi.');
    if (qrTable?.id === table.id) setQrTable(null);
  }

  async function copyLink(table) {
    try {
      await navigator.clipboard.writeText(tableUrl(businessCode, table));
      setNotice('Müşteri menüsü bağlantısı kopyalandı.');
      window.setTimeout(() => setNotice(''), 2200);
    } catch {
      setError('Bağlantı panoya kopyalanamadı. QR penceresindeki adresi elle kopyalayın.');
    }
  }

  function printTables(list) {
    const printable = list.filter((table) => table.active);
    if (printable.length === 0) {
      setError('Yazdırılabilecek aktif masa bulunmuyor.');
      return;
    }

    const cards = printable.map((table) => {
      const url = tableUrl(businessCode, table);
      return `
        <article class="card">
          <p class="brand">${escapeHtml(setup.business.name)}</p>
          <h1>${escapeHtml(table.name)}</h1>
          <img src="${qrImageUrl(url, 360)}" alt="${escapeHtml(table.name)} QR kodu" />
          <p class="instruction">Menüyü görmek ve sipariş vermek için QR kodu okutun.</p>
          <p class="code">${escapeHtml(businessCode)} · ${escapeHtml(table.number)}</p>
        </article>
      `;
    }).join('');

    const popup = window.open('', '_blank', 'width=1000,height=800');
    if (!popup) {
      setError('Yazdırma penceresi engellendi. Tarayıcıda açılır pencerelere izin verin.');
      return;
    }

    popup.document.write(`<!doctype html><html lang="tr"><head><meta charset="utf-8"><title>Masa QR Kodları</title><style>
      *{box-sizing:border-box}body{margin:0;padding:24px;font-family:Arial,sans-serif;color:#111;background:#eee}.grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:18px}.card{background:white;border:2px solid #111;border-radius:22px;padding:24px;text-align:center;break-inside:avoid;page-break-inside:avoid}.brand{margin:0;font-size:13px;font-weight:800;letter-spacing:.16em;text-transform:uppercase}.card h1{margin:8px 0 15px;font-size:30px}.card img{width:260px;max-width:100%;height:auto}.instruction{margin:14px auto 0;max-width:330px;font-size:16px;line-height:1.4}.code{margin:12px 0 0;color:#555;font-size:12px}@media print{body{background:white;padding:0}.grid{gap:10mm}.card{border-radius:12px;padding:12mm}@page{margin:10mm}}
    </style></head><body><main class="grid">${cards}</main><script>window.addEventListener('load',()=>setTimeout(()=>window.print(),700));<\/script></body></html>`);
    popup.document.close();
  }

  function resetDraft() {
    if (!window.confirm('Bu işletmenin masa ve QR taslağı sıfırlansın mı?')) return;
    clearTableDraft(businessCode);
    setDraft(loadTableDraft(businessCode, setup.operation.tableCount));
    setAreaFilter('all');
    setStatusFilter('all');
    setNotice('Masa taslağı sıfırlandı.');
  }

  if (!setup.completed || !businessCode) {
    return (
      <div className="min-h-screen bg-neutral-950 p-6 text-white grid place-items-center">
        <div className="w-full max-w-lg rounded-3xl border border-amber-400/20 bg-neutral-900 p-7 text-center">
          <div className="text-5xl">⚠️</div>
          <h1 className="mt-4 text-2xl font-black">Önce işletme kurulumunu tamamlayın</h1>
          <p className="mt-2 text-sm text-neutral-400">Masalar işletme koduna bağlı olarak hazırlanır.</p>
          <button onClick={() => navigate('/panel/yonetici')} className="mt-6 rounded-xl bg-emerald-600 px-6 py-3 font-bold">Yönetici kurulumuna dön</button>
        </div>
      </div>
    );
  }

  const inputClass = 'w-full rounded-2xl border border-white/10 bg-neutral-800 px-4 py-3 text-white outline-none placeholder:text-neutral-600 focus:border-emerald-500';

  return (
    <div className="min-h-screen bg-neutral-950 text-white">
      <header className="sticky top-0 z-30 border-b border-white/10 bg-neutral-900/95 px-4 py-4 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-400">QRMASA Masa Yönetimi</p>
            <h1 className="mt-1 text-2xl font-black">{setup.business.name}</h1>
            <p className="mt-1 text-sm text-neutral-400">Masa, alan, kapasite ve QR kod yönetimi</p>
          </div>
          <div className="flex flex-wrap justify-end gap-2">
            <button onClick={() => navigate('/panel/yonetici')} className="rounded-xl bg-neutral-800 px-4 py-2 text-sm font-bold">Yönetim ana sayfası</button>
            <button onClick={() => { setBulkOpen(true); setError(''); }} className="rounded-xl bg-neutral-800 px-4 py-2 text-sm font-bold">Toplu oluştur</button>
            <button onClick={openNewTable} className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-bold">+ Masa ekle</button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl p-4 py-7">
        <section className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[
            ['Toplam masa', draft.tables.length, '▦'],
            ['Aktif QR', activeCount, '◩'],
            ['Dolu masa', occupiedCount, '●'],
            ['Alan / bölüm', draft.areas.length, '⌂'],
          ].map(([label, value, icon]) => (
            <article key={label} className="rounded-3xl border border-white/10 bg-neutral-900 p-5">
              <div className="text-2xl">{icon}</div>
              <p className="mt-3 text-sm text-neutral-400">{label}</p>
              <strong className="mt-1 block text-3xl">{value}</strong>
            </article>
          ))}
        </section>

        <section className="mb-6 rounded-3xl border border-amber-400/20 bg-amber-400/10 p-5 text-sm leading-6 text-amber-100/80">
          Bu ekran geliştirme taslağıdır. Masa bilgileri bu tarayıcıda saklanır. QR kodlar mevcut Preview adresine yönlenir; gerçek alan adı ve Firebase masa kayıtları bütün modüller tamamlandığında bağlanacaktır.
        </section>

        {notice && <div className="mb-5 rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-4 text-sm text-emerald-200">{notice}</div>}
        {error && !modalOpen && !bulkOpen && <div className="mb-5 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">{error}</div>}

        <section className="rounded-3xl border border-white/10 bg-neutral-900 p-5 sm:p-6">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-emerald-400">Masa listesi</p>
              <h2 className="mt-1 text-xl font-black">Salon ve servis alanları</h2>
            </div>
            <div className="grid gap-2 sm:grid-cols-3">
              <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Masa ara" className="rounded-xl border border-white/10 bg-neutral-800 px-4 py-2 text-sm outline-none focus:border-emerald-500" />
              <select value={areaFilter} onChange={(event) => setAreaFilter(event.target.value)} className="rounded-xl border border-white/10 bg-neutral-800 px-4 py-2 text-sm outline-none">
                <option value="all">Tüm alanlar</option>
                {draft.areas.map((area) => <option key={area} value={area}>{area}</option>)}
              </select>
              <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="rounded-xl border border-white/10 bg-neutral-800 px-4 py-2 text-sm outline-none">
                <option value="all">Tüm durumlar</option>
                {TABLE_STATUSES.map((status) => <option key={status.value} value={status.value}>{status.label}</option>)}
              </select>
            </div>
          </div>

          {visibleTables.length === 0 ? (
            <div className="mt-6 rounded-3xl border border-dashed border-white/10 bg-neutral-950/40 p-12 text-center">
              <div className="text-5xl">▦</div>
              <h3 className="mt-4 text-xl font-bold">Masa bulunamadı</h3>
              <p className="mt-2 text-sm text-neutral-400">Filtreleri temizleyin veya yeni masa oluşturun.</p>
            </div>
          ) : (
            <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {visibleTables.map((table) => {
                const status = statusInfo(table.status);
                return (
                  <article key={table.id} className={`rounded-3xl border p-5 ${table.active ? 'border-white/10 bg-neutral-800/70' : 'border-white/5 bg-neutral-900 opacity-70'}`}>
                    <div className="flex items-start justify-between gap-4">
                      <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-emerald-500/15 text-xl font-black text-emerald-300">{table.number}</div>
                      <div className="min-w-0 flex-1">
                        <h3 className="truncate text-xl font-black">{table.name}</h3>
                        <p className="mt-1 text-sm text-neutral-400">{table.area} · {table.capacity} kişilik</p>
                      </div>
                      <span className={`rounded-full px-3 py-1 text-xs font-bold ${table.active ? 'bg-emerald-500/15 text-emerald-300' : 'bg-neutral-700 text-neutral-400'}`}>{table.active ? 'QR aktif' : 'Kapalı'}</span>
                    </div>

                    <div className="mt-5 grid grid-cols-[1fr_auto] gap-2">
                      <select value={table.status} onChange={(event) => changeStatus(table, event.target.value)} className={`rounded-xl border border-white/5 px-3 py-2 text-sm font-semibold outline-none ${statusClass(table.status)}`}>
                        {TABLE_STATUSES.map((item) => <option className="bg-neutral-900 text-white" key={item.value} value={item.value}>{item.label}</option>)}
                      </select>
                      <button onClick={() => setQrTable(table)} className="rounded-xl bg-white px-4 py-2 text-sm font-black text-neutral-900">QR kod</button>
                    </div>
                    <p className="mt-2 text-xs text-neutral-500">{status.description}</p>

                    <div className="mt-5 grid grid-cols-3 gap-2 border-t border-white/10 pt-4">
                      <button onClick={() => openEditTable(table)} className="rounded-xl bg-neutral-700 py-2 text-sm font-semibold">Düzenle</button>
                      <button onClick={() => toggleActive(table)} className="rounded-xl bg-neutral-700 py-2 text-sm font-semibold">{table.active ? 'Kapat' : 'Aktifleştir'}</button>
                      <button onClick={() => deleteTable(table)} className="rounded-xl bg-red-500/10 py-2 text-sm font-semibold text-red-200">Sil</button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}

          <div className="mt-6 flex flex-wrap justify-between gap-3 border-t border-white/10 pt-5">
            <button onClick={resetDraft} className="rounded-xl border border-red-400/20 bg-red-400/10 px-5 py-3 text-sm font-semibold text-red-200">Masa taslağını sıfırla</button>
            <button onClick={() => printTables(visibleTables)} className="rounded-xl bg-white px-5 py-3 text-sm font-black text-neutral-900">Görünen QR kodları yazdır</button>
          </div>
        </section>
      </main>

      {modalOpen && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/80 p-4" onClick={() => setModalOpen(false)}>
          <form onSubmit={submitTable} className="max-h-[94vh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-white/10 bg-neutral-900" onClick={(event) => event.stopPropagation()}>
            <header className="flex items-center justify-between border-b border-white/10 p-5">
              <div><p className="text-xs font-bold uppercase tracking-wider text-emerald-400">Masa kaydı</p><h2 className="mt-1 text-xl font-black">{form.id ? 'Masayı düzenle' : 'Yeni masa ekle'}</h2></div>
              <button type="button" onClick={() => setModalOpen(false)} className="h-10 w-10 rounded-full bg-neutral-800 text-xl">×</button>
            </header>
            <div className="grid gap-4 p-5 sm:grid-cols-2 sm:p-6">
              <label className="block"><span className="text-sm font-semibold">Masa numarası</span><input value={form.number} onChange={(event) => updateField('number', event.target.value)} className={`${inputClass} mt-2`} placeholder="1" /></label>
              <label className="block"><span className="text-sm font-semibold">Masa adı</span><input value={form.name} onChange={(event) => updateField('name', event.target.value)} className={`${inputClass} mt-2`} placeholder="Masa 1" /></label>
              <label className="block"><span className="text-sm font-semibold">Alan / bölüm</span><input list="table-areas" value={form.area} onChange={(event) => updateField('area', event.target.value)} className={`${inputClass} mt-2`} placeholder="Salon" /><datalist id="table-areas">{draft.areas.map((area) => <option key={area} value={area} />)}</datalist></label>
              <label className="block"><span className="text-sm font-semibold">Kapasite</span><input type="number" min="1" max="50" value={form.capacity} onChange={(event) => updateField('capacity', Number(event.target.value))} className={`${inputClass} mt-2`} /></label>
              <label className="block"><span className="text-sm font-semibold">Gösterim sırası</span><input type="number" min="1" value={form.sortOrder} onChange={(event) => updateField('sortOrder', Number(event.target.value))} className={`${inputClass} mt-2`} /></label>
              <label className="block"><span className="text-sm font-semibold">Durum</span><select value={form.status} onChange={(event) => updateField('status', event.target.value)} className={`${inputClass} mt-2`}>{TABLE_STATUSES.map((status) => <option key={status.value} value={status.value}>{status.label}</option>)}</select></label>
              <button type="button" onClick={() => updateField('active', !form.active)} className="flex items-center justify-between rounded-2xl border border-white/10 bg-neutral-800 p-4 text-left sm:col-span-2"><span><strong className="block text-sm">QR menüsü aktif</strong><span className="mt-1 block text-xs text-neutral-500">Kapalı masanın QR bağlantısı müşteri kullanımına sunulmaz.</span></span><span className={`relative h-7 w-12 rounded-full ${form.active ? 'bg-emerald-500' : 'bg-neutral-600'}`}><span className={`absolute top-1 h-5 w-5 rounded-full bg-white transition-all ${form.active ? 'left-6' : 'left-1'}`} /></span></button>
              {error && <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200 sm:col-span-2">{error}</div>}
            </div>
            <footer className="flex items-center justify-end gap-3 border-t border-white/10 p-5"><button type="button" onClick={() => setModalOpen(false)} className="rounded-xl bg-neutral-800 px-5 py-3 text-sm font-bold">Vazgeç</button><button className="rounded-xl bg-emerald-600 px-6 py-3 text-sm font-bold">{form.id ? 'Değişiklikleri kaydet' : 'Masayı ekle'}</button></footer>
          </form>
        </div>
      )}

      {bulkOpen && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/80 p-4" onClick={() => setBulkOpen(false)}>
          <form onSubmit={createBulkTables} className="w-full max-w-xl rounded-3xl border border-white/10 bg-neutral-900" onClick={(event) => event.stopPropagation()}>
            <header className="flex items-center justify-between border-b border-white/10 p-5"><div><p className="text-xs font-bold uppercase tracking-wider text-emerald-400">Toplu işlem</p><h2 className="mt-1 text-xl font-black">Birden fazla masa oluştur</h2></div><button type="button" onClick={() => setBulkOpen(false)} className="h-10 w-10 rounded-full bg-neutral-800 text-xl">×</button></header>
            <div className="grid gap-4 p-5 sm:grid-cols-2 sm:p-6">
              <label className="block"><span className="text-sm font-semibold">Masa adedi</span><input type="number" min="1" max="100" value={bulk.count} onChange={(event) => setBulk((current) => ({ ...current, count: Number(event.target.value) }))} className={`${inputClass} mt-2`} /></label>
              <label className="block"><span className="text-sm font-semibold">Başlangıç numarası</span><input type="number" min="1" value={bulk.startAt} onChange={(event) => setBulk((current) => ({ ...current, startAt: Number(event.target.value) }))} className={`${inputClass} mt-2`} /></label>
              <label className="block sm:col-span-2"><span className="text-sm font-semibold">Alan / bölüm</span><input list="bulk-table-areas" value={bulk.area} onChange={(event) => setBulk((current) => ({ ...current, area: event.target.value }))} className={`${inputClass} mt-2`} /><datalist id="bulk-table-areas">{draft.areas.map((area) => <option key={area} value={area} />)}</datalist></label>
              {error && <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200 sm:col-span-2">{error}</div>}
            </div>
            <footer className="flex items-center justify-end gap-3 border-t border-white/10 p-5"><button type="button" onClick={() => setBulkOpen(false)} className="rounded-xl bg-neutral-800 px-5 py-3 text-sm font-bold">Vazgeç</button><button className="rounded-xl bg-emerald-600 px-6 py-3 text-sm font-bold">Masaları oluştur</button></footer>
          </form>
        </div>
      )}

      {qrTable && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/80 p-4" onClick={() => setQrTable(null)}>
          <section className="max-h-[94vh] w-full max-w-lg overflow-y-auto rounded-3xl border border-white/10 bg-neutral-900" onClick={(event) => event.stopPropagation()}>
            <header className="flex items-center justify-between border-b border-white/10 p-5"><div><p className="text-xs font-bold uppercase tracking-wider text-emerald-400">Müşteri QR kodu</p><h2 className="mt-1 text-xl font-black">{qrTable.name}</h2></div><button onClick={() => setQrTable(null)} className="h-10 w-10 rounded-full bg-neutral-800 text-xl">×</button></header>
            <div className="p-6 text-center">
              <div className="mx-auto w-fit rounded-3xl bg-white p-4"><img src={qrImageUrl(tableUrl(businessCode, qrTable))} alt={`${qrTable.name} QR kodu`} className="h-72 w-72 max-w-full" /></div>
              <p className="mt-5 text-sm font-semibold">Müşteri bu kodu okuttuğunda doğrudan {qrTable.name} menüsüne gider.</p>
              <div className="mt-4 break-all rounded-2xl bg-neutral-800 p-4 text-left text-xs text-neutral-400">{tableUrl(businessCode, qrTable)}</div>
              <div className="mt-5 grid gap-2 sm:grid-cols-2">
                <button onClick={() => copyLink(qrTable)} className="rounded-xl bg-neutral-800 py-3 text-sm font-bold">Bağlantıyı kopyala</button>
                <button onClick={() => window.open(tableUrl(businessCode, qrTable), '_blank', 'noopener,noreferrer')} className="rounded-xl bg-neutral-800 py-3 text-sm font-bold">Müşteri menüsünü aç</button>
                <button onClick={() => printTables([qrTable])} className="rounded-xl bg-white py-3 text-sm font-black text-neutral-900">QR kodu yazdır</button>
                <button onClick={() => regenerateQr(qrTable)} className="rounded-xl bg-red-500/10 py-3 text-sm font-bold text-red-200">QR kodu yenile</button>
              </div>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
