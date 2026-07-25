'use client';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="id">
      <body style={{ fontFamily: 'ui-sans-serif, system-ui, sans-serif' }}>
        <main
          style={{
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px',
            textAlign: 'center',
          }}
        >
          <p style={{ fontSize: 40 }}>⚠️</p>
          <h1 style={{ fontSize: 18, fontWeight: 600, marginTop: 12 }}>Aplikasi mengalami error</h1>
          <p style={{ fontSize: 14, color: '#667085', marginTop: 6, maxWidth: 320 }}>
            Silakan muat ulang halaman ini.
          </p>
          <button
            onClick={() => reset()}
            style={{
              marginTop: 20,
              width: '100%',
              maxWidth: 280,
              borderRadius: 14,
              background: '#0F5B4C',
              color: 'white',
              fontWeight: 600,
              fontSize: 14,
              padding: '12px 16px',
              border: 'none',
            }}
          >
            Muat Ulang
          </button>
          <p style={{ marginTop: 16, fontSize: 11, color: '#98A2B3' }}>By Toko Vorie</p>
        </main>
      </body>
    </html>
  );
}
