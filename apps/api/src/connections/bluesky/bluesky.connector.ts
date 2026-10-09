import { Injectable, type OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type {
  AuthorizeConnectionRequest,
  CompleteConnectionRequest,
} from '@rillroot/shared';
import {
  JoseKey,
  NodeOAuthClient,
  OAuthCallbackError,
  type OAuthClientMetadataInput,
  atprotoLoopbackClientMetadata,
  buildAtprotoLoopbackClientId,
  requestLocalLock,
} from '@atproto/oauth-client-node';
import type { Env } from '../../config/env.schema';
import { ConnectionContext } from '../connection-context';
import {
  type ChannelConnector,
  type CompletedConnection,
  ConnectionFailedError,
} from '../connector';
import { BLUESKY_CHANNEL, BLUESKY_SCOPE } from './bluesky.constants';
import { BlueskyStores } from './bluesky.stores';

/**
 * 핸들을 묻지 않으므로 인가 서버로 바로 보낸다. 대다수 계정이 여기 있다.
 * 다른 서버의 계정은 핸들 입력이 생길 때 그 핸들로 서버를 찾는다.
 */
const ENTRYWAY = 'https://bsky.social';

/**
 * Bluesky 연동. 공식 라이브러리가 PAR·PKCE·DPoP·토큰 갱신을 맡고, 여기서는
 * 클라이언트 메타데이터를 만들고 저장소를 잇고 사용자 컨텍스트를 씌운다.
 *
 * 메타데이터는 공개 주소가 https 인지에 따라 둘 중 하나다.
 * - https: 비밀 클라이언트. client_id 는 우리가 서빙하는 메타데이터 주소이고 서명 키로 인증한다.
 * - http: 루프백 개발 클라이언트. client_id 가 `http://localhost` 이고 키 없이 공개 클라이언트로 동작한다.
 */
@Injectable()
export class BlueskyConnector implements ChannelConnector, OnModuleInit {
  readonly channel = BLUESKY_CHANNEL;

  private client!: NodeOAuthClient;

  constructor(
    private readonly config: ConfigService<Env, true>,
    private readonly stores: BlueskyStores,
    private readonly context: ConnectionContext
  ) {}

  async onModuleInit(): Promise<void> {
    const publicUrl = this.config.getOrThrow<string>('API_PUBLIC_URL');
    const redirectUri = `${publicUrl}/connections/${BLUESKY_CHANNEL}/callback`;
    const secure = publicUrl.startsWith('https://');

    const clientMetadata: OAuthClientMetadataInput = secure
      ? this.confidentialMetadata(publicUrl as `https://${string}`, redirectUri)
      : atprotoLoopbackClientMetadata(
          buildAtprotoLoopbackClientId({
            scope: BLUESKY_SCOPE,
            redirect_uris: [redirectUri],
          })
        );

    const keyset = secure
      ? [
          await JoseKey.fromImportable(
            this.config.getOrThrow<string>('BLUESKY_OAUTH_PRIVATE_KEY')
          ),
        ]
      : undefined;

    this.client = new NodeOAuthClient({
      clientMetadata,
      keyset,
      stateStore: this.stores.stateStore,
      sessionStore: this.stores.sessionStore,
      // 갱신 토큰이 1회용이라 같은 계정의 동시 갱신을 직렬화한다. 프로세스 안에서만 유효하므로
      // 인스턴스를 늘리면 공유 잠금으로 바꾼다.
      requestLock: requestLocalLock,
    });
  }

  /** 인가 서버가 주기적으로 읽어 가는 클라이언트 메타데이터. */
  get clientMetadata(): NodeOAuthClient['clientMetadata'] {
    return this.client.clientMetadata;
  }

  /** 인가 서버가 클라이언트 인증 JWT 를 검증할 때 읽어 가는 공개 키 목록. */
  get jwks(): NodeOAuthClient['jwks'] {
    return this.client.jwks;
  }

  /**
   * 돌아갈 경로는 라이브러리의 state 옵션에 싣는다. 이 옵션은 OAuth state 가 아니라 앱 상태라서,
   * 라이브러리가 진행 중 상태와 함께 보관했다가 완료할 때 돌려주고 실패해도 오류에 담아 준다.
   */
  async authorize(
    profileId: string,
    request: AuthorizeConnectionRequest
  ): Promise<URL> {
    return this.context.run(profileId, () =>
      this.client.authorize(ENTRYWAY, {
        scope: BLUESKY_SCOPE,
        state: request.return_to,
      })
    );
  }

  async complete(
    profileId: string,
    params: CompleteConnectionRequest
  ): Promise<CompletedConnection> {
    const search = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (typeof value === 'string') search.set(key, value);
    }

    return this.context.run(profileId, async () => {
      const { state: returnTo } = await this.client
        .callback(search)
        .catch((error: unknown) => {
          throw new ConnectionFailedError(
            error instanceof Error ? error.message : String(error),
            error instanceof OAuthCallbackError ? (error.state ?? null) : null,
            { cause: error }
          );
        });

      const connectionId = this.context.current()?.connectionId;
      if (!connectionId) {
        throw new ConnectionFailedError('session was not stored', returnTo);
      }

      return { connectionId, returnTo };
    });
  }

  async revoke(externalId: string): Promise<void> {
    const session = await this.client.restore(externalId, false);
    await session.signOut();
  }

  /**
   * 비밀 클라이언트의 메타데이터. client_uri 는 두지 않는다. 넣으면 client_id 와 같은 호스트여야 하는데
   * client_id 는 API 도메인이고 서비스 주소는 웹 도메인이다.
   *
   * @param origin https 로 시작하는 API 공개 주소
   * @param redirectUri 채널이 돌아올 우리 주소
   * @returns 라이브러리에 넘길 메타데이터
   */
  private confidentialMetadata(
    origin: `https://${string}`,
    redirectUri: string
  ): OAuthClientMetadataInput {
    return {
      client_id: `${origin}/oauth/${BLUESKY_CHANNEL}/client-metadata.json`,
      client_name: 'Rillroot',
      redirect_uris: [redirectUri],
      scope: BLUESKY_SCOPE,
      grant_types: ['authorization_code', 'refresh_token'],
      response_types: ['code'],
      application_type: 'web',
      token_endpoint_auth_method: 'private_key_jwt',
      token_endpoint_auth_signing_alg: 'ES256',
      dpop_bound_access_tokens: true,
      jwks_uri: `${origin}/oauth/${BLUESKY_CHANNEL}/jwks.json`,
    };
  }
}
