import { healthApi } from '@/modules/health/api';
import { queryOptions } from '@tanstack/react-query';

export const healthKeys = {
  all: ['health'] as const,
};

/**
 * queryFn을 화살표로 감싸는 것은 취향이 아니다. RequestConfig가 RequestInit 기반이라
 * `queryFn: healthApi.check`도 타입 검사를 통과하지만, 그러면 React Query가 넘기는
 * 컨텍스트(queryKey·client 등)가 그대로 fetch의 init으로 펼쳐진다. 감싸면서 signal만
 * 넘겨야 요청 취소도 이어진다.
 */
export const healthQueryOptions = queryOptions({
  queryKey: healthKeys.all,
  queryFn: ({ signal }) => healthApi.check({ signal }),
});
