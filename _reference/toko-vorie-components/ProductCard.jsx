import { useState } from 'react';
import { ShoppingCart, Package } from 'lucide-react';
import { money, imagesArray } from '../lib/utils';

export default function ProductCard({ product, onAdd }) {
  const images    = imagesArray(product.images ?? product.img);
  const [imgIdx, setImgIdx] = useState(0);
  const [qty, setQty]       = useState(1);
  const [adding, setAdding] = useState(false);

  const handleAdd = () => {
    setAdding(true);
    onAdd(product, qty);
    setTimeout(() => setAdding(false), 600);
  };

  return (
    <div className="card product-card">
      {/* Image area */}
      <div style={{ position: 'relative', marginBottom: '.875rem', borderRadius: 'var(--radius)', overflow: 'hidden', background: 'var(--bg2)' }}>
        {images.length > 0 ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={images[imgIdx]}
              alt={product.name}
              loading="lazy"
              style={{ width: '100%', aspectRatio: '4/3', objectFit: 'cover', display: 'block', transition: 'transform .25s' }}
              onError={e => { e.target.style.display = 'none'; }}
            />
            {/* Multiple images thumbnails */}
            {images.length > 1 && (
              <div style={{
                position: 'absolute', bottom: 0, left: 0, right: 0,
                display: 'flex', gap: 3, padding: '4px 4px 4px',
                background: 'linear-gradient(transparent, rgba(0,0,0,.5))',
              }}>
                {images.map((url, i) => (
                  <button
                    key={i}
                    onClick={() => setImgIdx(i)}
                    style={{
                      width: 36, height: 28, border: i === imgIdx ? '2px solid var(--primary)' : '1.5px solid rgba(255,255,255,.4)',
                      borderRadius: 4, overflow: 'hidden', cursor: 'pointer', padding: 0, flexShrink: 0, background: 'none',
                    }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </button>
                ))}
              </div>
            )}
          </>
        ) : (
          <div style={{
            width: '100%', aspectRatio: '4/3',
            display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: .25,
          }}>
            <Package size={48} />
          </div>
        )}

        {product.category && (
          <div style={{
            position: 'absolute', top: 8, left: 8,
            background: 'var(--success)', color: 'white',
            padding: '.18rem .55rem', borderRadius: 20,
            fontSize: '.68rem', fontWeight: 700,
          }}>
            {product.category}
          </div>
        )}
      </div>

      {/* Info */}
      <h4 style={{ margin: '0 0 .25rem', fontSize: '1rem', fontWeight: 700 }}>
        {product.name}
      </h4>
      {product.desc && (
        <p style={{
          margin: '0 0 .625rem', fontSize: '.83rem', color: 'var(--muted)',
          display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
        }}>
          {product.desc}
        </p>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '.75rem', gap: '.5rem' }}>
        <div style={{ color: 'var(--primary-dark)', fontSize: '1.1rem', fontWeight: 800 }}>
          Rp {money(product.price)}
        </div>
        <div style={{ display: 'flex', gap: '.375rem', alignItems: 'center' }}>
          <input
            type="number"
            min="1"
            value={qty}
            onChange={e => setQty(Math.max(1, parseInt(e.target.value) || 1))}
            style={{ width: 52, textAlign: 'center', padding: '.3rem .4rem', fontSize: '.85rem' }}
          />
          <button
            className="btn btn-primary btn-sm"
            onClick={handleAdd}
            style={{ gap: '.3rem', padding: '.4rem .75rem' }}
            disabled={adding}
          >
            <ShoppingCart size={13} />
            Tambah
          </button>
        </div>
      </div>

      <style jsx>{`
        .product-card:hover { transform: translateY(-3px); }
        .product-card:hover img { transform: scale(1.03); }
      `}</style>
    </div>
  );
}
