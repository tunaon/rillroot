'use client';

import type { Profile } from '@rillroot/shared';
import { createContext, useContext } from 'react';

const AuthContext = createContext<Profile | null>(null);

/** 서버의 첫 렌더에서 판단한 로그인 여부를 읽는다. 비회원이면 null이다. */
export function useProfile() {
  return useContext(AuthContext);
}

export default function AuthContextProvider({
  profile,
  children,
}: React.PropsWithChildren<{ profile: Profile | null }>) {
  return <AuthContext value={profile}>{children}</AuthContext>;
}
