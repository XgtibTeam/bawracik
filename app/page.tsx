import { getStoreProfile } from '@/lib/jsonbin';
import { getStoreLogos } from '@/lib/supabase';

export default async function HomePage() {
  const profile = await getStoreProfile();
  let logos: { id: string; url: string }[] = [];
  try {
    logos = await getStoreLogos();
  } catch {
    logos = [];
  }

  return (
    <main className="mx-auto max-w-md px-4 py-8">
      <div className="ticket p-6 text-center">
        {profile.logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={profile.logoUrl}
            alt={profile.namaToko}
            className="mx-auto h-24 w-24 rounded-full object-cover"
          />
        ) : (
          <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-accentSoft font-display text-2xl font-semibold text-accent">
            {profile.namaToko?.charAt(0) || 'B'}
          </div>
        )}
        <h1 className="mt-4 font-display text-2xl font-semibold text-ink">
          {profile.namaToko || 'Biang Aroma X Me.Racik Parfum'}
        </h1>
        <p className="mt-2 whitespace-pre-line text-sm text-ink/60">
          {profile.deskripsi || 'Toko parfum isi ulang dengan sistem member & poin.'}
        </p>

        {logos.length > 0 && (
          <div className="mt-4 flex flex-wrap items-center justify-center gap-3 border-t border-ink/10 pt-4">
            {logos.map((l) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={l.id} src={l.url} alt="logo" className="h-10 w-10 rounded-lg object-cover" />
            ))}
          </div>
        )}
      </div>

      <div className="ticket mt-4 flex justify-center gap-4 p-4 text-sm">
        {profile.socialMedia?.instagram && (
          <a
            href={`https://instagram.com/${profile.socialMedia.instagram.replace('@', '')}`}
            target="_blank"
            rel="noreferrer"
            className="font-medium text-accent"
          >
            Instagram
          </a>
        )}
        {profile.socialMedia?.whatsapp && (
          <a
            href={`https://wa.me/${profile.socialMedia.whatsapp.replace(/[^0-9]/g, '')}`}
            target="_blank"
            rel="noreferrer"
            className="font-medium text-accent"
          >
            WhatsApp
          </a>
        )}
        {profile.socialMedia?.tiktok && (
          <a
            href={`https://tiktok.com/@${profile.socialMedia.tiktok.replace('@', '')}`}
            target="_blank"
            rel="noreferrer"
            className="font-medium text-accent"
          >
            TikTok
          </a>
        )}
      </div>

      <a
        href="/belanja"
        className="mt-4 block rounded-card bg-accent px-4 py-3 text-center text-sm font-semibold text-white hover:opacity-90"
      >
        Mulai Belanja
      </a>

      {profile.homeSections?.map((s) => (
        <div key={s.id} className="ticket mt-4 overflow-hidden">
          {(s.type === 'banner' || s.type === 'gambar') && s.gambarUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={s.gambarUrl} alt={s.judul || ''} className="w-full object-cover" />
          )}
          {(s.judul || s.isi) && (
            <div className="p-4">
              {s.judul && <h2 className="font-display text-lg font-semibold text-ink">{s.judul}</h2>}
              {s.isi && <p className="mt-1 whitespace-pre-line text-sm text-ink/60">{s.isi}</p>}
            </div>
          )}
        </div>
      ))}
    </main>
  );
}
