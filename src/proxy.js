import createMiddleware from 'next-intl/middleware';
import { SUPPORTED_LOCALES, DEFAULT_LOCALE } from './lib/locales';

export default createMiddleware({
  locales: SUPPORTED_LOCALES,
  defaultLocale: DEFAULT_LOCALE
});

export const config = {
  // Skip all paths that should not be internationalized (API, internal nextjs folders, shortlinks, static files)
  matcher: ['/((?!api|_next|_vercel|s(?:/|$)|qr(?:/|$)|.*\\..*).*)']
};
