import { useEffect, useState, useRef } from 'react';
import {
  collection, onSnapshot, orderBy, query, doc, setDoc, deleteDoc,
  serverTimestamp
} from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import {
  Plus, Pencil, Trash2, QrCode, Download, Eye,
  Copy, Check, Printer
} from 'lucide-react';
import toast from 'react-hot-toast';
import { db, functions } from '../../../lib/firebase';
import { venueCol } from '../../../lib/paths';
import { useAuth } from '../../../contexts/AuthContext';
import { useVenue } from '../../../contexts/VenueContext';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Modal, ConfirmDialog } from '../../../components/ui/Modal';
import { Card } from '../../../components/ui/Card';
import { EmptyState, LoadingScreen } from '../../../components/ui/StateScreens';
import { shortId, cn } from '../../../lib/utils';

export default function TablesPage() {
  const { venueId } = useAuth();
  const { venue } = useVenue();
  const [tables, setTables] = useState([]);
  const [loading, setLoading] = useState(true);

  const [modalOpen, setModalOpen] = useState(false);
  const [editTable, setEditTable] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [qrModalOpen, setQrModalOpen] = useState(null); // Tek QR göster
  const [printModalOpen, setPrintModalOpen] = useState(false); // Toplu yazdırma
  const [selectedIds, setSelectedIds] = useState(new Set());

  useEffect(() => {
    if (!venueId) return;
    const q = query(
      collection(db, venueCol(venueId, 'tables')),
      orderBy('sortOrder', 'asc')
    );
    const unsub = onSnapshot(q, (snap) => {
      const list = [];
      snap.forEach((d) => list.push({ id: d.id, ...d.data() }));
      setTables(list);
      setLoading(false);
    });
    return () => unsub();
  }, [venueId]);

  const handleDelete = async (table) => {
    try {
      await deleteDoc(doc(db, venueCol(venueId, 'tables'), table.id));
      toast.success('Masa silindi');
      setSelectedIds(new Set([...selectedIds].filter(id => id !== table.id)));
    } catch (e) {
      toast.error('Silinemedi: ' + e.message);
    }
  };

  const toggleSelect = (id) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === tables.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(tables.map(t => t.id)));
  };

  if (loading) return <LoadingScreen message="Masalar yükleniyor..." />;

  return (
    <div className="space-y-6">
      {/* Başlık + aksiyonlar */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-display text-3xl font-bold text-slate-900">Masalar</h1>
          <p className="text-sm text-slate-500 mt-1">
            {tables.length} masa · QR kodları ile müşteri sipariş verir
          </p>
        </div>
        <div className="flex items-center gap-2">
          {selectedIds.size > 0 && (
            <Button
              variant="secondary"
              icon={Printer}
              onClick={() => setPrintModalOpen(true)}
            >
              QR Yazdır ({selectedIds.size})
            </Button>
          )}
          <Button
            icon={Plus}
            onClick={() => { setEditTable(null); setModalOpen(true); }}
            className="bg-gradient-to-r from-orange-500 to-red-600"
          >
            Masa Ekle
          </Button>
        </div>
      </div>

      {tables.length === 0 ? (
        <Card>
          <EmptyState
            icon={QrCode}
            title="Henüz masa yok"
            description="İlk masanı ekle. Her masanın benzersiz QR kodu olur."
            action={
              <Button
                icon={Plus}
                onClick={() => { setEditTable(null); setModalOpen(true); }}
                className="mt-2 bg-gradient-to-r from-orange-500 to-red-600"
              >
                İlk Masayı Ekle
              </Button>
            }
          />
        </Card>
      ) : (
        <Card padding="none">
          {/* Toplu seçim */}
          <div className="px-5 py-3 border-b border-slate-100 flex items-center gap-3">
            <input
              type="checkbox"
              checked={selectedIds.size === tables.length && tables.length > 0}
              onChange={toggleSelectAll}
              className="w-4 h-4 rounded border-slate-300 text-orange-500 focus:ring-orange-200"
            />
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
              {selectedIds.size > 0 ? `${selectedIds.size} seçili` : 'Tümünü seç'}
            </span>
          </div>

          <div className="divide-y divide-slate-100">
            {tables.map((t) => (
              <TableRow
                key={t.id}
                table={t}
                selected={selectedIds.has(t.id)}
                onToggleSelect={() => toggleSelect(t.id)}
                onEdit={() => { setEditTable(t); setModalOpen(true); }}
                onDelete={() => setConfirmDelete(t)}
                onShowQR={() => setQrModalOpen(t)}
              />
            ))}
          </div>
        </Card>
      )}

      {/* Modallar */}
      <TableModal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditTable(null); }}
        venueId={venueId}
        editTable={editTable}
        nextOrder={tables.length}
      />

      <ConfirmDialog
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        onConfirm={async () => {
          await handleDelete(confirmDelete);
          setConfirmDelete(null);
        }}
        title="Masa Sil"
        message={confirmDelete ? `"${confirmDelete.name}" silinecek. Emin misin?` : ''}
        confirmText="Sil"
        danger
      />

      <QRModal
        table={qrModalOpen}
        venue={venue}
        onClose={() => setQrModalOpen(null)}
      />

      <PrintQRModal
        open={printModalOpen}
        onClose={() => setPrintModalOpen(false)}
        tables={tables.filter(t => selectedIds.has(t.id))}
        venue={venue}
      />
    </div>
  );
}

// ═══════════════════════════════════════════════════
// Tablo Satırı
// ═══════════════════════════════════════════════════
function TableRow({ table, selected, onToggleSelect, onEdit, onDelete, onShowQR }) {
  return (
    <div className={cn(
      'px-5 py-3 flex items-center gap-3 hover:bg-slate-50 transition-colors',
      selected && 'bg-orange-50/50'
    )}>
      <input
        type="checkbox"
        checked={selected}
        onChange={onToggleSelect}
        className="w-4 h-4 rounded border-slate-300 text-orange-500 focus:ring-orange-200"
      />

      <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center flex-shrink-0">
        <QrCode className="w-5 h-5 text-orange-600" />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-slate-900">{table.name}</span>
          {table.zone && (
            <span className="pill bg-slate-100 text-slate-600 text-xs">{table.zone}</span>
          )}
          {table.capacity && (
            <span className="text-xs text-slate-500">{table.capacity} kişi</span>
          )}
        </div>
        <div className="text-xs text-slate-500 mt-0.5 font-mono">ID: {table.id}</div>
      </div>

      <div className="flex items-center gap-1">
        <button
          onClick={onShowQR}
          className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-orange-100 hover:bg-orange-200 text-orange-700 transition-colors flex items-center gap-1.5"
        >
          <QrCode className="w-3.5 h-3.5" />
          QR
        </button>
        <button
          onClick={onEdit}
          className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100"
        >
          <Pencil className="w-4 h-4" />
        </button>
        <button
          onClick={onDelete}
          className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-red-600 hover:bg-red-50"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════
// Masa Ekle/Düzenle Modal
// ═══════════════════════════════════════════════════
function TableModal({ open, onClose, venueId, editTable, nextOrder }) {
  const [form, setForm] = useState({ name: '', capacity: '', zone: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (editTable) {
      setForm({
        name: editTable.name || '',
        capacity: editTable.capacity?.toString() || '',
        zone: editTable.zone || ''
      });
    } else {
      setForm({ name: '', capacity: '', zone: '' });
    }
  }, [editTable, open]);

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast.error('Masa adı gerekli');
      return;
    }
    setSaving(true);
    try {
      const id = editTable?.id || `t_${shortId(8).toLowerCase()}`;
      const payload = {
        name: form.name.trim(),
        capacity: form.capacity ? parseInt(form.capacity) : null,
        zone: form.zone.trim() || null,
        updatedAt: serverTimestamp()
      };
      if (!editTable) {
        payload.createdAt = serverTimestamp();
        payload.sortOrder = nextOrder;
        payload.active = true;
      }
      await setDoc(doc(db, venueCol(venueId, 'tables'), id), payload, { merge: true });
      toast.success(editTable ? 'Masa güncellendi' : 'Masa eklendi');
      onClose();
    } catch (e) {
      toast.error('Hata: ' + e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editTable ? 'Masa Düzenle' : 'Yeni Masa'}
      footer={
        <>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-100"
          >
            İptal
          </button>
          <Button
            onClick={handleSave}
            loading={saving}
            className="bg-gradient-to-r from-orange-500 to-red-600"
          >
            Kaydet
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Input
          label="Masa Adı *"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          placeholder="Örn: Masa 1, Bahçe 5, VIP 2"
          autoFocus
        />
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Kapasite"
            type="number"
            value={form.capacity}
            onChange={(e) => setForm({ ...form, capacity: e.target.value })}
            placeholder="4"
            hint="Kişi sayısı"
          />
          <Input
            label="Bölge"
            value={form.zone}
            onChange={(e) => setForm({ ...form, zone: e.target.value })}
            placeholder="Salon, Bahçe, Teras"
          />
        </div>
      </div>
    </Modal>
  );
}

// ═══════════════════════════════════════════════════
// Tek Masa QR Modal
// ═══════════════════════════════════════════════════
function QRModal({ table, venue, onClose }) {
  const [qrUrl, setQrUrl] = useState(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!table || !venue) return;
    generateQR();
  }, [table, venue]);

  const generateQR = async () => {
    setLoading(true);
    setQrUrl(null);
    try {
      // Cloud Function ile güvenli imzalı token üret
      const createToken = httpsCallable(functions, 'createTableToken');
      const result = await createToken({ venueId: venue.id, tableId: table.id });
      const { token } = result.data;

      const baseUrl = window.location.origin;
      const url = `${baseUrl}/m/${venue.slug}?t=${table.id}&k=${token}`;
      setQrUrl(url);

      // Canvas'a QR çiz
      setTimeout(() => drawQRToCanvas(url), 100);
    } catch (e) {
      console.error(e);
      toast.error('QR üretilemedi: ' + (e.message || e));
    } finally {
      setLoading(false);
    }
  };

  const drawQRToCanvas = async (url) => {
    if (!canvasRef.current) return;
    try {
      const QRCode = (await import('qrcode')).default;
      await QRCode.toCanvas(canvasRef.current, url, {
        width: 320,
        margin: 2,
        errorCorrectionLevel: 'M',
        color: { dark: '#0f172a', light: '#ffffff' }
      });
    } catch (e) {
      console.error('QR draw:', e);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(qrUrl);
    setCopied(true);
    toast.success('Link kopyalandı');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    if (!canvasRef.current) return;
    const dataUrl = canvasRef.current.toDataURL('image/png');
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = `qr-${venue.slug}-${table.name.replace(/\s+/g, '-')}.png`;
    link.click();
    toast.success('QR indirildi');
  };

  if (!table) return null;

  return (
    <Modal open={!!table} onClose={onClose} title={`${table.name} · QR Kod`} size="md">
      <div className="text-center">
        {loading ? (
          <div className="py-12 text-sm text-slate-500">QR üretiliyor...</div>
        ) : qrUrl ? (
          <>
            <div className="inline-block p-4 bg-white border-2 border-slate-200 rounded-2xl mb-4">
              <canvas ref={canvasRef} />
            </div>
            <p className="font-display text-lg font-bold text-slate-900">{table.name}</p>
            <p className="text-xs text-slate-500 mt-1">{venue?.branding?.name}</p>

            <div className="mt-4 flex items-center gap-2 justify-center">
              <button
                onClick={handleCopy}
                className="px-4 py-2 rounded-xl text-sm font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center gap-2"
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                Link Kopyala
              </button>
              <button
                onClick={handleDownload}
                className="px-4 py-2 rounded-xl text-sm font-semibold bg-slate-900 hover:bg-slate-800 text-white flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                PNG İndir
              </button>
            </div>

            <div className="mt-4 text-xs text-slate-400 break-all bg-slate-50 p-3 rounded-xl font-mono">
              {qrUrl}
            </div>
          </>
        ) : (
          <div className="py-12 text-sm text-red-600">QR üretilemedi</div>
        )}
      </div>
    </Modal>
  );
}

// ═══════════════════════════════════════════════════
// Toplu QR Yazdırma Modal
// ═══════════════════════════════════════════════════
function PrintQRModal({ open, onClose, tables, venue }) {
  const [generating, setGenerating] = useState(false);
  const [qrs, setQrs] = useState([]); // { tableId, name, url, dataUrl }
  const printRef = useRef(null);

  useEffect(() => {
    if (!open || tables.length === 0) return;
    generateAll();
  }, [open]);

  const generateAll = async () => {
    setGenerating(true);
    setQrs([]);
    try {
      const createToken = httpsCallable(functions, 'createTableToken');
      const QRCode = (await import('qrcode')).default;
      const baseUrl = window.location.origin;

      const results = [];
      for (const table of tables) {
        try {
          const result = await createToken({ venueId: venue.id, tableId: table.id });
          const { token } = result.data;
          const url = `${baseUrl}/m/${venue.slug}?t=${table.id}&k=${token}`;

          const dataUrl = await QRCode.toDataURL(url, {
            width: 400,
            margin: 1,
            errorCorrectionLevel: 'M',
            color: { dark: '#0f172a', light: '#ffffff' }
          });

          results.push({
            tableId: table.id,
            name: table.name,
            zone: table.zone,
            url,
            dataUrl
          });
        } catch (e) {
          console.error(`[QR ${table.name}]:`, e);
        }
      }
      setQrs(results);
    } catch (e) {
      toast.error('QR üretilemedi');
    } finally {
      setGenerating(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`${tables.length} QR Kod Yazdır`}
      size="xl"
      footer={
        <>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-100"
          >
            Kapat
          </button>
          <Button
            onClick={handlePrint}
            icon={Printer}
            disabled={generating || qrs.length === 0}
            className="bg-gradient-to-r from-orange-500 to-red-600"
          >
            Yazdır (A4)
          </Button>
        </>
      }
    >
      {generating ? (
        <div className="py-12 text-center text-sm text-slate-500">
          QR kodları üretiliyor... ({qrs.length}/{tables.length})
        </div>
      ) : (
        <>
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-800">
            <strong>Yazdır'a bas:</strong> Tarayıcı yazdırma penceresi açılır. A4 kağıda sayfa başına 9 QR sığar.
            Kes, laminat yap, masalara koy.
          </div>

          {/* Yazdırma alanı — ekranda küçük önizleme, yazdırma'da A4 */}
          <div ref={printRef} className="print-area">
            <div className="grid grid-cols-3 gap-3">
              {qrs.map((qr) => (
                <div
                  key={qr.tableId}
                  className="qr-card border-2 border-dashed border-slate-300 rounded-xl p-3 text-center bg-white"
                >
                  <div className="text-xs text-slate-500 uppercase tracking-wider font-bold mb-1">
                    {venue?.branding?.name}
                  </div>
                  <div className="font-display font-bold text-lg text-slate-900">
                    {qr.name}
                  </div>
                  {qr.zone && <div className="text-xs text-slate-500">{qr.zone}</div>}
                  <img src={qr.dataUrl} alt={qr.name} className="w-full mt-2 rounded-lg" />
                  <div className="text-[10px] text-slate-400 mt-1">QR ile menüyü aç</div>
                </div>
              ))}
            </div>
          </div>

          <style>{`
            @media print {
              body * { visibility: hidden; }
              .print-area, .print-area * { visibility: visible; }
              .print-area {
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                padding: 1cm;
              }
              .print-area .grid {
                grid-template-columns: repeat(3, 1fr) !important;
                gap: 0.5cm !important;
              }
              .qr-card {
                page-break-inside: avoid;
                border: 1px dashed #94a3b8 !important;
              }
            }
          `}</style>
        </>
      )}
    </Modal>
  );
}
