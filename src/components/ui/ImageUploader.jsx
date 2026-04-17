import { useState, useRef } from 'react';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { Upload, X, Loader2, Image as ImageIcon } from 'lucide-react';
import { storage } from '../../lib/firebase';
import { shortId } from '../../lib/utils';
import { cn } from '../../lib/utils';
import toast from 'react-hot-toast';

/**
 * ImageUploader — Firebase Storage'a resim yükler
 * Props:
 *   path: storage path prefix (örn: "venues/abc/menu/xyz/")
 *   value: mevcut URL (varsa)
 *   onChange: (url, storagePath) => void
 *   maxSizeMB: max dosya boyutu
 *   aspect: "square" | "wide" (önizleme)
 */
export function ImageUploader({
  path,
  value,
  onChange,
  maxSizeMB = 3,
  aspect = 'square',
  label = 'Resim'
}) {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState(value || null);
  const inputRef = useRef(null);

  const handleFile = async (file) => {
    if (!file) return;

    // Validasyon
    if (!file.type.startsWith('image/')) {
      toast.error('Sadece resim dosyası yükleyin');
      return;
    }
    if (file.size > maxSizeMB * 1024 * 1024) {
      toast.error(`Dosya ${maxSizeMB} MB'dan büyük olamaz`);
      return;
    }

    setUploading(true);
    const loadingToast = toast.loading('Yükleniyor...');

    try {
      // Uniqueness için isim değiştir
      const ext = file.name.split('.').pop() || 'jpg';
      const fileName = `${shortId(8)}.${ext}`;
      const fullPath = path.endsWith('/') ? `${path}${fileName}` : `${path}/${fileName}`;

      const storageRef = ref(storage, fullPath);
      await uploadBytes(storageRef, file, {
        contentType: file.type,
        cacheControl: 'public,max-age=31536000'
      });
      const url = await getDownloadURL(storageRef);

      setPreview(url);
      onChange?.(url, fullPath);
      toast.success('Yüklendi', { id: loadingToast });
    } catch (e) {
      console.error('[Upload]', e);
      toast.error('Yüklenemedi: ' + e.message, { id: loadingToast });
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const handleClear = () => {
    setPreview(null);
    onChange?.(null, null);
  };

  const aspectClass = aspect === 'wide' ? 'aspect-video' : 'aspect-square';

  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-semibold text-slate-700 mb-1.5">{label}</label>
      )}

      {preview ? (
        <div className={cn('relative rounded-xl overflow-hidden border border-slate-200 bg-slate-50 group', aspectClass)}>
          <img src={preview} alt="" className="w-full h-full object-cover" />
          <button
            type="button"
            onClick={handleClear}
            className="absolute top-2 right-2 w-8 h-8 rounded-full bg-white/90 hover:bg-white flex items-center justify-center shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <X className="w-4 h-4 text-slate-700" />
          </button>
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="absolute bottom-2 right-2 px-3 py-1.5 rounded-lg bg-white/90 hover:bg-white text-xs font-semibold text-slate-700 shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"
          >
            Değiştir
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className={cn(
            'w-full border-2 border-dashed border-slate-200 rounded-xl hover:border-orange-300 hover:bg-orange-50/30 transition-all flex flex-col items-center justify-center gap-2 text-slate-400 hover:text-orange-600 p-6',
            aspectClass
          )}
        >
          {uploading ? (
            <>
              <Loader2 className="w-6 h-6 animate-spin" />
              <span className="text-xs font-medium">Yükleniyor...</span>
            </>
          ) : (
            <>
              <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center">
                <ImageIcon className="w-5 h-5" />
              </div>
              <div className="text-center">
                <div className="text-sm font-semibold">Resim seç</div>
                <div className="text-xs text-slate-400 mt-0.5">veya sürükle-bırak · max {maxSizeMB} MB</div>
              </div>
            </>
          )}
        </button>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0])}
      />
    </div>
  );
}
