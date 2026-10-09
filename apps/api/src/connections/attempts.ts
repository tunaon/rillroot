import { Injectable, Logger } from '@nestjs/common';
import type { Channel } from '@rillroot/shared';
import type { Json } from '@rillroot/supabase';
import { SupabaseService } from '../supabase/supabase.service';

/** 진행 중 시도의 수명. Bluesky 라이브러리의 권장값이며 모든 채널이 같은 값을 쓴다. */
const ATTEMPT_TTL_MS = 60 * 60 * 1000;

/**
 * 연동 진행 중 시도. 인가 요청을 보낼 때 state 를 열쇠로 복귀 때 필요한 값을 남기고, 복귀하면 지운다.
 * `connection_attempts` 테이블 위에 있고 모든 채널의 커넥터가 같은 통로를 쓴다.
 * payload 의 모양은 채널마다 다르므로 저장하는 쪽이 타입을 정한다.
 */
@Injectable()
export class ConnectionAttempts {
  private readonly logger = new Logger(ConnectionAttempts.name);

  constructor(private readonly supabaseService: SupabaseService) {}

  /**
   * 시도를 남긴다. 만료된 다른 시도는 이때 함께 지워, 돌아오지 않은 시도가 쌓이지 않게 한다.
   *
   * @param state 인가 요청의 state
   * @param profileId 시도를 시작한 사용자 id
   * @param channel 채널 키
   * @param payload 복귀 때 필요한 값
   * @throws {Error} 저장에 실패한 경우
   */
  async create(
    state: string,
    profileId: string,
    channel: Channel,
    payload: Json
  ): Promise<void> {
    const client = this.supabaseService.getClient();
    const now = new Date();

    const { error: cleanupError } = await client
      .from('connection_attempts')
      .delete()
      .lt('expires_at', now.toISOString());

    if (cleanupError) {
      this.logger.warn(`attempt cleanup failed: ${cleanupError.message}`);
    }

    const { error } = await client.from('connection_attempts').insert({
      state,
      profile_id: profileId,
      channel,
      payload,
      expires_at: new Date(now.getTime() + ATTEMPT_TTL_MS).toISOString(),
    });

    if (error) {
      throw new Error(error.message);
    }
  }

  /**
   * 만료되지 않은 시도의 값을 읽는다.
   *
   * @param state 인가 요청의 state
   * @param channel 채널 키. 다른 채널의 시도는 읽지 않는다
   * @returns 저장한 값. 없거나 만료되었으면 undefined
   * @throws {Error} 조회에 실패한 경우
   */
  async read<T>(state: string, channel: Channel): Promise<T | undefined> {
    const { data, error } = await this.supabaseService
      .getClient()
      .from('connection_attempts')
      .select('payload')
      .eq('state', state)
      .eq('channel', channel)
      .gt('expires_at', new Date().toISOString())
      .maybeSingle();

    if (error) {
      throw new Error(error.message);
    }

    return (data as { payload: T } | null)?.payload;
  }

  /**
   * 시도를 지운다. 인가 코드는 한 번만 쓸 수 있으므로 교환이 실패해도 시도는 버린다.
   *
   * @param state 인가 요청의 state
   * @throws {Error} 삭제에 실패한 경우
   */
  async delete(state: string): Promise<void> {
    const { error } = await this.supabaseService
      .getClient()
      .from('connection_attempts')
      .delete()
      .eq('state', state);

    if (error) {
      throw new Error(error.message);
    }
  }
}
