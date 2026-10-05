import type { Channel, CompleteConnectionRequest } from '@rillroot/shared';

/**
 * 연동 완료 결과.
 *
 * @property {string} connectionId 만들어지거나 갱신된 연동 행의 id
 * @property {string | null} returnTo 연동을 시작할 때 받은 돌아갈 경로. 받지 않았으면 null
 */
export interface CompletedConnection {
  connectionId: string;
  returnTo: string | null;
}

/**
 * 채널이 거부했거나 토큰 교환·저장이 실패했을 때 커넥터가 던지는 오류.
 * 실패해도 창작자는 연동을 시작한 화면으로 돌아가야 하므로 돌아갈 경로를 함께 싣는다.
 */
export class ConnectionFailedError extends Error {
  /**
   * @param message 실패 사유
   * @param returnTo 연동을 시작할 때 받은 돌아갈 경로. 알 수 없으면 null
   * @param options 원인 오류
   */
  constructor(
    message: string,
    readonly returnTo: string | null,
    options?: ErrorOptions
  ) {
    super(message, options);
    this.name = 'ConnectionFailedError';
  }
}

/**
 * 채널 하나의 연동 절차. 채널마다 구현체가 하나씩 있고 ConnectionsService 가 채널 키로 고른다.
 *
 * 커넥터는 채널과 이야기하는 쪽이고, DB 행과 Vault 비밀을 쓰는 것은 저장소다.
 * 그래서 커넥터는 행의 모양을 모르고 "인가 주소 만들기 → 복귀 값으로 토큰 교환 → 채널 쪽 취소"만 안다.
 */
export interface ChannelConnector {
  /** 이 커넥터가 맡는 채널 키. social_connections.channel 과 같은 값이다. */
  readonly channel: Channel;

  /**
   * 채널의 인가 주소를 만든다. 진행 중 상태(state)와 돌아갈 경로는 이 안에서 저장소에 남는다.
   *
   * @param profileId 연동을 시작하는 사용자 id
   * @param returnTo 연동이 끝난 뒤 돌아갈 내부 경로. 없으면 null
   * @returns 같은 탭을 보낼 인가 주소
   */
  authorize(profileId: string, returnTo: string | null): Promise<URL>;

  /**
   * 채널이 복귀 주소에 붙여 보낸 값으로 토큰을 교환하고 저장소를 통해 연동 행을 만든다.
   *
   * @param profileId 연동을 끝내는 사용자 id. 시도를 시작한 사용자와 같아야 한다.
   * @param params 채널이 돌려보낸 값(state, code, iss, error)
   * @returns 연동 행의 id 와 돌아갈 경로
   * @throws {ConnectionFailedError} 채널이 거부했거나 교환·저장이 실패한 경우
   */
  complete(
    profileId: string,
    params: CompleteConnectionRequest
  ): Promise<CompletedConnection>;

  /**
   * 채널 쪽에서 세션을 취소한다. 연동을 끊을 때 부른다. 실패해도 행 삭제는 진행한다.
   *
   * @param externalId 채널 쪽 계정 식별자
   */
  revoke(externalId: string): Promise<void>;
}

/** 등록된 커넥터 목록을 주입받는 토큰. 채널을 늘릴 때 이 목록에 구현체를 더한다. */
export const CHANNEL_CONNECTORS = Symbol('CHANNEL_CONNECTORS');

/** 다른 사용자에게 이미 묶인 외부 계정을 연결하려 할 때 DB 함수가 던지는 메시지. */
export const CONNECTION_TAKEN = 'connection_taken';
