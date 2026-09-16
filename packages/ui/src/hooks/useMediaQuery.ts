'use client';

import { useCallback, useSyncExternalStore } from 'react';

export default function useMediaQuery(query: string) {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const mql = window.matchMedia(query);
      mql.addEventListener('change', onChange);
      return () => mql.removeEventListener('change', onChange);
    },
    [query]
  );

  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches,
    () => false // 서버 스냅샷 — 하이드레이션까지 이 값이 쓰인다
  );
}
