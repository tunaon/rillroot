import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import type {
  ApiErrorBody,
  AuthorizeConnectionRequest,
  CompleteConnectionRequest,
} from '@rillroot/shared';
import { ConnectionAttempts } from '../attempts';
import {
  type ChannelConnector,
  type CompletedConnection,
  ConnectionFailedError,
} from '../connector';
import {
  OAuthHttpError,
  createPkce,
  getJson,
  postForm,
  randomState,
} from '../oauth2';
import { type MastodonApp, MastodonApps } from './mastodon.apps';
import { MASTODON_CHANNEL, MASTODON_SCOPES } from './mastodon.constants';
import { type MastodonAccount, MastodonStore } from './mastodon.store';

/**
 * 진행 중 시도에 남기는 값.
 *
 * @property {string} server 창작자가 고른 서버. 복귀 값에는 서버가 없으므로 여기서 읽는다
 * @property {string} verifier 코드 교환 때 보낼 PKCE verifier
 * @property {string | null} return_to 연동이 끝난 뒤 돌아갈 경로
 */
type AttemptPayload = {
  server: string;
  verifier: string;
  return_to: string | null;
};

/** 코드 교환 응답 중 쓰는 값. */
interface TokenResponse {
  access_token: string;
  scope: string;
}

/** 서버 정보 중 쓰는 값. 글자 한도는 서버마다 다르다. */
interface InstanceResponse {
  configuration?: { statuses?: { max_characters?: unknown } };
}

/**
 * Mastodon 연동. 공식 클라이언트가 없으므로 state·PKCE·코드 교환을 직접 한다.
 * 서버마다 앱을 등록해야 하는 일은 MastodonApps 가, 행과 비밀은 MastodonStore 가 맡는다.
 */
@Injectable()
export class MastodonConnector implements ChannelConnector {
  readonly channel = MASTODON_CHANNEL;

  private readonly logger = new Logger(MastodonConnector.name);

  constructor(
    private readonly apps: MastodonApps,
    private readonly store: MastodonStore,
    private readonly attempts: ConnectionAttempts
  ) {}

  /**
   * 창작자가 고른 서버의 동의 화면 주소를 만든다. 그 서버의 앱을 확인하거나 등록한 뒤
   * state 와 PKCE 를 만들어 시도로 남긴다.
   * 서버를 받지 않았으면 기존 연동의 서버를 쓴다. 권한이 끊긴 연동을 다시 잇는 경우다.
   *
   * @throws {BadRequestException} 서버를 받지 못했고 기존 연동도 없는 경우, 또는 서버에 닿지 못했거나
   *   Mastodon 서버가 아닌 경우
   */
  async authorize(
    profileId: string,
    request: AuthorizeConnectionRequest
  ): Promise<URL> {
    const server = request.server ?? (await this.store.serverOf(profileId));
    if (!server) {
      throw new BadRequestException({
        code: 'server_required',
        message: 'server is required',
      } satisfies ApiErrorBody);
    }

    let app: MastodonApp;
    try {
      app = await this.apps.ensure(server);
    } catch (error) {
      // 창작자가 주소를 고쳐 다시 시도할 수 있는 실패라 400 이다. 보관 실패 같은 다른 오류는 그대로 올린다.
      if (error instanceof OAuthHttpError) {
        this.logger.warn(`app setup failed for ${server}: ${error.message}`);
        throw new BadRequestException(
          {
            code: 'server_unreachable',
            message: `${server} is unreachable or is not a Mastodon server`,
          } satisfies ApiErrorBody,
          { cause: error }
        );
      }
      throw error;
    }

    const state = randomState();
    const { verifier, challenge } = createPkce();

    await this.attempts.create(state, profileId, MASTODON_CHANNEL, {
      server,
      verifier,
      return_to: request.return_to ?? null,
    });

    const url = new URL('/oauth/authorize', `https://${server}`);
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('client_id', app.clientId);
    url.searchParams.set('redirect_uri', this.apps.redirectUri);
    url.searchParams.set('scope', MASTODON_SCOPES);
    url.searchParams.set('state', state);
    url.searchParams.set('code_challenge', challenge);
    url.searchParams.set('code_challenge_method', 'S256');
    return url;
  }

  /**
   * 코드를 토큰으로 바꾸고 계정을 읽어 연동 행을 만든다.
   * 시도는 읽자마자 지운다. 코드는 한 번만 쓸 수 있어 실패해도 다시 시도할 수 없다.
   * 저장이 실패하면 방금 받은 토큰을 서버에서 회수해 쓰이지 않는 토큰을 남기지 않는다.
   */
  async complete(
    profileId: string,
    params: CompleteConnectionRequest
  ): Promise<CompletedConnection> {
    const attempt = await this.attempts.read<AttemptPayload>(
      params.state,
      MASTODON_CHANNEL
    );
    if (!attempt) {
      throw new ConnectionFailedError('unknown or expired state', null);
    }

    await this.attempts.delete(params.state);
    const returnTo = attempt.return_to;

    if (params.error) {
      throw new ConnectionFailedError(
        params.error_description ?? params.error,
        returnTo
      );
    }

    if (!params.code) {
      throw new ConnectionFailedError(
        'authorization code is missing',
        returnTo
      );
    }

    try {
      const app = await this.apps.find(attempt.server);
      if (!app) {
        throw new Error(`app for ${attempt.server} is not registered`);
      }

      const base = `https://${attempt.server}`;
      const token = await postForm<TokenResponse>(
        new URL('/oauth/token', base),
        {
          grant_type: 'authorization_code',
          code: params.code,
          client_id: app.clientId,
          client_secret: app.clientSecret,
          redirect_uri: this.apps.redirectUri,
          code_verifier: attempt.verifier,
          scope: MASTODON_SCOPES,
        }
      );

      const account = await getJson<MastodonAccount>(
        new URL('/api/v1/accounts/verify_credentials', base),
        token.access_token
      );
      const maxCharacters = await this.fetchMaxCharacters(
        base,
        token.access_token
      );

      try {
        const connectionId = await this.store.save(
          profileId,
          attempt.server,
          account,
          { access_token: token.access_token, scope: token.scope },
          maxCharacters
        );
        return { connectionId, returnTo };
      } catch (error) {
        await this.revokeToken(attempt.server, app, token.access_token).catch(
          (revokeError: unknown) => {
            this.logger.warn(
              `token revoke after failed save: ${String(revokeError)}`
            );
          }
        );
        throw error;
      }
    } catch (error) {
      throw new ConnectionFailedError(
        error instanceof Error ? error.message : String(error),
        returnTo,
        { cause: error }
      );
    }
  }

  /**
   * 서버에 토큰 회수를 요청한다. 행이나 앱이 이미 없으면 할 일이 없다.
   */
  async revoke(externalId: string): Promise<void> {
    const found = await this.store.credentials(externalId);
    if (!found) {
      return;
    }

    const app = await this.apps.find(found.server);
    if (!app) {
      return;
    }

    await this.revokeToken(found.server, app, found.token);
  }

  private async revokeToken(
    server: string,
    app: MastodonApp,
    token: string
  ): Promise<void> {
    await postForm(new URL('/oauth/revoke', `https://${server}`), {
      client_id: app.clientId,
      client_secret: app.clientSecret,
      token,
    });
  }

  /**
   * 서버의 글자 한도를 읽는다. 표시와 계획에 쓰는 값이라 실패해도 연동을 막지 않는다.
   *
   * @param base 서버 주소
   * @param token 접근 토큰. 공개 조회를 막은 서버에서도 읽히게 한다
   * @returns 글자 한도. 읽지 못했으면 null
   */
  private async fetchMaxCharacters(
    base: string,
    token: string
  ): Promise<number | null> {
    try {
      const instance = await getJson<InstanceResponse>(
        new URL('/api/v2/instance', base),
        token
      );
      const limit = instance.configuration?.statuses?.max_characters;
      return typeof limit === 'number' ? limit : null;
    } catch (error) {
      this.logger.warn(`instance lookup failed for ${base}: ${String(error)}`);
      return null;
    }
  }
}
