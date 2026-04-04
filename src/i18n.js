import {getRequestConfig} from 'next-intl/server';
import {notFound} from 'next/navigation';

import en from './messages/en.json';
import vi from './messages/vi.json';
import ar from './messages/ar.json';
import ru from './messages/ru.json';
import zh from './messages/zh.json';
import es from './messages/es.json';
import id from './messages/id.json';
import ko from './messages/ko.json';
import tr from './messages/tr.json';
import fr from './messages/fr.json';
import de from './messages/de.json';
import pt from './messages/pt.json';

const locales = { en, vi, ar, ru, zh, es, id, ko, tr, fr, de, pt };

export default getRequestConfig(async ({requestLocale}) => {
  let locale = await requestLocale;
  
  if (!locale || !locales[locale]) {
    locale = 'en';
  }
  
  return {
    locale,
    messages: locales[locale]
  };
});
