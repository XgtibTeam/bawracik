import Head from 'next/head';

export default function NotFound() {
  return (
    <>
      <Head><title>404 — Halaman Tidak Ditemukan</title></Head>
      <div style={{
        minHeight: '100vh', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        background: 'var(--bg)', color: 'var(--text)', padding: '2rem',
        textAlign: 'center',
      }}>
        <div style={{ fontSize: '5rem', fontWeight: 900, color: 'var(--primary)', lineHeight: 1, marginBottom: '1rem' }}>
          404
        </div>
        <h1 style={{ fontSize: '1.5rem', marginBottom: '.75rem' }}>Halaman Tidak Ditemukan</h1>
        <p style={{ color: 'var(--muted)', marginBottom: '1.5rem' }}>
          Halaman yang kamu cari tidak ada atau sudah dipindahkan.
        </p>
        <a href="/" style={{
          background: 'var(--primary)', color: 'white', padding: '.65rem 1.5rem',
          borderRadius: 'var(--radius)', fontWeight: 600, textDecoration: 'none',
        }}>
          ← Kembali ke Toko
        </a>
      </div>
    </>
  );
}
