import { useState, useRef } from 'react';
import { Upload, X, Link, Image as ImageIcon, Star } from 'lucide-react';
import { useStore } from '../lib/useStore';

/**
 * MultiImageUploader
 * Props:
 *   images: string[]          — current image URLs
 *   onChange: (urls) => void  — called when images change
 *   max: number               — max images (default 6)
 */
export default function MultiImageUploader({ images = [], onChange, max = 6 }) {
  const { toast } = useStore();
  const [tab,      setTab]      = useState('upload'); // 'upload' | 'url'
  const [urlInput, setUrlInput] = useState('');
  const [loading,  setLoading]  = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef();

  const uploadFiles = async (files) => {
    if (!files.length) return;
    if (images.length + files.length > max) {
      toast(`Maksimal ${max} gambar`, 'warning'); return;
    }
    setLoading(true);
    try {
      const fd = new FormData();
      Array.from(files).forEach(f => fd.append('files', f));
      const r = await fetch('/api/upload', { method: 'POST', body: fd });
      const d = await r.json();
      if (d.success) {
        onChange([...images, ...d.urls]);
        toast(`${d.urls.length} gambar diupload`, 'success');
      } else {
        toast(d.error ?? 'Upload gagal', 'error');
      }
    } catch {
      toast('Upload gagal', 'error');
    } finally {
      setLoading(false);
    }
  };

  const addUrl = () => {
    const url = urlInput.trim();
    if (!url) return;
    if (images.length >= max) { toast(`Maksimal ${max} gambar`, 'warning'); return; }
    if (images.includes(url)) { toast('URL sudah ditambahkan', 'warning'); return; }
    onChange([...images, url]);
    setUrlInput('');
  };

  const remove = (idx) => onChange(images.filter((_, i) => i !== idx));
  const setMain = (idx) => {
    const arr = [...images];
    const [item] = arr.splice(idx, 1);
    onChange([item, ...arr]);
  };

  return (
    <div>
      {/* Tabs */}
      <div style={{ display: 'flex', gap: '.375rem', marginBottom: '.75rem' }}>
        {['upload', 'url'].map(t => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`pill${tab === t ? ' active' : ''}`}
            style={{ fontSize: '.8rem' }}
          >
            {t === 'upload' ? <><Upload size={12} /> Upload ke Supabase</> : <><Link size={12} /> Link URL</>}
          </button>
        ))}
        <span style={{ marginLeft: 'auto', fontSize: '.75rem', color: 'var(--muted)', alignSelf: 'center' }}>
          {images.length}/{max}
        </span>
      </div>

      {/* Upload zone */}
      {tab === 'upload' && (
        <div
          className={`upload-zone${dragOver ? ' drag-over' : ''}`}
          onClick={() => fileRef.current?.click()}
          onDragOver={e => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={e => { e.preventDefault(); setDragOver(false); uploadFiles(e.dataTransfer.files); }}
        >
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            multiple
            style={{ display: 'none' }}
            onChange={e => { uploadFiles(e.target.files); e.target.value = ''; }}
          />
          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '.5rem' }}>
              <span className="spinner" />
              <span style={{ fontSize: '.8rem' }}>Mengupload...</span>
            </div>
          ) : (
            <>
              <ImageIcon size={28} style={{ margin: '0 auto .5rem', display: 'block', opacity: .4 }} />
              <p style={{ margin: '0 0 .25rem', fontSize: '.875rem', fontWeight: 600 }}>
                Klik atau drag gambar ke sini
              </p>
              <p style={{ margin: 0, fontSize: '.75rem' }}>
                PNG, JPG, WEBP — maks 5MB/file, sampai {max} gambar
              </p>
            </>
          )}
        </div>
      )}

      {/* URL input */}
      {tab === 'url' && (
        <div style={{ display: 'flex', gap: '.5rem' }}>
          <input
            value={urlInput}
            onChange={e => setUrlInput(e.target.value)}
            placeholder="https://link-gambar.com/foto.jpg"
            onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addUrl())}
            style={{ margin: 0 }}
          />
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={addUrl}
            style={{ flexShrink: 0 }}
          >
            Tambah
          </button>
        </div>
      )}

      {/* Preview thumbnails */}
      {images.length > 0 && (
        <div className="img-gallery-grid" style={{ marginTop: '.75rem' }}>
          {images.map((url, i) => (
            <div key={url + i} className={`img-thumb${i === 0 ? ' primary-thumb' : ''}`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt="" />
              <button
                type="button"
                className="img-thumb-remove"
                onClick={e => { e.stopPropagation(); remove(i); }}
                title="Hapus"
              >
                <X size={10} />
              </button>
              {i !== 0 && (
                <button
                  type="button"
                  title="Jadikan foto utama"
                  onClick={e => { e.stopPropagation(); setMain(i); }}
                  style={{
                    position: 'absolute', bottom: 3, right: 3,
                    width: 18, height: 18, background: 'rgba(0,0,0,.6)', border: 'none',
                    borderRadius: 4, color: 'var(--warning)', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    opacity: 0, transition: 'opacity .15s',
                  }}
                  className="set-main-btn"
                >
                  <Star size={10} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
      {images.length > 0 && (
        <p style={{ fontSize: '.72rem', color: 'var(--muted)', marginTop: '.375rem' }}>
          Foto pertama = foto utama. Klik ★ untuk ganti urutan.
        </p>
      )}

      <style jsx>{`
        .img-thumb:hover .set-main-btn { opacity: 1 !important; }
      `}</style>
    </div>
  );
}
