import { Injectable, Logger } from '@nestjs/common';
import type { Json } from '@rillroot/supabase';
import type {
  NodeSavedSession,
  NodeSavedSessionStore,
  NodeSavedState,
  NodeSavedStateStore,
} from '@atproto/oauth-client-node';
import { SupabaseService } from '../../supabase/supabase.service';
import { ConnectionContext } from '../connection-context';
import { BLUESKY_CHANNEL } from './bluesky.constants';

/** 진행 중 시도의 수명. 라이브러리 권장값이다. */
const ATTEMPT_TTL_MS = 60 * 60 * 1000;

/** 핸들을 읽을 공개 AppView. 인증도 추가 권한도 필요 없다. */
const PUBLIC_API = 'https://public.api.bsky.app';
const PROFILE_TIMEOUT_MS = 3000;

/**
 * Bluesky OAuth 라이브러리가 요구하는 저장소 두 개를 우리 테이블과 Vault 함수 위에 만든다.
 *
 * - stateStore: 인가 요청마다 하나. state 를 열쇠로 PKCE verifier 와 임시 DPoP 키를 둔다.
 *   `connection_attempts` 에 저장하고 한 시간 뒤 버린다.
 * - sessionStore: 계정(DID)마다 하나. 접근·갱신 토큰과 DPoP 키를 둔다.
 *   `social_connections` 행 하나에 Vault 비밀 하나로 저장한다.
 *
 * 라이브러리는 열쇠(state, DID)만 넘기고 사용자를 넘기지 않으므로 ConnectionContext 에서 사용자를 읽는다.
 * 컨텍스트가 없으면 토큰 갱신 경로다.
 */
@Injectable()
export class BlueskyStores {
  private readonly logger = new Logger(BlueskyStores.name);

  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly context: ConnectionContext
  ) {}

  readonly stateStore: NodeSavedStateStore = {
    set: (state, data) => this.setState(state, data),
    get: (state) => this.getState(state),
    del: (state) => this.delState(state),
  };

  readonly sessionStore: NodeSavedSessionStore = {
    set: (did, session) => this.setSession(did, session),
    get: (did) => this.getSession(did),
    del: (did) => this.delSession(did),
  };

  /**
   * 인가 요청의 진행 중 상태를 남긴다. 만료된 다른 시도는 이때 함께 지운다.
   *
   * @param state 인가 요청의 state
   * @param data 복귀 때 필요한 값
   * @throws {Error} 컨텍스트가 없어 누구의 시도인지 알 수 없는 경우
   */
  private async setState(state: string, data: NodeSavedState): Promise<void> {
    const scope = this.context.current();
    if (!scope) {
      throw new Error('connection context is required to start authorization');
    }

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
      profile_id: scope.profileId,
      channel: BLUESKY_CHANNEL,
      payload: data as unknown as Json,
      expires_at: new Date(now.getTime() + ATTEMPT_TTL_MS).toISOString(),
    });

    if (error) {
      throw new Error(error.message);
    }
  }

  /**
   * 만료되지 않은 진행 중 상태를 읽는다.
   *
   * @param state 인가 요청의 state
   * @returns 저장한 값. 없거나 만료되었으면 undefined
   */
  private async getState(state: string): Promise<NodeSavedState | undefined> {
    const { data, error } = await this.supabaseService
      .getClient()
      .from('connection_attempts')
      .select('payload')
      .eq('state', state)
      .eq('channel', BLUESKY_CHANNEL)
      .gt('expires_at', new Date().toISOString())
      .maybeSingle();

    if (error) {
      throw new Error(error.message);
    }

    return (data as { payload: NodeSavedState } | null)?.payload;
  }

  private async delState(state: string): Promise<void> {
    const { error } = await this.supabaseService
      .getClient()
      .from('connection_attempts')
      .delete()
      .eq('state', state);

    if (error) {
      throw new Error(error.message);
    }
  }

  /**
   * 세션을 저장한다.
   * 컨텍스트가 있으면 연동을 만드는 중이라 행을 만들거나 갱신하고 행 id 를 컨텍스트에 남긴다.
   * 없으면 토큰 갱신이라 비밀만 바꾼다.
   *
   * @param did 계정 식별자
   * @param session 토큰과 DPoP 키
   * @throws {Error} 갱신인데 행이 없거나 저장에 실패한 경우
   */
  private async setSession(
    did: string,
    session: NodeSavedSession
  ): Promise<void> {
    const client = this.supabaseService.getClient();
    const secret = JSON.stringify(session);
    const scope = this.context.current();

    if (scope) {
      const { data, error } = await client.rpc('upsert_social_connection', {
        p_profile_id: scope.profileId,
        p_channel: BLUESKY_CHANNEL,
        p_external_id: did,
        p_account_name: await this.fetchAccountName(did),
        p_secret: secret,
      });

      if (error) {
        throw new Error(error.message);
      }

      scope.connectionId = data as string;
      return;
    }

    const id = await this.findConnectionId(did);
    if (!id) {
      throw new Error(`no connection for ${did}`);
    }

    const { data, error } = await client.rpc('update_connection_secret', {
      p_connection_id: id,
      p_secret: secret,
    });

    if (error) {
      throw new Error(error.message);
    }

    if (data !== true) {
      throw new Error(`no connection for ${did}`);
    }
  }

  /**
   * 세션을 읽는다.
   * 컨텍스트가 있으면 그 사용자의 행만 본다. 같은 계정을 다른 사용자가 연결하려 할 때
   * 라이브러리가 기존 세션을 먼저 취소하는데, 남의 세션이 잡히면 그 사람의 연동이 끊긴다.
   * 권한이 끊긴 것으로 표시된 행은 없는 것으로 다뤄 죽은 토큰으로 재시도하지 않게 한다.
   *
   * @param did 계정 식별자
   * @returns 저장한 세션. 없거나 끊겼으면 undefined
   */
  private async getSession(did: string): Promise<NodeSavedSession | undefined> {
    const client = this.supabaseService.getClient();
    const scope = this.context.current();

    let query = client
      .from('social_connections')
      .select('id, invalidated_at')
      .eq('channel', BLUESKY_CHANNEL)
      .eq('external_id', did);

    if (scope) {
      query = query.eq('profile_id', scope.profileId);
    }

    const { data, error } = await query.maybeSingle();

    if (error) {
      throw new Error(error.message);
    }

    const row = data as { id: string; invalidated_at: string | null } | null;
    if (!row || row.invalidated_at !== null) {
      return undefined;
    }

    const { data: secret, error: secretError } = await client.rpc(
      'read_connection_secret',
      { p_connection_id: row.id }
    );

    if (secretError) {
      throw new Error(secretError.message);
    }

    if (typeof secret !== 'string') {
      return undefined;
    }

    return JSON.parse(secret) as NodeSavedSession;
  }

  /**
   * 세션을 버린다. 행은 지우지 않고 권한이 끊긴 것으로 표시해 재연동이 필요함을 보이게 한다.
   * 컨텍스트가 있으면 그 사용자의 행만 표시한다. 연동 실패로 라이브러리가 되돌리는 경우
   * 그 계정의 행이 남의 것일 수 있기 때문이다.
   *
   * @param did 계정 식별자
   */
  private async delSession(did: string): Promise<void> {
    const scope = this.context.current();
    const id = await this.findConnectionId(did, scope?.profileId);
    if (!id) {
      return;
    }

    const { error } = await this.supabaseService
      .getClient()
      .rpc('mark_connection_invalid', {
        p_connection_id: id,
        ...(scope && { p_profile_id: scope.profileId }),
      });

    if (error) {
      throw new Error(error.message);
    }
  }

  private async findConnectionId(
    did: string,
    profileId?: string
  ): Promise<string | undefined> {
    let query = this.supabaseService
      .getClient()
      .from('social_connections')
      .select('id')
      .eq('channel', BLUESKY_CHANNEL)
      .eq('external_id', did);

    if (profileId) {
      query = query.eq('profile_id', profileId);
    }

    const { data, error } = await query.maybeSingle();

    if (error) {
      throw new Error(error.message);
    }

    return (data as { id: string } | null)?.id;
  }

  /**
   * 표시용 핸들을 읽는다. 실패하면 DID 를 그대로 쓴다. 표시용 값 때문에 연동을 막지 않는다.
   *
   * @param did 계정 식별자
   * @returns 핸들 또는 DID
   */
  private async fetchAccountName(did: string): Promise<string> {
    try {
      const url = new URL('/xrpc/app.bsky.actor.getProfile', PUBLIC_API);
      url.searchParams.set('actor', did);

      const response = await fetch(url, {
        signal: AbortSignal.timeout(PROFILE_TIMEOUT_MS),
      });

      if (!response.ok) {
        return did;
      }

      const profile = (await response.json()) as { handle?: unknown };
      return typeof profile.handle === 'string' && profile.handle
        ? profile.handle
        : did;
    } catch (error) {
      this.logger.warn(`profile lookup failed for ${did}: ${String(error)}`);
      return did;
    }
  }
}
