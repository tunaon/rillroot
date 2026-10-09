import { API_ERROR_CODES, type ApiErrorCode, CHANNELS } from '../constants';
import type { Channel, Theme } from '../types';

export * from './country';

/** @description Theme type guard */
export function isTheme(v: string): v is Theme {
  return v === 'light' || v === 'dark' || v === 'system';
}

/** @description 선언된 채널인지 */
export function isChannel(v: string): v is Channel {
  return CHANNELS.some((channel) => channel.key === v);
}

/** @description 연동이 구현된 채널인지 */
export function isAvailableChannel(v: string): v is Channel {
  return CHANNELS.some((channel) => channel.key === v && channel.available);
}

/** @description API 가 붙이는 실패 코드인지 */
export function isApiErrorCode(v: string): v is ApiErrorCode {
  return (API_ERROR_CODES as readonly string[]).includes(v);
}
