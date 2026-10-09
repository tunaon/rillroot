import { connectionApi } from '@/modules/connection/api';
import { queryOptions } from '@tanstack/react-query';

/** 서버 정보 조회의 제한 시간. 느린 서버 하나가 목록 전체를 붙들지 않게 한다. */
const SERVER_INFO_TIMEOUT_MS = 5000;

const text = (value: unknown) => (typeof value === 'string' ? value : null);

/**
 * 서버가 공개하는 자기 정보 중 서버 선택 목록에 쓰는 값.
 *
 * @property {string} title 서버가 정한 이름
 * @property {string} description 서버가 정한 한 줄 설명. 없으면 빈 문자열
 * @property {string | null} thumbnail 대표 이미지 주소. 없으면 null
 */
export interface ServerInfo {
  domain: string;
  title: string;
  description: string;
  thumbnail: string | null;
}

/**
 * 연동 쿼리의 키. 무효화할 때는 all 을 써서 하위 키를 한꺼번에 갱신한다.
 *
 * @property {readonly ['connections']} all 모든 연동 쿼리의 공통 접두사
 * @property {() => readonly ['connections', 'mine']} mine 내 연동 목록
 * @property {(server: string) => readonly ['connections', 'server', string]} server 서버 하나의 공개 정보
 */
export const connectionKeys = {
  all: ['connections'] as const,
  mine: () => [...connectionKeys.all, 'mine'] as const,
  server: (server: string) =>
    [...connectionKeys.all, 'server', server] as const,
};

/**
 * 내 연동 목록. 작성 화면이 열릴 때 읽는다.
 * 연동은 같은 탭 이동으로 떠났다 돌아오므로 캐시가 비어 있고, 돌아와 열릴 때 새로 읽는다.
 */
export const myConnectionsQueryOptions = queryOptions({
  queryKey: connectionKeys.mine(),
  queryFn: ({ signal }) => connectionApi.mine({ signal }),
});

/**
 * 서버 하나의 공개 정보. 서버가 직접 답하므로 API 를 거치지 않고 브라우저가 읽는다.
 * 서버 정보는 바뀌는 일이 드물어 같은 세션에서는 다시 묻지 않고, 실패하면 재시도 없이 대체 표시로 넘긴다.
 *
 * @param server 서버 호스트 이름
 */
export const serverInfoQueryOptions = (server: string) =>
  queryOptions({
    queryKey: connectionKeys.server(server),
    queryFn: async (): Promise<ServerInfo> => {
      const response = await fetch(`https://${server}/api/v2/instance`, {
        headers: { accept: 'application/json' },
        signal: AbortSignal.timeout(SERVER_INFO_TIMEOUT_MS),
      });
      if (!response.ok) {
        throw new Error(`${server} responded ${response.status}`);
      }

      const body = (await response.json()) as {
        domain?: unknown;
        title?: unknown;
        description?: unknown;
        thumbnail?: { url?: unknown };
      };
      return {
        domain: text(body.domain) ?? server,
        title: text(body.title) ?? '',
        description: text(body.description) ?? '',
        thumbnail: text(body.thumbnail?.url),
      };
    },
    staleTime: Infinity,
    gcTime: Infinity,
    retry: false,
  });
