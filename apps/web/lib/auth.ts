import { createClient } from '@/lib/supabase/server';
import { headers } from 'next/headers';

export interface Profile {
  id: string;
  handle: string;
  display_name: string;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * 로그인한 사용자의 프로필을 가져온다. 프로필이 아직 없으면 API가 이때 만든다.
 * 비회원이거나 API가 응답하지 못하면 null을 반환한다.
 *
 * @returns 프로필, 비회원이면 null
 */
export async function getCurrentProfile(): Promise<Profile | null> {
  const supabase = await createClient();

  // 여기서는 access token만 꺼내 API로 넘긴다. 세션에 담긴 사용자 정보로
  // 권한을 판단하지 않으며, 검증은 토큰을 받은 API가 서명으로 수행한다.
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;

  if (!token) {
    return null;
  }

  // 접속 국가는 배포 환경에서만 채워진다. API가 이 값으로 마지막 접속 국가를 남긴다.
  const country = (await headers()).get('x-vercel-ip-country');
  console.info('getCurrentProfile', { country });
  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/profiles/me`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          ...(country && { 'x-country': country }),
        },
        // 캐시되면 로그인 직후 화면을 다시 그려도 비회원 응답이 그대로 재사용된다.
        cache: 'no-store',
      }
    );

    if (!response.ok) {
      return null;
    }

    return (await response.json()) as Profile;
  } catch {
    return null;
  }
}
