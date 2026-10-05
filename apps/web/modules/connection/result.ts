import type { Channel } from '@rillroot/shared';

/**
 * 연동이 끝나고 돌아온 주소에 붙는 query 이름. 웹 복귀 라우트가 붙이고 작성 화면이 읽은 뒤 지운다.
 *
 * @property {string} channel 연동한 채널 키를 담는 이름
 * @property {string} result 연동 결과를 담는 이름
 */
export const CONNECT_QUERY = {
  channel: 'connect',
  result: 'connect_result',
} as const;

/**
 * 연동 결과와 돌아온 화면이 띄울 알림. 결과를 늘리거나 문구를 바꿀 때 여기 한 곳만 고친다.
 * denied 는 창작자가 채널의 동의 화면에서 취소한 경우, taken 은 그 채널 계정이 이미 다른 사용자에게
 * 묶여 있는 경우, failed 는 그 밖의 실패다.
 *
 * @property {string} message composer 네임스페이스의 알림 문구 키
 * @property {'success' | 'info' | 'error'} tone 알림 모양
 */
export const CONNECT_RESULTS = {
  connected: { message: 'channelConnected', tone: 'success' },
  denied: { message: 'channelConnectDenied', tone: 'info' },
  taken: { message: 'channelTaken', tone: 'error' },
  failed: { message: 'channelConnectFailed', tone: 'error' },
} as const satisfies Record<
  string,
  { message: string; tone: 'success' | 'info' | 'error' }
>;

export type ConnectResult = keyof typeof CONNECT_RESULTS;

/**
 * 돌아온 화면이 받는 연동 결과.
 *
 * @property {Channel} channel 연동한 채널
 * @property {ConnectResult} result 연동 결과
 */
export interface ConnectOutcome {
  channel: Channel;
  result: ConnectResult;
}

/**
 * @param value query 에서 읽은 값
 * @returns 알려진 연동 결과인지
 */
export function isConnectResult(value: string | null): value is ConnectResult {
  return value !== null && Object.hasOwn(CONNECT_RESULTS, value);
}
