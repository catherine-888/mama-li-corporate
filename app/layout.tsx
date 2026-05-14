import type { Metadata } from 'next';
import './globals.css';
import { OrderProvider } from '@/components/order-context';
import { fetchSettings } from '@/lib/content';
import type { SiteSettings } from '@/lib/content';

// ─────────────────────────────────────────────────────────────
//  Root layout — applies fonts, palette, and global styles to
//  every page. Both come from site_settings (admin-editable),
//  with a sensible fallback.
// ─────────────────────────────────────────────────────────────

const FONT_PAIRINGS: Record<
  SiteSettings['font_pairing'],
  { url: string; serif: string; sans: string; mono: string }
> = {
  editorial: {
    url: 'https://fonts.googleapis.com/css2?family=Newsreader:ital,opsz,wght@0,6..72,300..700;1,6..72,300..700&family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600;9..40,700&family=JetBrains+Mono:wght@400;500&display=swap',
    serif: 'Newsreader',
    sans: 'DM Sans',
    mono: 'JetBrains Mono',
  },
  classic: {
    url: 'https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400..900;1,400..900&family=Lora:ital,wght@0,400..700;1,400..700&family=JetBrains+Mono:wght@400;500&display=swap',
    serif: 'Playfair Display',
    sans: 'Lora',
    mono: 'JetBrains Mono',
  },
  modern: {
    url: 'https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300..900;1,9..144,300..900&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap',
    serif: 'Fraunces',
    sans: 'Inter',
    mono: 'JetBrains Mono',
  },
  sans: {
    url: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap',
    serif: 'Inter',
    sans: 'Inter',
    mono: 'JetBrains Mono',
  },
};

// Each palette swaps the cream/ink/accent triplet.
const PALETTES: Record<
  SiteSettings['palette'],
  { cream: string; paperDeep: string; ink: string; inkSoft: string; accent: string; jade: string; gold: string; rule: string }
> = {
  jade: {
    cream: '#f5eedc', paperDeep: '#ede4cc', ink: '#1c1813',
    inkSoft: '#5a524a', accent: '#1f4a38', jade: '#3a6b53',
    gold: '#c99846', rule: '#d9cfb6',
  },
  coral: {
    cream: '#fbf2eb', paperDeep: '#f3e3d4', ink: '#1c1813',
    inkSoft: '#5a524a', accent: '#b54a2f', jade: '#993c1d',
    gold: '#c99846', rule: '#e7cdb6',
  },
  charcoal: {
    cream: '#f1efe8', paperDeep: '#e6e3d8', ink: '#1a1a18',
    inkSoft: '#52524e', accent: '#2c2c2a', jade: '#3a6b53',
    gold: '#c99846', rule: '#cfcec5',
  },
  gold: {
    cream: '#f6efde', paperDeep: '#ede4c8', ink: '#1c1813',
    inkSoft: '#5a524a', accent: '#a67428', jade: '#3a6b53',
    gold: '#c99846', rule: '#d9cfb6',
  },
};

export async function generateMetadata(): Promise<Metadata> {
  const settings = await fetchSettings();
  return {
    title: `${settings.brand_name} · ${settings.brand_tagline}`,
    description:
      'Authentic Cantonese roast meats, lunch boxes and canapés, delivered to City of London offices. Verified corporate accounts only.',
    metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'https://orders.mamali.co.uk'),
    openGraph: {
      title: `${settings.brand_name} · ${settings.brand_tagline}`,
      description: settings.hero_body,
      type: 'website',
      locale: 'en_GB',
    },
    robots: { index: true, follow: true },
  };
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const settings = await fetchSettings();
  const fonts = FONT_PAIRINGS[settings.font_pairing] ?? FONT_PAIRINGS.editorial;
  const palette = PALETTES[settings.palette] ?? PALETTES.jade;

  // CSS vars override the defaults in globals.css.
  const paletteStyle = `:root {
    --cream: ${palette.cream};
    --paper-deep: ${palette.paperDeep};
    --ink: ${palette.ink};
    --ink-soft: ${palette.inkSoft};
    --accent: ${palette.accent};
    --jade: ${palette.jade};
    --gold: ${palette.gold};
    --rule: ${palette.rule};
    --font-serif: '${fonts.serif}', Georgia, serif;
    --font-sans: '${fonts.sans}', system-ui, sans-serif;
    --font-mono: '${fonts.mono}', ui-monospace, monospace;
  }`;

  return (
    <html lang="en" data-ornaments="subtle">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href={fonts.url} rel="stylesheet" />
        <style dangerouslySetInnerHTML={{ __html: paletteStyle }} />
      </head>
      <body>
        <OrderProvider>{children}</OrderProvider>
      </body>
    </html>
  );
}
