import { getToken } from '@/lib/auth';
import { internalPath } from '@/lib/internal-path';
import { connectionApi } from '@/modules/connection/api';
import { CONNECT_QUERY, type ConnectResult } from '@/modules/connection/result';
import { ApiError } from '@/modules/network/config';
import {
  type CompleteConnectionRequest,
  OAUTH_CALLBACK_PARAMS,
  isAvailableChannel,
} from '@rillroot/shared';
import { type NextRequest, NextResponse } from 'next/server';

/**
 * 채널 연동 복귀 지점. 로그인 복귀(api/auth/callback)와 같은 모양이며 OAuth 채널 공통이다.
 *
 * 채널이 동의 뒤 API 복귀 경로로 돌려보내면 API 가 같은 값을 이리로 넘긴다. 여기서 세션 쿠키로
 * 사용자를 확인해 API 에 완료를 부르고, 연동을 시작한 화면으로 돌려보낸다. 코드 교환과 토큰 보관은
 * API 가 하므로 이 라우트는 채널 토큰을 다루지 않는다. 결과는 돌아간 주소의 query 로 알린다.
 *
 * @param request 채널이 붙인 OAuth 응답 값을 담은 요청
 * @param ctx 경로의 채널 키
 * @returns 연동을 시작한 화면으로의 302. 그 화면을 알 수 없으면 루트로 보낸다
 */
export async function GET(
  request: NextRequest,
  ctx: RouteContext<'/api/connections/[channel]/callback'>
) {
  const { channel } = await ctx.params;
  const { origin, searchParams } = request.nextUrl;

  const back = (path: string | null, result: ConnectResult) => {
    // 기준 주소로 상대 경로를 풀지 않고 이어 붙인다. 이어 붙이면 경로가 무엇이든 호스트가 바뀌지 않는다.
    const url = new URL(`${origin}${internalPath(path)}`);
    url.searchParams.set(CONNECT_QUERY.channel, channel);
    url.searchParams.set(CONNECT_QUERY.result, result);
    return NextResponse.redirect(url);
  };

  const token = await getToken();
  const state = searchParams.get('state');

  if (!isAvailableChannel(channel) || !token || !state) {
    return back(null, 'failed');
  }

  const body: CompleteConnectionRequest = { state };
  for (const key of OAUTH_CALLBACK_PARAMS) {
    const value = searchParams.get(key);
    if (value !== null) body[key] = value;
  }

  try {
    const { return_to } = await connectionApi.complete(channel, body, {
      token,
    });
    return back(return_to, 'connected');
  } catch (error) {
    const result = failureOf(error, searchParams);
    if (result === 'failed') {
      console.error(
        '[connections] complete failed',
        error instanceof Error ? error.message : error
      );
    }

    return back(returnToOf(error), result);
  }
}

/**
 * 실패를 화면에 알릴 결과로 나눈다.
 *
 * @param error 완료 호출이 던진 값
 * @param searchParams 채널이 붙인 값. 창작자가 동의 화면에서 취소하면 error=access_denied 가 온다
 * @returns 취소면 denied, 이미 다른 사용자에게 묶인 계정이면 taken, 그 밖에는 failed
 */
function failureOf(
  error: unknown,
  searchParams: URLSearchParams
): ConnectResult {
  if (searchParams.get('error') === 'access_denied') {
    return 'denied';
  }

  if (error instanceof ApiError && error.status === 409) {
    return 'taken';
  }

  return 'failed';
}

/**
 * API 가 실패 본문에 실어 준 돌아갈 경로를 꺼낸다.
 *
 * @param error 완료 호출이 던진 값
 * @returns 돌아갈 경로. 없으면 null
 */
function returnToOf(error: unknown): string | null {
  if (!(error instanceof ApiError)) {
    return null;
  }

  const { body } = error;
  return typeof body === 'object' &&
    body !== null &&
    'return_to' in body &&
    typeof body.return_to === 'string'
    ? body.return_to
    : null;
}
