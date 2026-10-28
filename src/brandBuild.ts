// src/brandBuild.ts — the brand (#363) as the build writes it: index.html's
// %BRAND_*% placeholders and the PWA manifest. vite.config.ts uses both; they live
// here, free of Node, so tests/brand.test.ts can check them without a build.

import { BRAND, type Brand } from './brand';

const HTML_VALUES = (brand: Brand): Record<string, string> => ({
  BRAND_NAME: brand.name,
  BRAND_BACKGROUND: brand.colors.background,
});

/** index.html with the brand's values in place of its %BRAND_*% placeholders. */
export function brandIndexHtml(html: string, brand: Brand = BRAND): string {
  const values = HTML_VALUES(brand);
  const escape = (v: string): string => v.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
  return html.replace(/%(BRAND_[A-Z_]+)%/g, (whole, key: string) => {
    const v = values[key];
    if (v === undefined) throw new Error(`index.html: no brand value for ${whole}`);
    return escape(v);
  });
}

/** The PWA manifest vite-plugin-pwa writes to manifest.webmanifest: names and colours from the brand. */
export const PWA_MANIFEST = {
  name: BRAND.name,
  short_name: BRAND.shortName,
  display: 'standalone' as const,
  orientation: 'landscape' as const,
  theme_color: BRAND.colors.app,
  background_color: BRAND.colors.app,
  icons: [
    { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
    {
      src: 'icons/icon-512.png',
      sizes: '512x512',
      type: 'image/png',
      purpose: 'any maskable',
    },
  ],
};
