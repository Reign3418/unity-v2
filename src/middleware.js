import createMiddleware from 'next-intl/middleware';

export default createMiddleware({
  locales: ['en', 'vi', 'ar', 'ru', 'zh', 'es', 'id', 'ko', 'tr', 'fr', 'de', 'pt'],
  defaultLocale: 'en'
});

export const config = {
  // Skip all paths that should not be internationalized (API, internal nextjs folders, static files)
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)']
};
