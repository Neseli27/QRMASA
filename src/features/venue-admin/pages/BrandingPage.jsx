import { useState, useEffect } from 'react';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { Palette, Sparkles, Save, RotateCcw } from 'lucide-react';
import toast from 'react-hot-toast';
import { db } from '../../../lib/firebase';
import { collections, storagePaths } from '../../../lib/paths';
import { useAuth } from '../../../contexts/AuthContext';
import { useVenue } from '../../../contexts/VenueContext';
import { Card } from '../../../components/ui/Card';
import { Input, Textarea } from '../../../components/ui/Input';
import { Button } from '../../../components/ui/Button';
import { ImageUploader } from '../../../components/ui/ImageUploader';
import { LoadingScreen } from '../../../components/ui/StateScreens';

const PRESET_COLORS = [
  { name: 'Turuncu', primary: '#f97316', soft: '#fff7ed', accent: '#eab308' },
  { name: 'Kırmızı', primary: '#dc2626', soft: '#fef2f2', accent: '#f59e0b' },
  { name: 'Yeşil', primary: '#16a34a', soft: '#f0fdf4', accent: '#65a30d' },
  { name: 'Mavi', primary: '#2563eb', soft: '#eff6ff', accent: '#0ea5e9' },
  { name: 'Mor', primary: '#9333ea', soft: '#faf5ff', accent: '#ec4899' },
  { name: 'Lacivert', primary: '#0f172a', soft: '#f1f5f9', accent: '#f59e0b' },
  { name: 'Kahverengi', primary: '#78350f', soft: '#fef3c7', accent: '#ca8a04' },
  { name: 'Pembe', primary: '#ec4899', soft: '#fdf2f8', accent: '#f97316' }
];

export default function BrandingPage() {
  const { venueId } = useAuth();
  const { venue, loading } = useVenue();

  const [form, setForm] = useState({
    name: '',
    welcomeText: '',
    description: '',
    logo: null,
    favicon: null,
    pwaIcon192: null,
    pwaIcon512: null,
    primaryColor: '#f97316',
    softColor: '#fff7ed',
    accentColor: '#eab308'
  });
  const [saving, setSaving] = useState(false);

  // Venue yüklenince form'u doldur
  useEffect(() => {
    if (!venue) return;
    const b = venue.branding || {};
    setForm({
      name: b.name || '',
      welcomeText: b.welcomeText || '',
      description: b.description || '',
      logo: b.logo || null,
      favicon: b.favicon || null,
      pwaIcon192: b.pwaIcon192 || null,
      pwaIcon512: b.pwaIcon512 || null,
      primaryColor: b.primaryColor || '#f97316',
      softColor: b.softColor || '#fff7ed',
      accentColor: b.accentColor || '#eab308'
    });
  }, [venue]);

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast.error('Mekan adı gerekli');
      return;
    }
    setSaving(true);
    try {
      await setDoc(
        doc(db, collections.venues, venueId),
        {
          branding: {
            name: form.name.trim(),
            welcomeText: form.welcomeText.trim() || null,
            description: form.description.trim() || null,
            logo: form.logo || null,
            favicon: form.favicon || null,
            pwaIcon192: form.pwaIcon192 || null,
            pwaIcon512: form.pwaIcon512 || null,
            primaryColor: form.primaryColor,
            softColor: form.softColor,
            accentColor: form.accentColor
          },
          updatedAt: serverTimestamp()
        },
        { merge: true }
      );
      toast.success('Marka ayarları kaydedildi');
    } catch (e) {
      console.error(e);
      toast.error('Kaydedilemedi: ' + e.message);
    } finally {
      setSaving(false);
    }
  };

  const applyPreset = (preset) => {
    setForm({
      ...form,
      primaryColor: preset.primary,
      softColor: preset.soft,
      accentColor: preset.accent
    });
    toast.success(`${preset.name} tema uygulandı (kaydet'e basmayı unutma)`);
  };

  if (loading) return <LoadingScreen message="Mekan yükleniyor..." />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold text-slate-900">Marka</h1>
        <p className="text-sm text-slate-500 mt-1">Müşterilerin gördüğü her şeyin görünümü</p>
      </div>

      <div className="grid lg:grid-cols-[1fr_360px] gap-6">
        {/* SOL: Form */}
        <div className="space-y-6">
          {/* Temel bilgi */}
          <Card>
            <h3 className="font-display text-lg font-bold text-slate-900 mb-4">Temel Bilgi</h3>
            <div className="space-y-4">
              <Input
                label="Mekan Adı *"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Örn: Antep Kebap Evi"
              />
              <Input
                label="Kısa Tanıtım"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Gaziantep'in en güzel kebabı"
                hint="Menü sayfasının tepesinde müşteriye gösterilir"
              />
              <Textarea
                label="Karşılama Metni"
                value={form.welcomeText}
                onChange={(e) => setForm({ ...form, welcomeText: e.target.value })}
                placeholder="Hoş geldiniz! Menümüzü inceleyebilir ve kolayca sipariş verebilirsiniz."
                rows={3}
              />
            </div>
          </Card>

          {/* Görseller */}
          <Card>
            <h3 className="font-display text-lg font-bold text-slate-900 mb-1">Görseller</h3>
            <p className="text-sm text-slate-500 mb-4">Logo ve ikonlar tercihen kare, şeffaf PNG olmalı</p>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <ImageUploader
                label="Logo"
                value={form.logo}
                path={storagePaths.venueLogo(venueId)}
                onChange={(url) => setForm({ ...form, logo: url })}
                maxSizeMB={2}
              />
              <ImageUploader
                label="Favicon (32×32)"
                value={form.favicon}
                path={`${storagePaths.venueBranding(venueId)}/favicon`}
                onChange={(url) => setForm({ ...form, favicon: url })}
                maxSizeMB={1}
              />
              <ImageUploader
                label="PWA 192×192"
                value={form.pwaIcon192}
                path={`${storagePaths.venueBranding(venueId)}/pwa192`}
                onChange={(url) => setForm({ ...form, pwaIcon192: url })}
                maxSizeMB={1}
              />
              <ImageUploader
                label="PWA 512×512"
                value={form.pwaIcon512}
                path={`${storagePaths.venueBranding(venueId)}/pwa512`}
                onChange={(url) => setForm({ ...form, pwaIcon512: url })}
                maxSizeMB={2}
              />
            </div>

            <p className="text-xs text-slate-500 mt-3">
              💡 <strong>İpucu:</strong> PWA ikonları, müşteri telefonuna uygulamayı ekleyince ana ekranda görünen simgedir.
              Markana uygun, tanınır ve temiz bir ikon kullan.
            </p>
          </Card>

          {/* Renkler */}
          <Card>
            <h3 className="font-display text-lg font-bold text-slate-900 mb-1 flex items-center gap-2">
              <Palette className="w-5 h-5 text-orange-500" /> Renkler
            </h3>
            <p className="text-sm text-slate-500 mb-4">Müşteri panelinin ana renk paleti</p>

            {/* Preset'ler */}
            <div className="mb-5">
              <div className="text-xs font-semibold text-slate-700 mb-2">Hazır Temalar</div>
              <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
                {PRESET_COLORS.map((p) => (
                  <button
                    key={p.name}
                    onClick={() => applyPreset(p)}
                    className="group flex flex-col items-center gap-1.5 p-2 rounded-xl hover:bg-slate-50 transition-colors"
                    title={p.name}
                  >
                    <div
                      className="w-10 h-10 rounded-full border-2 border-white shadow-md group-hover:scale-110 transition-transform"
                      style={{ backgroundColor: p.primary }}
                    />
                    <span className="text-[10px] text-slate-600">{p.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Özel renkler */}
            <div className="grid sm:grid-cols-3 gap-4">
              <ColorPicker
                label="Ana Renk"
                value={form.primaryColor}
                onChange={(v) => setForm({ ...form, primaryColor: v })}
              />
              <ColorPicker
                label="Yumuşak Renk"
                value={form.softColor}
                onChange={(v) => setForm({ ...form, softColor: v })}
                hint="Arka plan tonları"
              />
              <ColorPicker
                label="Vurgu Rengi"
                value={form.accentColor}
                onChange={(v) => setForm({ ...form, accentColor: v })}
                hint="Fiyat, rozet vb."
              />
            </div>
          </Card>

          {/* Kaydet */}
          <div className="flex items-center justify-end gap-2 sticky bottom-4 bg-white rounded-xl border border-slate-200 p-3 shadow-lg">
            <Button
              onClick={handleSave}
              loading={saving}
              icon={Save}
              size="lg"
              className="bg-gradient-to-r from-orange-500 to-red-600"
            >
              Kaydet
            </Button>
          </div>
        </div>

        {/* SAĞ: Canlı Önizleme */}
        <div>
          <div className="sticky top-4">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="w-4 h-4 text-orange-500" />
              <h3 className="font-semibold text-sm text-slate-700">Canlı Önizleme</h3>
            </div>
            <PhonePreview form={form} />
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════
// Color Picker
// ═══════════════════════════════════════════════════
function ColorPicker({ label, value, onChange, hint }) {
  return (
    <div>
      <label className="block text-sm font-semibold text-slate-700 mb-1.5">{label}</label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-12 h-12 rounded-xl border border-slate-200 cursor-pointer flex-shrink-0"
        />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 px-3 py-2 rounded-xl border border-slate-200 text-sm font-mono uppercase focus:outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
        />
      </div>
      {hint && <p className="text-xs text-slate-500 mt-1">{hint}</p>}
    </div>
  );
}

// ═══════════════════════════════════════════════════
// Telefon Önizleme
// ═══════════════════════════════════════════════════
function PhonePreview({ form }) {
  return (
    <div className="relative mx-auto w-full max-w-[280px]">
      {/* Telefon çerçevesi */}
      <div className="relative bg-slate-900 rounded-[2.5rem] p-2 shadow-2xl">
        {/* Ekran */}
        <div
          className="rounded-[2rem] overflow-hidden aspect-[9/19]"
          style={{ backgroundColor: form.softColor }}
        >
          {/* Üst bar */}
          <div className="h-6 bg-slate-900 flex items-center justify-center">
            <div className="w-16 h-1.5 rounded-full bg-slate-700" />
          </div>

          {/* İçerik */}
          <div className="p-3 space-y-3">
            {/* Logo/Ad */}
            <div className="text-center pt-2">
              {form.logo ? (
                <img src={form.logo} alt="" className="w-12 h-12 rounded-xl object-cover mx-auto mb-2" />
              ) : (
                <div
                  className="w-12 h-12 rounded-xl mx-auto mb-2 flex items-center justify-center text-white font-bold text-lg"
                  style={{ backgroundColor: form.primaryColor }}
                >
                  {(form.name || '?')[0]}
                </div>
              )}
              <div className="font-bold text-sm text-slate-900 truncate">{form.name || 'Mekan Adı'}</div>
              {form.description && (
                <div className="text-[10px] text-slate-500 mt-0.5">{form.description}</div>
              )}
            </div>

            {/* Karşılama */}
            {form.welcomeText && (
              <div
                className="rounded-xl p-2 text-[9px] leading-tight text-slate-700"
                style={{ backgroundColor: form.primaryColor + '15' }}
              >
                {form.welcomeText}
              </div>
            )}

            {/* Sahte ürün kartı */}
            <div className="bg-white rounded-xl p-2 flex gap-2">
              <div className="w-10 h-10 rounded-lg bg-slate-200 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-[10px] font-semibold text-slate-900">Ali Nazik</div>
                <div className="text-[8px] text-slate-500">Antep usulü</div>
                <div
                  className="text-[10px] font-bold mt-0.5"
                  style={{ color: form.primaryColor }}
                >180₺</div>
              </div>
            </div>

            <div className="bg-white rounded-xl p-2 flex gap-2">
              <div className="w-10 h-10 rounded-lg bg-slate-200 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-[10px] font-semibold text-slate-900">Kuşbaşı</div>
                <div className="text-[8px] text-slate-500">Pilav, salata</div>
                <div
                  className="text-[10px] font-bold mt-0.5"
                  style={{ color: form.primaryColor }}
                >220₺</div>
              </div>
            </div>

            {/* Sahte aksiyon butonu */}
            <div
              className="rounded-xl py-2 text-center text-white text-[10px] font-bold"
              style={{ backgroundColor: form.primaryColor }}
            >
              Sepete Ekle
            </div>
          </div>
        </div>
      </div>

      <p className="text-xs text-slate-500 text-center mt-3">
        Müşteri menüsü bu şekilde görünür
      </p>
    </div>
  );
}
