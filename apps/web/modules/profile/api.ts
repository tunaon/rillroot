import { type RequestConfig, http } from '@/modules/network/config';
import type { Profile } from '@rillroot/shared';

export const profileApi = {
  /** 로그인한 사용자의 프로필. 프로필이 아직 없으면 API가 이때 만든다. */
  me: (config?: RequestConfig) =>
    // 캐시되면 로그인 직후 화면을 다시 그려도 비회원 응답이 그대로 재사용된다.
    http.get<Profile>('/profiles/me', { cache: 'no-store', ...config }),
};
