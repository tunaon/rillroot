'use client';

import { createClient } from '@/lib/supabase/client';
import type { Profile } from '@rillroot/shared';
import { useRouter } from 'next/navigation';
import { createContext, useContext, useEffect, useRef } from 'react';

const AuthContext = createContext<Profile | null>(null);

/** 서버의 첫 렌더에서 판단한 로그인 여부를 읽는다. 비회원이면 null이다. */
export function useProfile() {
  return useContext(AuthContext);
}

export default function AuthContextProvider({
  profile,
  children,
}: React.PropsWithChildren<{ profile: Profile | null }>) {
  // refresh는 경로를 받지 않아 로케일 접두사를 붙일 일이 없다. i18n/navigation의 router는
  // push·replace·prefetch만 감싸고 refresh는 그대로 통과시키므로 여기서는 쓸 이유가 없다.
  const router = useRouter();

  // prop이 아니라 ref로 비교한다. getCurrentProfile은 조회가 실패하면 null을 돌려주므로,
  // prop을 기준으로 삼으면 API가 죽어 있는 동안 refresh가 신원을 바꾸지 못해 다시 refresh하는
  // 루프가 된다. ref는 이벤트가 알려준 신원으로 먼저 옮겨가 한 번에 멈춘다.
  const viewerId = useRef(profile?.id ?? null);

  useEffect(() => {
    // supabase가 storageKey 이름의 BroadcastChannel로 로그인·로그아웃을 탭 사이에 이미
    // 전파한다. 채널을 따로 만들 일이 없고 구독만 하면 다른 탭의 변화가 여기로 온다.
    const { data } = createClient().auth.onAuthStateChange((_, session) => {
      const nextId = session?.user.id ?? null;

      // 마운트 직후의 INITIAL_SESSION과 주기적인 TOKEN_REFRESHED는 신원이 그대로다.
      // 토큰만 돌아간 것으로 서버 렌더를 다시 돌리지 않는다.
      if (nextId === viewerId.current) {
        return;
      }

      viewerId.current = nextId;
      // profile은 서버가 정하므로 클라이언트가 채울 수 없다. 서버 렌더부터 다시 그린다.
      router.refresh();
    });

    return () => data.subscription.unsubscribe();
  }, [router]);

  return <AuthContext value={profile}>{children}</AuthContext>;
}
