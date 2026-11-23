import { Vazirmatn } from 'next/font/google';

/**
 * Font configuration for Antic Curtain
 * Uses Vazirmatn for Persian/Arabic text
 */
export const vazirmatn = Vazirmatn({
  subsets: ['arabic', 'latin'],
  weight: ['100', '200', '300', '400', '500', '600', '700', '800', '900'],
  variable: '--font-vazirmatn',
  display: 'swap',
  preload: true,
  fallback: ['system-ui', 'sans-serif'],
});

/**
 * CSS variable for font family
 * Usage: className={`${vazirmatn.variable} font-body`}
 */
export const fontVariables = vazirmatn.variable;