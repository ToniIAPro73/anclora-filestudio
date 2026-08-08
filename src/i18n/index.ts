import { messages as esMessages } from './es';
import { messages as enMessages } from './en';

export type MessageKey = keyof typeof esMessages;

type MessageMap = Record<string, string>;

let currentMessages: MessageMap = esMessages as unknown as MessageMap;
let currentLocale: 'es' | 'en' = 'es';

const localeMap: Record<'es' | 'en', MessageMap> = {
  es: esMessages as unknown as MessageMap,
  en: enMessages as unknown as MessageMap,
};

/**
 * Translate a message key with optional parameter interpolation.
 *
 * @example
 * t("diagnostics.summary", { available: 8, total: 10 })
 * // → "8 de 10 herramientas disponibles" (es)
 */
export function t(key: MessageKey, params?: Record<string, string | number>): string {
  let msg = currentMessages[key] ?? key;
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      msg = msg.replace(`{${k}}`, String(v));
    }
  }
  return msg;
}

/**
 * Switch the active locale. Defaults to 'es'.
 */
export function setLocale(locale: 'es' | 'en'): void {
  currentLocale = locale;
  currentMessages = localeMap[locale];
}

/**
 * Get the current locale.
 */
export function getLocale(): 'es' | 'en' {
  return currentLocale;
}
