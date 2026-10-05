import { Injectable } from '@nestjs/common';
import { AsyncLocalStorage } from 'node:async_hooks';

/**
 * 연동을 시작하거나 끝내는 한 번의 요청 동안만 존재하는 값.
 *
 * @property {string} profileId 연동을 시작한(끝내는) 사용자 id. 저장소가 행의 주인을 정하는 데 쓴다.
 * @property {string} [connectionId] 저장소가 연동 행을 만들거나 갱신한 뒤 채우는 그 행의 id.
 *   커넥터가 완료 응답을 만들 때 읽는다.
 */
export interface ConnectionScope {
  profileId: string;
  connectionId?: string;
}

/**
 * 요청 범위의 사용자 컨텍스트.
 *
 * 채널 라이브러리는 우리에게 저장소(state 저장소, 세션 저장소) 두 개만 요구하고,
 * 그 저장소 메서드에는 state 나 외부 계정 식별자만 넘긴다. 누구의 연동인지는 넘기지 않는다.
 * 그래서 인가 시작과 완료 호출을 이 컨텍스트로 감싸, 안에서 불리는 저장소가 사용자를 알 수 있게 한다.
 * Node 의 AsyncLocalStorage 라 같은 비동기 흐름 안에서만 보이고, 요청끼리 섞이지 않는다.
 *
 * 토큰 갱신처럼 사용자 요청 없이 도는 경로에는 컨텍스트가 없다. 저장소는 그때 다른 조회 경로를 쓴다.
 */
@Injectable()
export class ConnectionContext {
  private readonly storage = new AsyncLocalStorage<ConnectionScope>();

  /**
   * fn 이 도는 동안 컨텍스트를 둔다. fn 안에서 불리는 모든 비동기 코드가 current() 로 읽을 수 있다.
   *
   * @param profileId 연동의 주인이 될 사용자 id
   * @param fn 컨텍스트 안에서 실행할 작업
   * @returns fn 의 결과
   */
  run<T>(profileId: string, fn: () => Promise<T>): Promise<T> {
    return this.storage.run({ profileId }, fn);
  }

  /**
   * 현재 흐름의 컨텍스트.
   *
   * @returns run 안이면 그 값, 밖이면 undefined
   */
  current(): ConnectionScope | undefined {
    return this.storage.getStore();
  }
}
