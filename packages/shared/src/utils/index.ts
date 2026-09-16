import type { Theme } from '../types';

export * from './country';

/** @description Theme type guard */
export function isTheme(v: string): v is Theme {
  return v === 'light' || v === 'dark' || v === 'system';
}
