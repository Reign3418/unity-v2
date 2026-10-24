import {getRequestConfig} from 'next-intl/server';
import {DEFAULT_LOCALE} from './lib/locales';

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
import ja from './messages/ja.json';
import it from './messages/it.json';
import pl from './messages/pl.json';
import th from './messages/th.json';
import ms from './messages/ms.json';

export const locales = {
  en,
  vi,
  ar,
  ru,
  zh,
  es,
  id,
  ko,
  tr,
  fr,
  de,
  pt,
  ja,
  it,
  pl,
  th,
  ms,
};

export default getRequestConfig(async ({requestLocale}) => {
  let locale = await requestLocale;

  if (!locale || !locales[locale]) {
    locale = DEFAULT_LOCALE;
  }

  return {
    locale,
    messages: locales[locale]
  };
});
