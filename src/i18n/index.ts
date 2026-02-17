export type SupportedLocale = 'en' | 'sq' | 'es' | 'fr' | 'de' | 'it' | 'pt' | 'ru' | 'ar' | 'zh';

import en from './locales/en.json';
import sq from './locales/sq.json';
import es from './locales/es.json';
import fr from './locales/fr.json';
import de from './locales/de.json';
import it from './locales/it.json';
import pt from './locales/pt.json';
import ru from './locales/ru.json';
import ar from './locales/ar.json';
import zh from './locales/zh.json';

export const LOCALE_LABELS: Array<{ code: SupportedLocale; label: string }> = [
  { code: 'en', label: 'English' },
  { code: 'sq', label: 'Shqip' },
  { code: 'es', label: 'Espanol' },
  { code: 'fr', label: 'Francais' },
  { code: 'de', label: 'Deutsch' },
  { code: 'it', label: 'Italiano' },
  { code: 'pt', label: 'Portugues' },
  { code: 'ru', label: 'Russkiy' },
  { code: 'ar', label: 'Arabic' },
  { code: 'zh', label: 'Chinese' },
];

const resources = { en, sq, es, fr, de, it, pt, ru, ar, zh } as const;

type Params = Record<string, string | number>;

const getByPath = (obj: unknown, path: string): string | null => {
  if (!obj || typeof obj !== 'object') return null;
  const parts = path.split('.');
  let current: any = obj;
  for (const part of parts) {
    if (!current || typeof current !== 'object' || !(part in current)) return null;
    current = current[part];
  }
  return typeof current === 'string' ? current : null;
};

const interpolate = (value: string, params?: Params) => {
  if (!params) return value;
  return value.replace(/\{\{(\w+)\}\}/g, (_, key: string) => {
    const next = params[key];
    return next === undefined || next === null ? '' : String(next);
  });
};

export const translate = (locale: SupportedLocale, key: string, params?: Params): string => {
  const source = resources[locale] ?? resources.en;
  const translated = getByPath(source, key) ?? getByPath(resources.en, key) ?? key;
  return interpolate(translated, params);
};
