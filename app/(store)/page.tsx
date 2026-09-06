import { getStoreProfile } from '@/lib/jsonbin';
import { driveImageUrl } from '@/lib/drive-url';
import { InstagramIcon, WhatsAppIcon, TikTokIcon } from '@/components/SocialIcons';

export default async function HomePage() {
  const profile = await getStoreProfile();
  const logoSrc = driveImageUrl(profile.logoUrl);

  const socials = [
    profile.socialMedia?.instagram && {
      href: `https://instagram.com/${profile.socialMedia.instagram.replace('@', '')}`,
      label: 'Instagram',
      icon: <InstagramIcon size={20} />,
    },
    profile.socialMedia?.whatsapp && {
      href: `https://wa.me/${profile.socialMedia.whatsapp.replace(/[^0-9]/g, '')}`,
      label: 'WhatsApp',
      icon: <WhatsAppIcon size={20} />,
    },
    profile.socialMedia?.tiktok && {
      href: `https://tiktok.com/@${profile.socialMedia.tiktok.replace('@', '')}`,
      label: 'TikTok',
      icon: <TikTokIcon size={20} />,
    },
  ].filter(Boolean) as { href: string; label: string; icon: React.ReactNode }[];

  return (
    <main className="mx-auto max-w-md px-4 py-8">
      {/* ---- Hero ---- */}
      <div className="relative overflow-hidden rounded-card bg-gradient-to-br from-accent to-accent/70 p-8 text-center text-white shadow-lg">
        <div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/10" />
        <div className="pointer-events-none absolute -bottom-10 -left-10 h-40 w-40 rounded-full bg-white/10" />

        {logoSrc ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={logoSrc}
            alt={profile.namaToko}
            className="relative mx-auto h-24 w-24 rounded-full border-4 border-white/40 object-cover shadow-md"
          />
        ) : (
          <div className="relative mx-auto flex h-24 w-24 items-center justify-center rounded-full border-4 border-white/40 bg-white/15 font-display text-2xl font-semibold">
            {profile.namaToko?.charAt(0) || 'B'}
          </div>
        )}
        <h1 className="relative mt-4 font-display text-2xl font-semibold">
          {profile.namaToko || 'Biang Aroma X Me.Racik Parfum'}
        </h1>
        {profile.slogan && <p className="relative mt-1 text-sm font-medium italic text-white/90">{profile.slogan}</p>}
        <p className="relative mt-2 whitespace-pre-line text-sm text-white/80">
          {profile.deskripsi || 'Toko parfum isi ulang dengan sistem member & poin.'}
        </p>

        <a
          href="/belanja"
          className="relative mt-5 block rounded-card bg-white px-4 py-3 text-center text-sm font-semibold text-accent shadow-md transition hover:opacity-90"
        >
          {profile.ctaText || 'Mulai Belanja'}
        </a>
      </div>

      {/* ---- Social links ---- */}
      {socials.length > 0 && (
        <div className="mt-4 flex justify-center gap-3">
          {socials.map((s) => (
            <a
              key={s.label}
              href={s.href}
              target="_blank"
              rel="noreferrer"
              aria-label={s.label}
              className="flex h-11 w-11 items-center justify-center rounded-full bg-accentSoft text-accent shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
            >
              {s.icon}
            </a>
          ))}
        </div>
      )}

      {profile.logos && profile.logos.length > 0 && (
        <div className="ticket mt-4 flex flex-wrap items-center justify-center gap-3 p-4">
          {profile.logos.map((url, i) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={i} src={driveImageUrl(url)} alt={`${profile.namaToko} logo ${i + 1}`} className="h-12 w-12 object-contain" />
          ))}
        </div>
      )}

      {profile.homeSections?.map((s) => (
        <div key={s.id} className="ticket mt-4 overflow-hidden">
          {(s.type === 'banner' || s.type === 'gambar') && s.gambarUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={driveImageUrl(s.gambarUrl)} alt={s.judul || ''} className="w-full object-cover" />
          )}
          {(s.judul || s.isi) && (
            <div className="p-4">
              {s.judul && <h2 className="font-display text-lg font-semibold text-ink">{s.judul}</h2>}
              {s.isi && <p className="mt-1 whitespace-pre-line text-sm text-ink/60">{s.isi}</p>}
            </div>
          )}
        </div>
      ))}

      <p className="mt-8 pb-2 text-center text-[11px] text-ink/25">
        {profile.footerText || 'BAW Group — Biang Aroma Wangi × Me.Racik × Racik Parfum'}
      </p>
    </main>
  );
}
