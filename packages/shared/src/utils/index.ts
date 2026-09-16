import type { Theme } from '../types';

/** @description Theme type guard */
export function isTheme(v: string): v is Theme {
  return v === 'light' || v === 'dark' || v === 'system';
}
