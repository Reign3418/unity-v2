import {getRequestConfig} from 'next-intl/server';
import {notFound} from 'next/navigation';

// Supported core locs mapped statically to avoid NextJS Turbopack dynamic resolution faults
const locales = {
  en: () => import('./messages/en.json'),
  vi: () => import('./messages/vi.json'),
  ar: () => import('./messages/ar.json'),
  ru: () => import('./messages/ru.json'),
  zh: () => import('./messages/zh.json'),
  es: () => import('./messages/es.json'),
  id: () => import('./messages/id.json'),
  ko: () => import('./messages/ko.json'),
  tr: () => import('./messages/tr.json'),
  fr: () => import('./messages/fr.json'),
  de: () => import('./messages/de.json'),
  pt: () => import('./messages/pt.json')
};

export default getRequestConfig(async ({locale}) => {
  if (!locales[locale]) notFound();

  return {
    messages: (await locales[locale]()).default
  };
});
