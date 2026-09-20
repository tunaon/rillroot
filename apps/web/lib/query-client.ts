import { ApiError } from '@/modules/network/config';
import {
  QueryClient,
  type QueryClientConfig,
  environmentManager,
} from '@tanstack/react-query';

// QueryClient는 이 객체를 참조로 들고 읽을 때만 펼치므로 여러 인스턴스가 함께 써도 된다.
const queryClientConfig: QueryClientConfig = {
  defaultOptions: {
    queries: {
      staleTime: 1_000 * 60,
      gcTime: 1_000 * 60 * 5,
      refetchOnWindowFocus: false,
      // 4xx는 다시 보내도 같은 답이 온다. 재시도하면 backoff로 몇 초를 붙잡고 있다가
      // 같은 에러를 낸다.
      retry: (count, error) =>
        !(error instanceof ApiError && error.status < 500) && count < 2,
    },
  },
};

/** 브라우저에서 탭이 사는 동안 계속 쓰는 캐시. 서버에서는 쓰이지 않는다. */
let browserClient: QueryClient | undefined;

/**
 * 서버 렌더는 요청마다 새 캐시를 만든다. 모듈 수준에 하나를 두면 사용자들이 같은
 * 캐시를 공유한다. 브라우저는 하나를 계속 쓴다.
 *
 * 이 파일에 'use client'를 두지 않는다. 서버 prefetch를 붙일 때 서버 컴포넌트가 이
 * 함수를 불러야 하는데, 'use client' 모듈의 export는 클라이언트 참조가 되어 서버에서
 * 호출할 수 없다.
 */
export function getQueryClient() {
  if (environmentManager.isServer()) {
    return new QueryClient(queryClientConfig);
  }

  browserClient ??= new QueryClient(queryClientConfig);

  return browserClient;
}
