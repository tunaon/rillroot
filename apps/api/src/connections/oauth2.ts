import { createHash, randomBytes } from 'node:crypto';

/**
 * 채널 서버 호출의 제한 시간. 서버 하나가 느려도 연동 시작과 완료가 오래 매달리지 않게 한다.
 */
export const OAUTH_TIMEOUT_MS = 10_000;

/**
 * 채널 서버 호출의 실패. 본문은 담지 않고 상태와 OAuth 오류 코드만 남긴다.
 * 서버에 닿지 못한 경우(DNS·연결·제한 시간)와 JSON 이 아닌 응답도 여기로 모아,
 * 부르는 쪽이 오류 모양 하나로 판단하게 한다.
 *
 * @property {number | null} status HTTP 상태. 응답을 받지 못했으면 null
 * @property {string | null} code 본문의 error 값. 없으면 null
 */
export class OAuthHttpError extends Error {
  constructor(
    readonly status: number | null,
    readonly code: string | null,
    url: URL,
    options?: ErrorOptions
  ) {
    const outcome = status === null ? 'is unreachable' : `responded ${status}`;
    super(
      `${url.host}${url.pathname} ${outcome}${code ? ` (${code})` : ''}`,
      options
    );
    this.name = 'OAuthHttpError';
  }
}

/**
 * 인가 요청의 state. 추측할 수 없어야 하므로 난수로 만든다.
 *
 * @returns URL 에 그대로 실을 수 있는 문자열
 */
export function randomState(): string {
  return randomBytes(32).toString('base64url');
}

/**
 * 코드 교환 보호 값(PKCE). verifier 는 우리만 알고 S256 해시인 challenge 만 인가 주소에 싣는다.
 * 코드를 가로채도 verifier 가 없으면 토큰으로 바꾸지 못한다.
 *
 * @returns 시도에 보관할 verifier 와 인가 주소에 실을 challenge
 */
export function createPkce(): { verifier: string; challenge: string } {
  const verifier = randomBytes(32).toString('base64url');
  const challenge = createHash('sha256').update(verifier).digest('base64url');
  return { verifier, challenge };
}

/**
 * 폼으로 POST 하고 JSON 응답을 돌려준다. OAuth 토큰 발급·회수와 앱 등록이 모두 이 모양이다.
 *
 * @param url 요청 주소
 * @param body 폼 필드
 * @returns 응답 본문
 * @throws {OAuthHttpError} 서버에 닿지 못했거나, 2xx 외의 상태로 답했거나, 응답이 JSON 이 아닌 경우
 */
export function postForm<T>(
  url: URL,
  body: Record<string, string>
): Promise<T> {
  return request<T>(url, {
    method: 'POST',
    headers: { accept: 'application/json' },
    body: new URLSearchParams(body),
  });
}

/**
 * 토큰을 실어 GET 하고 JSON 응답을 돌려준다.
 *
 * @param url 요청 주소
 * @param token 접근 토큰
 * @returns 응답 본문
 * @throws {OAuthHttpError} 서버에 닿지 못했거나, 2xx 외의 상태로 답했거나, 응답이 JSON 이 아닌 경우
 */
export function getJson<T>(url: URL, token: string): Promise<T> {
  return request<T>(url, {
    headers: { accept: 'application/json', authorization: `Bearer ${token}` },
  });
}

/**
 * 요청을 보내고 JSON 응답을 돌려준다. 실패의 모든 모양을 OAuthHttpError 하나로 던진다.
 *
 * @param url 요청 주소
 * @param init 요청 방식과 헤더, 본문
 * @returns 응답 본문
 * @throws {OAuthHttpError} 서버에 닿지 못했거나, 2xx 외의 상태로 답했거나, 응답이 JSON 이 아닌 경우
 */
async function request<T>(url: URL, init: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(url, {
      ...init,
      signal: AbortSignal.timeout(OAUTH_TIMEOUT_MS),
    });
  } catch (error) {
    throw new OAuthHttpError(null, null, url, { cause: error });
  }

  if (!response.ok) {
    return reject(response, url);
  }

  try {
    return (await response.json()) as T;
  } catch (error) {
    throw new OAuthHttpError(response.status, 'invalid_response', url, {
      cause: error,
    });
  }
}

/**
 * 거부 응답을 오류로 바꾼다. 본문에서 OAuth 오류 코드만 꺼내고 나머지는 버린다.
 *
 * @param response 2xx 가 아닌 응답
 * @param url 요청 주소
 * @throws {OAuthHttpError} 항상
 */
async function reject(response: Response, url: URL): Promise<never> {
  let code: string | null = null;
  try {
    const body = (await response.json()) as { error?: unknown };
    code = typeof body.error === 'string' ? body.error : null;
  } catch {
    code = null;
  }

  throw new OAuthHttpError(response.status, code, url);
}
