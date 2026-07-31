import { useState, useEffect } from 'react';
import { X, Save } from 'lucide-react';
import { useStore } from '../lib/useStore';
import MultiImageUploader from './MultiImageUploader';

export default function ProductModal({ open, product, onClose, onSaved }) {
  const { toast } = useStore();
  const [name,     setName]     = useState('');
  const [price,    setPrice]    = useState('');
  const [category, setCategory] = useState('');
  const [desc,     setDesc]     = useState('');
  const [images,   setImages]   = useState([]);
  const [saving,   setSaving]   = useState(false);

  useEffect(() => {
    if (open) {
      setName(product?.name ?? '');
      setPrice(product?.price ?? '');
      setCategory(product?.category ?? '');
      setDesc(product?.desc ?? '');
      // Normalise images — support old img:string + new images:[]
      const imgs = product?.images?.length
        ? product.images
        : product?.img ? [product.img] : [];
      setImages(imgs);
    }
  }, [open, product]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim() || !price) { toast('Nama dan harga wajib diisi', 'error'); return; }

    setSaving(true);
    try {
      const payload = {
        name:     name.trim(),
        price:    parseInt(price),
        category: category.trim(),
        desc:     desc.trim(),
        images,
      };
      const url    = product?.id ? `/api/products/${product.id}` : '/api/products';
      const method = product?.id ? 'PUT' : 'POST';
      const r = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const d = await r.json();
      if (d.success) {
        toast(`Produk berhasil ${product?.id ? 'diupdate' : 'ditambahkan'}`, 'success');
        onSaved?.();
        onClose();
      } else {
        toast(d.error ?? 'Gagal menyimpan', 'error');
      }
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <div className={`modal-backdrop${open ? ' open' : ''}`} onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-box" style={{ maxWidth: 580 }}>
        <div className="modal-header">
          <h3>{product?.id ? 'Edit Produk' : 'Tambah Produk'}</h3>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={16} /></button>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 1rem' }}>
            <div className="form-group" style={{ gridColumn: '1/-1' }}>
              <label>Nama Produk *</label>
              <input value={name} onChange={e => setName(e.target.value)} placeholder="Nama produk" required />
            </div>
            <div className="form-group">
              <label>Harga (Rp) *</label>
              <input type="number" min="0" value={price} onChange={e => setPrice(e.target.value)} placeholder="0" required />
            </div>
            <div className="form-group">
              <label>Kategori</label>
              <input value={category} onChange={e => setCategory(e.target.value)} placeholder="Contoh: Website, Desain" />
            </div>
            <div className="form-group" style={{ gridColumn: '1/-1' }}>
              <label>Deskripsi</label>
              <textarea value={desc} onChange={e => setDesc(e.target.value)} rows={3} placeholder="Deskripsi singkat produk..." style={{ resize: 'vertical' }} />
            </div>
          </div>

          <div className="form-group">
            <label>Foto Produk (hingga 6 gambar)</label>
            <MultiImageUploader images={images} onChange={setImages} max={6} />
          </div>

          <div style={{ display: 'flex', gap: '.5rem', justifyContent: 'flex-end', marginTop: '.5rem' }}>
            <button type="button" className="btn btn-ghost" onClick={onClose}>Batal</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? <span className="spinner" style={{ width: 14, height: 14 }} /> : <Save size={14} />}
              {saving ? 'Menyimpan...' : 'Simpan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
