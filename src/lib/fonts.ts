/**
 * Font management utilities for the Estúdio.
 * Loads Google Fonts dynamically and provides font metadata.
 */

export type FontEntry = {
  id: string;
  fontFamily: string;
  googleName: string;
  weights?: string;
};

const FONT_CATALOG: FontEntry[] = [
  { id: 'inter', fontFamily: '"Inter", sans-serif', googleName: 'Inter', weights: '400;500;600;700;800' },
  { id: 'poppins', fontFamily: '"Poppins", sans-serif', googleName: 'Poppins', weights: '400;500;600;700;800' },
  { id: 'montserrat', fontFamily: '"Montserrat", sans-serif', googleName: 'Montserrat', weights: '400;500;600;700;800' },
  { id: 'roboto', fontFamily: '"Roboto", sans-serif', googleName: 'Roboto', weights: '400;500;700' },
  { id: 'open-sans', fontFamily: '"Open Sans", sans-serif', googleName: 'Open+Sans', weights: '400;600;700' },
  { id: 'lato', fontFamily: '"Lato", sans-serif', googleName: 'Lato', weights: '400;700;900' },
  { id: 'raleway', fontFamily: '"Raleway", sans-serif', googleName: 'Raleway', weights: '400;500;600;700' },
  { id: 'oswald', fontFamily: '"Oswald", sans-serif', googleName: 'Oswald', weights: '400;500;600;700' },
  { id: 'nunito', fontFamily: '"Nunito", sans-serif', googleName: 'Nunito', weights: '400;600;700;800' },
  { id: 'playfair-display', fontFamily: '"Playfair Display", serif', googleName: 'Playfair+Display', weights: '400;500;600;700' },
  { id: 'dm-sans', fontFamily: '"DM Sans", sans-serif', googleName: 'DM+Sans', weights: '400;500;600;700' },
  { id: 'space-grotesk', fontFamily: '"Space Grotesk", sans-serif', googleName: 'Space+Grotesk', weights: '400;500;600;700' },
  { id: 'bebas-neue', fontFamily: '"Bebas Neue", sans-serif', googleName: 'Bebas+Neue', weights: '400' },
  { id: 'archivo', fontFamily: '"Archivo", sans-serif', googleName: 'Archivo', weights: '400;500;600;700;800' },
];

const SYSTEM_FALLBACK: FontEntry = {
  id: 'system',
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  googleName: '',
};

const loadedFonts = new Set<string>();

/**
 * Get font metadata by ID (brand_kit.font_family value).
 * Returns system fallback if not found or undefined.
 */
export function getFontById(id?: string | null): FontEntry {
  if (!id) return SYSTEM_FALLBACK;
  const found = FONT_CATALOG.find(f => f.id === id || f.googleName.replace(/\+/g, ' ').toLowerCase() === id.toLowerCase());
  return found || SYSTEM_FALLBACK;
}

/**
 * Dynamically load a Google Font by injecting a <link> tag.
 * No-op if already loaded or if the font is system fallback.
 */
export function loadFont(id?: string | null): void {
  if (!id) return;
  const font = getFontById(id);
  if (!font.googleName || loadedFonts.has(font.id)) return;
  loadedFonts.add(font.id);

  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = `https://fonts.googleapis.com/css2?family=${font.googleName}:wght@${font.weights || '400;700'}&display=swap`;
  document.head.appendChild(link);
}
