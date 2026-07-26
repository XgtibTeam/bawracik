'use client';

import { useEffect, useState } from 'react';
import { Heart, MapPin, Plus, X, Trash2 } from 'lucide-react';
import CameraCapture from '@/components/CameraCapture';

type Session = { nama: string; username: string; role: string };
type Branch = { id: string; nama: string };
type FeedPost = {
  id: string;
  memberId: string;
  memberNama: string;
  photoDriveId: string;
  deskripsi: string;
  cabangId?: string;
  cabangNama?: string;
  lokasiAuto?: string;
  likes: string[];
  createdAt: string;
};

function driveUrl(fileId: string) {
  return `https://drive.google.com/uc?export=view&id=${fileId}`;
}

function waktuRelatif(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const menit = Math.floor(diffMs / 60000);
  if (menit < 1) return 'Baru saja';
  if (menit < 60) return `${menit} menit lalu`;
  const jam = Math.floor(menit / 60);
  if (jam < 24) return `${jam} jam lalu`;
  const hari = Math.floor(jam / 24);
  return `${hari} hari lalu`;
}

export default function MemberFeedPage() {
  const [session, setSession] = useState<Session | null>(null);
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);

  const [showComposer, setShowComposer] = useState(false);
  const [photo, setPhoto] = useState<string | null>(null);
  const [deskripsi, setDeskripsi] = useState('');
  const [locMode, setLocMode] = useState<'cabang' | 'gps'>('cabang');
  const [cabangId, setCabangId] = useState('');
  const [gps, setGps] = useState<{ lat: number; lng: number } | null>(null);
  const [gpsStatus, setGpsStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const [posting, setPosting] = useState(false);
  const [postError, setPostError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/auth/me')
      .then((r) => r.json())
      .then(async (d) => {
        if (!d.session || d.session.role !== 'member') {
          window.location.href = '/member/login';
          return;
        }
        setSession(d.session);
      });
    loadPosts();
    fetch('/api/branches')
      .then((r) => r.json())
      .then((d) => setBranches(Array.isArray(d.branches) ? d.branches : []))
      .catch(() => setBranches([]));
  }, []);

  function loadPosts() {
    setLoading(true);
    fetch('/api/feed')
      .then((r) => r.json())
      .then((d) => setPosts(Array.isArray(d.posts) ? d.posts : []))
      .catch(() => setPosts([]))
      .finally(() => setLoading(false));
  }

  function ambilLokasiOtomatis() {
    setGpsStatus('loading');
    if (!navigator.geolocation) {
      setGpsStatus('error');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGps({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setGpsStatus('idle');
      },
      () => setGpsStatus('error'),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  function resetComposer() {
    setPhoto(null);
    setDeskripsi('');
    setCabangId('');
    setGps(null);
    setLocMode('cabang');
    setPostError(null);
  }

  async function submitPost() {
    if (!photo) {
      setPostError('Ambil foto dulu ya.');
      return;
    }
    if (locMode === 'cabang' && !cabangId) {
      setPostError('Pilih cabang lokasi pengisian.');
      return;
    }
    if (locMode === 'gps' && !gps) {
      setPostError('Deteksi lokasi dulu, atau pilih dari daftar cabang.');
      return;
    }
    setPosting(true);
    setPostError(null);
    try {
      const res = await fetch('/api/feed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          photoBase64: photo,
          deskripsi,
          cabangId: locMode === 'cabang' ? cabangId : undefined,
          lat: locMode === 'gps' ? gps?.lat : undefined,
          lng: locMode === 'gps' ? gps?.lng : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal membuat postingan');
      resetComposer();
      setShowComposer(false);
      loadPosts();
    } catch (err: any) {
      setPostError(err.message);
    } finally {
      setPosting(false);
    }
  }

  async function toggleLike(postId: string) {
    if (!session) return;
    // Optimistic update
    setPosts((prev) =>
      prev.map((p) => {
        if (p.id !== postId) return p;
        const liked = p.likes.includes(session.username);
        return {
          ...p,
          likes: liked ? p.likes.filter((id) => id !== session.username) : [...p.likes, session.username],
        };
      })
    );
    try {
      await fetch('/api/feed/like', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postId }),
      });
    } catch {
      loadPosts();
    }
  }

  async function hapusPost(postId: string) {
    if (!confirm('Hapus postingan ini?')) return;
    await fetch('/api/feed', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: postId }),
    });
    loadPosts();
  }

  return (
    <main className="mx-auto min-h-screen max-w-md">
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-ink/10 bg-white/90 px-5 py-4 backdrop-blur">
        <div>
          <p className="text-xs uppercase tracking-widest text-accent">Member Area</p>
          <h1 className="font-display text-lg font-semibold text-ink">Beranda</h1>
        </div>
        <button
          onClick={() => setShowComposer(true)}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-accent text-white shadow-sm transition hover:opacity-90"
          aria-label="Buat postingan"
        >
          <Plus size={20} strokeWidth={2} />
        </button>
      </header>

      <div className="px-4 py-4">
        {loading && <p className="py-10 text-center text-sm text-ink/40">Memuat feed...</p>}
        {!loading && posts.length === 0 && (
          <div className="ticket mt-4 p-8 text-center">
            <p className="text-sm text-ink/50">Belum ada postingan. Jadilah yang pertama berbagi momen isi ulang parfummu!</p>
          </div>
        )}

        <div className="space-y-4">
          {posts.map((post) => {
            const liked = session ? post.likes.includes(session.username) : false;
            const lokasi = post.cabangNama || (post.lokasiAuto ? `Lokasi: ${post.lokasiAuto}` : null);
            const isOwner = session?.username === post.memberId;
            return (
              <article key={post.id} className="ticket overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-accentSoft font-display text-sm font-semibold text-accent">
                      {post.memberNama.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-ink">{post.memberNama}</p>
                      {lokasi && (
                        <p className="flex items-center gap-1 text-xs text-ink/40">
                          <MapPin size={11} /> {lokasi}
                        </p>
                      )}
                    </div>
                  </div>
                  {isOwner && (
                    <button onClick={() => hapusPost(post.id)} className="text-ink/30 hover:text-danger">
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>

                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={driveUrl(post.photoDriveId)}
                  alt="Postingan feed"
                  className="aspect-square w-full object-cover"
                  loading="lazy"
                />

                <div className="px-4 py-3">
                  <button
                    onClick={() => toggleLike(post.id)}
                    className="flex items-center gap-1.5"
                  >
                    <Heart
                      size={20}
                      strokeWidth={liked ? 0 : 1.6}
                      fill={liked ? '#B3261E' : 'none'}
                      className={liked ? 'text-danger' : 'text-ink/50'}
                    />
                    <span className="text-sm font-medium text-ink/70">{post.likes.length}</span>
                  </button>
                  {post.deskripsi && (
                    <p className="mt-2 text-sm text-ink/80">
                      <span className="font-semibold">{post.memberNama}</span> {post.deskripsi}
                    </p>
                  )}
                  <p className="mt-1.5 text-[11px] uppercase tracking-wide text-ink/30">
                    {waktuRelatif(post.createdAt)}
                  </p>
                </div>
              </article>
            );
          })}
        </div>
      </div>

      {showComposer && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 sm:items-center">
          <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-t-2xl bg-white p-5 sm:rounded-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-display text-lg font-semibold text-ink">Postingan Baru</h2>
              <button
                onClick={() => {
                  setShowComposer(false);
                  resetComposer();
                }}
                className="text-ink/40 hover:text-ink"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              <CameraCapture onCapture={setPhoto} />

              <div>
                <label className="mb-1 block text-sm font-medium text-ink">Ceritakan momennya</label>
                <textarea
                  value={deskripsi}
                  onChange={(e) => setDeskripsi(e.target.value)}
                  rows={3}
                  placeholder="Lagi isi ulang wangian favorit..."
                  className="w-full rounded-lg border border-ink/15 px-3 py-2.5 text-sm outline-none focus:border-accent"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-ink">Lokasi Pengisian</label>
                <div className="mb-2 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setLocMode('cabang')}
                    className={`rounded-lg border px-3 py-2 text-sm font-medium transition ${
                      locMode === 'cabang' ? 'border-accent bg-accentSoft text-accent' : 'border-ink/15 text-ink/60'
                    }`}
                  >
                    Pilih Cabang
                  </button>
                  <button
                    type="button"
                    onClick={() => setLocMode('gps')}
                    className={`rounded-lg border px-3 py-2 text-sm font-medium transition ${
                      locMode === 'gps' ? 'border-accent bg-accentSoft text-accent' : 'border-ink/15 text-ink/60'
                    }`}
                  >
                    Lokasi Otomatis
                  </button>
                </div>

                {locMode === 'cabang' ? (
                  <select
                    value={cabangId}
                    onChange={(e) => setCabangId(e.target.value)}
                    className="w-full rounded-lg border border-ink/15 bg-white px-3 py-2.5 text-sm outline-none focus:border-accent"
                  >
                    <option value="">Pilih cabang</option>
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.nama}
                      </option>
                    ))}
                  </select>
                ) : (
                  <button
                    type="button"
                    onClick={ambilLokasiOtomatis}
                    className="w-full rounded-lg border border-ink/15 px-3 py-2.5 text-left text-sm text-ink/70 hover:bg-paper"
                  >
                    {gpsStatus === 'loading'
                      ? 'Mendeteksi lokasi...'
                      : gps
                      ? `Lokasi: ${gps.lat.toFixed(5)}, ${gps.lng.toFixed(5)}`
                      : 'Ketuk untuk deteksi lokasi'}
                  </button>
                )}
                {gpsStatus === 'error' && (
                  <p className="mt-1 text-xs text-danger">Gagal mengambil lokasi. Pastikan izin lokasi diaktifkan.</p>
                )}
              </div>

              {postError && <p className="text-sm text-danger">{postError}</p>}

              <button
                onClick={submitPost}
                disabled={posting}
                className="w-full rounded-card bg-accent px-4 py-3 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
              >
                {posting ? 'Mengunggah...' : 'Bagikan'}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
