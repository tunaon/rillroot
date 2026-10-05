import { connectionApi } from '@/modules/connection/api';
import { queryOptions } from '@tanstack/react-query';

/**
 * 연동 쿼리의 키. 무효화할 때는 all 을 써서 하위 키를 한꺼번에 갱신한다.
 *
 * @property {readonly ['connections']} all 모든 연동 쿼리의 공통 접두사
 * @property {() => readonly ['connections', 'mine']} mine 내 연동 목록
 */
export const connectionKeys = {
  all: ['connections'] as const,
  mine: () => [...connectionKeys.all, 'mine'] as const,
};

/**
 * 내 연동 목록. 작성 화면이 열릴 때 읽는다.
 * 연동은 같은 탭 이동으로 떠났다 돌아오므로 캐시가 비어 있고, 돌아와 열릴 때 새로 읽는다.
 */
export const myConnectionsQueryOptions = queryOptions({
  queryKey: connectionKeys.mine(),
  queryFn: ({ signal }) => connectionApi.mine({ signal }),
});
