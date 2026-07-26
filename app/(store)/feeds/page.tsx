'use client';

import { useEffect, useState } from 'react';
import { Heart, MapPin, MessageCircle, Send, Trash2 } from 'lucide-react';
import { driveImageUrl } from '@/lib/drive-url';

type Session = { nama: string; username: string; role: string } | null;
type FeedPost = {
  id: string;
  memberId: string;
  memberNama: string;
  photoDriveId: string;
  deskripsi: string;
  cabangNama?: string;
  lokasiAuto?: string;
  likes: string[];
  createdAt: string;
};
type FeedComment = { id: string; postId: string; nama: string; komentar: string; createdAt: string };

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

function getAnonId(): string | null {
  const match = document.cookie.match(/(?:^|; )baw_anon_id=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

export default function FeedsPage() {
  const [session, setSession] = useState<Session>(null);
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [commentCounts, setCommentCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [anonId, setAnonId] = useState<string | null>(null);

  const [openComments, setOpenComments] = useState<string | null>(null);
  const [comments, setComments] = useState<FeedComment[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [komentarInput, setKomentarInput] = useState('');
  const [namaTamu, setNamaTamu] = useState('');

  const isAdmin = session?.role === 'superadmin' || session?.role === 'admin';
  const isMember = session?.role === 'member';

  useEffect(() => {
    fetch('/api/auth/me')
      .then((r) => r.json())
      .then((d) => setSession(d.session ?? null))
      .catch(() => setSession(null));
    setAnonId(getAnonId());
    loadPosts();
  }, []);

  function loadPosts() {
    setLoading(true);
    fetch('/api/feed')
      .then((r) => r.json())
      .then((d) => {
        setPosts(Array.isArray(d.posts) ? d.posts : []);
        setCommentCounts(d.commentCounts || {});
      })
      .catch(() => setPosts([]))
      .finally(() => setLoading(false));
  }

  function myLikeId(): string | null {
    if (isMember && session) return session.username;
    return anonId;
  }

  async function toggleLike(postId: string) {
    const myId = myLikeId();
    setPosts((prev) =>
      prev.map((p) => {
        if (p.id !== postId) return p;
        if (!myId) {
          // Belum punya ID (tamu pertama kali) — update optimis pakai penanda sementara
          return { ...p, likes: [...p.likes, '__pending__'] };
        }
        const liked = p.likes.includes(myId);
        return { ...p, likes: liked ? p.likes.filter((id) => id !== myId) : [...p.likes, myId] };
      })
    );
    try {
      await fetch('/api/feed/like', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postId }),
      });
      if (!anonId) setAnonId(getAnonId());
      loadPosts();
    } catch {
      loadPosts();
    }
  }

  function bukaKomentar(postId: string) {
    setOpenComments(postId);
    setLoadingComments(true);
    setKomentarInput('');
    fetch(`/api/feed/comments?postId=${postId}`)
      .then((r) => r.json())
      .then((d) => setComments(Array.isArray(d.comments) ? d.comments : []))
      .catch(() => setComments([]))
      .finally(() => setLoadingComments(false));
  }

  async function kirimKomentar() {
    if (!openComments || !komentarInput.trim()) return;
    if (!isMember && !namaTamu.trim()) return;
    try {
      const res = await fetch('/api/feed/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postId: openComments, komentar: komentarInput.trim(), nama: namaTamu.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setComments((c) => [...c, data.comment]);
      setKomentarInput('');
      setCommentCounts((c) => ({ ...c, [openComments]: (c[openComments] || 0) + 1 }));
    } catch {
      // diamkan saja, cukup tombol tidak menambah komentar
    }
  }

  async function hapusKomentar(id: string) {
    if (!confirm('Hapus komentar ini?')) return;
    await fetch('/api/feed/comments', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    setComments((c) => c.filter((x) => x.id !== id));
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
    <main className="mx-auto min-h-screen max-w-md pb-24">
      <header className="sticky top-0 z-30 border-b border-ink/10 bg-white/90 px-5 py-4 backdrop-blur">
        <p className="text-xs uppercase tracking-widest text-accent">Bawracik</p>
        <h1 className="font-display text-lg font-semibold text-ink">Feeds</h1>
      </header>

      <div className="px-4 py-4">
        {loading && <p className="py-10 text-center text-sm text-ink/40">Memuat feed...</p>}
        {!loading && posts.length === 0 && (
          <div className="ticket mt-4 p-8 text-center">
            <p className="text-sm text-ink/50">Belum ada postingan.</p>
          </div>
        )}

        <div className="space-y-4">
          {posts.map((post) => {
            const myId = myLikeId();
            const liked = myId ? post.likes.includes(myId) : false;
            const lokasi = post.cabangNama || (post.lokasiAuto ? `Lokasi: ${post.lokasiAuto}` : null);
            const isOwner = isMember && session?.username === post.memberId;
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
                  {(isOwner || isAdmin) && (
                    <button onClick={() => hapusPost(post.id)} className="text-ink/30 hover:text-danger">
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>

                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={driveImageUrl(post.photoDriveId)}
                  alt="Postingan feed"
                  className="aspect-square w-full object-cover"
                  loading="lazy"
                />

                <div className="px-4 py-3">
                  <div className="flex items-center gap-4">
                    <button onClick={() => toggleLike(post.id)} className="flex items-center gap-1.5">
                      <Heart
                        size={20}
                        strokeWidth={liked ? 0 : 1.6}
                        fill={liked ? '#B3261E' : 'none'}
                        className={liked ? 'text-danger' : 'text-ink/50'}
                      />
                      <span className="text-sm font-medium text-ink/70">{post.likes.length}</span>
                    </button>
                    <button onClick={() => bukaKomentar(post.id)} className="flex items-center gap-1.5">
                      <MessageCircle size={20} strokeWidth={1.6} className="text-ink/50" />
                      <span className="text-sm font-medium text-ink/70">{commentCounts[post.id] || 0}</span>
                    </button>
                  </div>
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

      {/* Panel komentar */}
      {openComments && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 sm:items-center" onClick={() => setOpenComments(null)}>
          <div
            className="max-h-[80vh] w-full max-w-md overflow-y-auto rounded-t-2xl bg-white p-5 sm:rounded-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="font-display text-lg font-semibold text-ink">Komentar</h2>
            <div className="mt-3 space-y-3">
              {loadingComments && <p className="text-sm text-ink/40">Memuat komentar...</p>}
              {!loadingComments && comments.length === 0 && (
                <p className="text-sm text-ink/40">Belum ada komentar. Jadilah yang pertama!</p>
              )}
              {comments.map((c) => (
                <div key={c.id} className="flex items-start justify-between gap-2 border-b border-ink/5 pb-2">
                  <div>
                    <p className="text-sm">
                      <span className="font-semibold text-ink">{c.nama}</span>{' '}
                      <span className="text-ink/70">{c.komentar}</span>
                    </p>
                    <p className="text-[11px] text-ink/30">{waktuRelatif(c.createdAt)}</p>
                  </div>
                  {isAdmin && (
                    <button onClick={() => hapusKomentar(c.id)} className="shrink-0 text-ink/30 hover:text-danger">
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              ))}
            </div>

            <div className="mt-4 space-y-2">
              {!isMember && (
                <input
                  value={namaTamu}
                  onChange={(e) => setNamaTamu(e.target.value)}
                  placeholder="Nama kamu"
                  className="w-full rounded-lg border border-ink/15 px-3 py-2 text-sm outline-none focus:border-accent"
                />
              )}
              <div className="flex gap-2">
                <input
                  value={komentarInput}
                  onChange={(e) => setKomentarInput(e.target.value)}
                  placeholder="Tulis komentar..."
                  className="flex-1 rounded-lg border border-ink/15 px-3 py-2 text-sm outline-none focus:border-accent"
                  onKeyDown={(e) => e.key === 'Enter' && kirimKomentar()}
                />
                <button
                  onClick={kirimKomentar}
                  disabled={!komentarInput.trim() || (!isMember && !namaTamu.trim())}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent text-white disabled:opacity-50"
                >
                  <Send size={16} />
                </button>
              </div>
            </div>

            <button
              onClick={() => setOpenComments(null)}
              className="mt-3 w-full rounded-card border border-ink/15 px-4 py-2.5 text-sm font-semibold text-ink hover:bg-paper"
            >
              Tutup
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
