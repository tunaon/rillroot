'use client';

import { ApiError } from '@/modules/network/config';
import { useTranslations } from 'next-intl';

/**
 * API 실패를 창작자에게 보일 문구로 바꾸는 함수를 돌려준다.
 * API 가 붙인 코드가 있으면 그 코드의 문구를, 없거나 모르는 코드면 부르는 쪽이 준 일반 문구를 쓴다.
 * API 의 영문 메시지는 화면에 내지 않는다.
 *
 * @returns 실패와 일반 문구를 받아 보일 문구를 돌려주는 함수
 */
export function useApiErrorMessage() {
  const t = useTranslations('apiErrors');

  return (error: unknown, fallback: string): string =>
    error instanceof ApiError && error.code !== null && t.has(error.code)
      ? t(error.code)
      : fallback;
}
