import { DEFAULT_LOCALE } from '@/i18n/locales';
import { createClient } from '@/lib/supabase/server';
import { profileApi } from '@/modules/profile/api';
import { type Profile, localeToCountryCode } from '@rillroot/shared';
import { headers } from 'next/headers';

/**
 * 로그인한 사용자의 프로필을 가져온다. 프로필이 아직 없으면 API가 이때 만든다.
 * 비회원이거나 API가 응답하지 못하면 null을 반환한다.
 *
 * @returns 프로필, 비회원이면 null
 */
export async function getCurrentProfile(): Promise<Profile | null> {
  const token = await getToken();

  if (!token) {
    return null;
  }

  // 접속 국가는 배포 환경에서만 헤더로 들어온다. API가 이 값으로 마지막 접속 국가를 남긴다.
  // 헤더가 없는 로컬에서는 기본값을 보내므로, 저장되는 값이 실제 접속 국가가 아닐 수 있다.
  const country =
    (await headers()).get('x-vercel-ip-country') ??
    localeToCountryCode(DEFAULT_LOCALE);

  try {
    return await profileApi.me({ token, country });
  } catch {
    return null;
  }
}

/**
 * 세션에서 access token만 꺼낸다. 세션에 담긴 사용자 정보로 권한을 판단하지 않으며,
 * 검증은 토큰을 받은 API가 서명으로 수행한다.
 *
 * @returns access token, 비회원이면 undefined
 */
export async function getToken(): Promise<string | undefined> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token;
}
