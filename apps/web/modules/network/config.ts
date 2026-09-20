import { createClient } from '@/lib/supabase/client';

/**
 * API 호출 설정.
 *
 * token은 생략하는 것이 기본이다. 브라우저에서는 request가 세션에서 읽어 있으면 붙이고,
 * 없으면 붙이지 않는다. 서버는 next/headers를 쓰는 모듈을 이 레이어로 들일 수 없어
 * 세션을 못 읽으므로, 서버 호출부만 읽어서 넘긴다.
 *
 * null은 토큰이 있어도 붙이지 않게 하는 탈출구다. 공개 경로는 토큰이 붙어도 응답이
 * 같으니 보통 필요 없고, 붙는 것 자체가 문제가 되는 경로가 생기면 그때 쓴다.
 */
export type RequestConfig = Omit<RequestInit, 'method' | 'body' | 'headers'> & {
  headers?: Record<string, string>;
  token?: string | null;
  country?: string | null;
};

/** API가 2xx 이외로 답한 요청. 호출부는 status로 분기한다. */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly body: unknown
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

const API_PATH = process.env.NEXT_PUBLIC_API_URL;

// NEXT_PUBLIC_ 값은 빌드 시점에 박힌다. 비어 있으면 상대 경로가 되어 웹 서버로 404가
// 날아가고 원인이 드러나지 않으므로, api의 env 검증과 같이 여기서 즉시 터뜨린다.
if (!API_PATH) {
  throw new Error('NEXT_PUBLIC_API_URL is not set');
}

/** 브라우저 세션에서 access token을 읽는다. 만료됐으면 이 호출이 갱신한다. */
async function getBrowserToken(): Promise<string | null> {
  const { data } = await createClient().auth.getSession();

  return data.session?.access_token ?? null;
}

async function request<T>(
  method: string,
  path: string,
  data?: unknown,
  config?: RequestConfig
): Promise<T> {
  const { token, country, headers, ...init } = config ?? {};

  const authToken =
    token !== undefined
      ? token
      : typeof window === 'undefined'
        ? null
        : await getBrowserToken();

  const response = await fetch(API_PATH + path, {
    method,
    ...init,
    headers: {
      // Authorization·x-country·Content-Type은 모두 safelist 밖이라 하나만 붙어도
      // 브라우저 GET이 preflight된다. 비회원 읽기를 단순 요청으로 남기려고
      // Content-Type은 본문이 있을 때만 붙이고 국가는 호출부가 줄 때만 붙인다.
      ...(data !== undefined && { 'Content-Type': 'application/json' }),
      ...(authToken && { Authorization: `Bearer ${authToken}` }),
      ...(country && { 'x-country': country }),
      ...headers,
    },
    ...(data !== undefined && { body: JSON.stringify(data) }),
  });

  if (!response.ok) {
    // api는 Nest 기본 형식({ message, statusCode })으로 답한다. 그 형식이 아니면 본문을 그대로 싣는다.
    const body: unknown = await response.json().catch(() => null);
    const message =
      typeof body === 'object' && body !== null && 'message' in body
        ? String(body.message)
        : `${method} ${path} ${response.status}`;

    // 401을 여기서 되살리지 않는다. proxy가 매 네비게이션마다, getSession이 요청마다
    // 토큰을 미리 갱신하므로 만료로 인한 401은 여기까지 오지 않고, 남는 401은 refresh
    // token 자체가 죽은 경우라 재시도로 고쳐지지 않는다. 화면을 되돌려야 하는 호출부가
    // status로 분기한다.
    throw new ApiError(response.status, message, body);
  }

  // 204는 본문이 없어 json()이 던진다.
  return (response.status === 204 ? undefined : await response.json()) as T;
}

export const http = {
  get: <T>(path: string, config?: RequestConfig) =>
    request<T>('GET', path, undefined, config),
  post: <T>(path: string, data?: unknown, config?: RequestConfig) =>
    request<T>('POST', path, data, config),
  patch: <T>(path: string, data?: unknown, config?: RequestConfig) =>
    request<T>('PATCH', path, data, config),
  delete: <T>(path: string, config?: RequestConfig) =>
    request<T>('DELETE', path, undefined, config),
};
