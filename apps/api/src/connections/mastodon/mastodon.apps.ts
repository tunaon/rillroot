import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Env } from '../../config/env.schema';
import { SupabaseService } from '../../supabase/supabase.service';
import { OAuthHttpError, postForm } from '../oauth2';
import {
  MASTODON_APP_NAME,
  MASTODON_CHANNEL,
  MASTODON_SCOPES,
} from './mastodon.constants';

/**
 * 한 서버에 등록된 우리 앱.
 *
 * @property {string} id channel_app_credentials 행 id
 * @property {string} clientId 서버가 준 클라이언트 식별자
 * @property {string} clientSecret 서버가 준 비밀. Vault 에서 읽는다
 */
export interface MastodonApp {
  id: string;
  clientId: string;
  clientSecret: string;
}

/** 앱 토큰을 받을 때 요청하는 범위. 등록한 범위 안에 있어야 하므로 그중 하나를 쓴다. */
const APP_TOKEN_SCOPE = 'read:accounts';

/**
 * 서버마다 등록해야 하는 Mastodon 앱의 등록·확인·보관.
 *
 * 등록은 인증 없이 되고 서버가 클라이언트 식별자와 비밀을 준다. 그 둘을 `channel_app_credentials` 에
 * 보관해 그 서버의 다음 창작자부터는 등록 없이 쓴다. 보관한 앱이 서버에서 사라졌을 수 있으므로
 * 쓰기 전에 살아 있는지 확인하고, 죽었으면 지우고 다시 등록한다. 죽은 앱으로 동의 화면에 보내면
 * 서버가 우리에게 돌려보내지 않고 자기 오류 화면을 그려 창작자가 거기 갇힌다.
 */
@Injectable()
export class MastodonApps {
  private readonly logger = new Logger(MastodonApps.name);

  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly config: ConfigService<Env, true>
  ) {}

  /** 서버에 등록하는 복귀 주소. 코드를 교환할 때도 같은 값을 보내야 한다. */
  get redirectUri(): string {
    const publicUrl = this.config.getOrThrow<string>('API_PUBLIC_URL');
    return `${publicUrl}/connections/${MASTODON_CHANNEL}/callback`;
  }

  /**
   * 이 서버에서 쓸 앱. 보관한 것이 살아 있으면 그대로 쓰고, 죽었거나 없으면 등록한다.
   * 등록 직후에는 앱 토큰을 한 번 받아 둔다. 토큰이 없는 앱을 지우는 서버 버전이 있다.
   *
   * @param server 서버 호스트 이름
   * @returns 살아 있는 앱
   * @throws {OAuthHttpError} 서버가 등록이나 토큰 발급을 거부한 경우
   * @throws {Error} 서버에 닿지 못했거나 보관에 실패한 경우
   */
  async ensure(server: string): Promise<MastodonApp> {
    const stored = await this.find(server);
    if (stored) {
      if (await this.alive(server, stored)) {
        return stored;
      }

      this.logger.warn(`stored app for ${server} is gone, registering again`);
      await this.remove(stored.id);
    }

    const app = await this.register(server);
    await this.alive(server, app);
    return app;
  }

  /**
   * 보관한 앱을 읽는다. 연동을 끝내거나 끊을 때 쓴다.
   *
   * @param server 서버 호스트 이름
   * @returns 보관한 앱. 없으면 null
   * @throws {Error} 조회에 실패한 경우
   */
  async find(server: string): Promise<MastodonApp | null> {
    const client = this.supabaseService.getClient();

    const { data, error } = await client
      .from('channel_app_credentials')
      .select('id, client_id')
      .eq('channel', MASTODON_CHANNEL)
      .eq('server', server)
      .maybeSingle();

    if (error) {
      throw new Error(error.message);
    }

    const row = data as { id: string; client_id: string } | null;
    if (!row) {
      return null;
    }

    const { data: secret, error: secretError } = await client.rpc(
      'read_channel_app_secret',
      { p_credential_id: row.id }
    );

    if (secretError) {
      throw new Error(secretError.message);
    }

    if (typeof secret !== 'string') {
      return null;
    }

    return { id: row.id, clientId: row.client_id, clientSecret: secret };
  }

  /**
   * 앱이 서버에 아직 있는지 앱 토큰을 받아 확인한다. 받아지면 살아 있는 것이다.
   *
   * @param server 서버 호스트 이름
   * @param app 확인할 앱
   * @returns 서버가 앱을 모르면 false
   * @throws {OAuthHttpError} 서버가 다른 이유로 거부한 경우
   */
  private async alive(server: string, app: MastodonApp): Promise<boolean> {
    try {
      await postForm(new URL('/oauth/token', `https://${server}`), {
        grant_type: 'client_credentials',
        client_id: app.clientId,
        client_secret: app.clientSecret,
        scope: APP_TOKEN_SCOPE,
      });
      return true;
    } catch (error) {
      if (error instanceof OAuthHttpError && error.status === 401) {
        return false;
      }
      throw error;
    }
  }

  /**
   * 서버에 앱을 등록하고 보관한다. 복귀 주소는 배열이 아니라 문자열 하나로 보낸다.
   * 배열은 새 서버 버전만 받는다.
   *
   * @param server 서버 호스트 이름
   * @returns 등록한 앱
   * @throws {OAuthHttpError} 서버가 등록을 거부한 경우
   * @throws {Error} 보관에 실패한 경우
   */
  private async register(server: string): Promise<MastodonApp> {
    const created = await postForm<{
      client_id: string;
      client_secret: string;
    }>(new URL('/api/v1/apps', `https://${server}`), {
      client_name: MASTODON_APP_NAME,
      redirect_uris: this.redirectUri,
      scopes: MASTODON_SCOPES,
      website: this.config.getOrThrow<string>('CORS_ORIGIN'),
    });

    const { data, error } = await this.supabaseService
      .getClient()
      .rpc('upsert_channel_app_credential', {
        p_channel: MASTODON_CHANNEL,
        p_server: server,
        p_client_id: created.client_id,
        p_secret: created.client_secret,
        p_scopes: MASTODON_SCOPES,
      });

    if (error) {
      throw new Error(error.message);
    }

    return {
      id: data as string,
      clientId: created.client_id,
      clientSecret: created.client_secret,
    };
  }

  /**
   * 보관한 앱을 지운다. 행이 지워지면 트리거가 Vault 의 비밀을 함께 지운다.
   *
   * @param id channel_app_credentials 행 id
   * @throws {Error} 삭제에 실패한 경우
   */
  private async remove(id: string): Promise<void> {
    const { error } = await this.supabaseService
      .getClient()
      .from('channel_app_credentials')
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(error.message);
    }
  }
}
