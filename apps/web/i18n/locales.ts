export const SUPPORTED_LOCALES = ['en', 'ko', 'ja', 'es'] as const;

export type Locale = (typeof SUPPORTED_LOCALES)[number];

export const DEFAULT_LOCALE: Locale = 'en';
