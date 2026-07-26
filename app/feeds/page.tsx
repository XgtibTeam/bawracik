'use client';

import { useEffect, useState } from 'react';

type FeedPost = {
  id: string;
  caption: string;
  imageUrl: string;
  createdAt: string;
  likeCount: number;
  commentCount: number;
  likedByMe: boolean;
};

type FeedComment = { id: string; nama: string; isi: string; createdAt: string };

function getLikerKey(): string {
  if (typeof window === 'undefined') return '';
  let key = localStorage.getItem('baw_liker_key');
  if (!key) {
    key = 'anon-' + crypto.randomUUID();
    localStorage.setItem('baw_liker_key', key);
  }
  return key;
}

export default function FeedsPage() {
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [openComments, setOpenComments] = useState<string | null>(null);
  const [comments, setComments] = useState<FeedComment[]>([]);
  const [namaKomentar, setNamaKomentar] = useState('');
  const [isiKomentar, setIsiKomentar] = useState('');

  function load() {
    const likerKey = getLikerKey();
    fetch(`/api/feeds?likerKey=${encodeURIComponent(likerKey)}`)
      .then((r) => r.json())
      .then((d) => {
        setPosts(d.posts || []);
        setLoading(false);
      });
  }
  useEffect(load, []);

  async function toggleLike(postId: string) {
    const likerKey = getLikerKey();
    setPosts((prev) =>
      prev.map((p) =>
        p.id === postId
          ? { ...p, likedByMe: !p.likedByMe, likeCount: p.likeCount + (p.likedByMe ? -1 : 1) }
          : p
      )
    );
    await fetch('/api/feeds/like', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ postId, likerKey }),
    });
  }

  async function openPostComments(postId: string) {
    setOpenComments(postId);
    const res = await fetch(`/api/feeds/comments?postId=${encodeURIComponent(postId)}`);
    const data = await res.json();
    setComments(data.comments || []);
  }

  async function submitComment() {
    if (!openComments || !namaKomentar.trim() || !isiKomentar.trim()) return;
    const res = await fetch('/api/feeds/comments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ postId: openComments, nama: namaKomentar.trim(), isi: isiKomentar.trim() }),
    });
    if (res.ok) {
      setIsiKomentar('');
      openPostComments(openComments);
      setPosts((prev) =>
        prev.map((p) => (p.id === openComments ? { ...p, commentCount: p.commentCount + 1 } : p))
      );
    }
  }

  return (
    <main className="mx-auto max-w-md px-4 py-6 pb-16">
      <h1 className="font-display text-2xl font-semibold text-ink">Feeds Bawracik</h1>
      <p className="mt-1 text-sm text-ink/50">Update terbaru dari BAW Group — like & komen tanpa perlu login.</p>

      {loading && <p className="mt-4 text-sm text-ink/40">Memuat...</p>}
      {!loading && posts.length === 0 && (
        <p className="mt-4 text-sm text-ink/40">Belum ada postingan.</p>
      )}

      <div className="mt-4 space-y-4">
        {posts.map((p) => (
          <div key={p.id} className="ticket overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={p.imageUrl} alt={p.caption} className="w-full object-cover" />
            <div className="p-4">
              {p.caption && <p className="text-sm text-ink">{p.caption}</p>}
              <p className="mt-1 text-xs text-ink/40">
                {new Date(p.createdAt).toLocaleDateString('id-ID')}
              </p>
              <div className="mt-3 flex items-center gap-4 text-sm">
                <button
                  onClick={() => toggleLike(p.id)}
                  className={`font-semibold ${p.likedByMe ? 'text-accent' : 'text-ink/50'}`}
                >
                  {p.likedByMe ? '♥' : '♡'} {p.likeCount}
                </button>
                <button onClick={() => openPostComments(p.id)} className="font-semibold text-ink/50">
                  💬 {p.commentCount}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {openComments && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center"
          onClick={() => setOpenComments(null)}
        >
          <div
            className="ticket flex max-h-[80vh] w-full max-w-sm flex-col p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-display text-lg font-semibold text-ink">Komentar</h3>
            <div className="mt-2 flex-1 space-y-3 overflow-y-auto">
              {comments.length === 0 && <p className="text-xs text-ink/40">Belum ada komentar.</p>}
              {comments.map((c) => (
                <div key={c.id} className="text-sm">
                  <p className="font-semibold text-ink">{c.nama}</p>
                  <p className="text-ink/70">{c.isi}</p>
                </div>
              ))}
            </div>
            <div className="mt-3 space-y-2 border-t border-ink/10 pt-3">
              <input
                value={namaKomentar}
                onChange={(e) => setNamaKomentar(e.target.value)}
                placeholder="Nama kamu"
                className="w-full rounded-lg border border-ink/15 px-3 py-2 text-sm outline-none focus:border-accent"
              />
              <div className="flex gap-2">
                <input
                  value={isiKomentar}
                  onChange={(e) => setIsiKomentar(e.target.value)}
                  placeholder="Tulis komentar..."
                  className="flex-1 rounded-lg border border-ink/15 px-3 py-2 text-sm outline-none focus:border-accent"
                />
                <button
                  onClick={submitComment}
                  className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white"
                >
                  Kirim
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
