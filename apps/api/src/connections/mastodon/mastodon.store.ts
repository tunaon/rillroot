import { Injectable } from '@nestjs/common';
import type { Json } from '@rillroot/supabase';
import { SupabaseService } from '../../supabase/supabase.service';
import { MASTODON_CHANNEL } from './mastodon.constants';

/**
 * 서버가 알려 준 창작자 계정 중 연동 행에 쓰는 값.
 *
 * @property {string} id 서버 안에서만 유일한 계정 식별자
 * @property {string} username 서버 안의 사용자 이름. 표시용이다
 */
export interface MastodonAccount {
  id: string;
  username: string;
}

/**
 * Vault 에 두는 자격 증명.
 *
 * @property {string} access_token 만료되지 않는 접근 토큰
 * @property {string} scope 서버가 실제로 허락한 권한 범위
 */
export interface MastodonSecret {
  access_token: string;
  scope: string;
}

/**
 * 연동 행의 설정. 발행할 때 서버와 한도를 여기서 읽는다.
 *
 * @property {string} server 계정이 있는 서버 호스트 이름
 * @property {number | null} max_characters 서버의 글자 한도. 연동할 때 읽지 못했으면 null
 */
export interface MastodonConfig {
  server: string;
  max_characters: number | null;
}

/**
 * 외부 계정 식별자. 계정 id 는 서버 안에서만 유일하므로 서버를 붙여야 (channel, external_id) 가 유일하다.
 *
 * @param server 서버 호스트 이름
 * @param accountId 서버가 준 계정 식별자
 * @returns 연동 행의 external_id
 */
export function externalId(server: string, accountId: string): string {
  return `${server}:${accountId}`;
}

/**
 * Mastodon 연동 행과 Vault 비밀. 커넥터는 서버와 이야기하고, 행과 비밀은 여기서 다룬다.
 */
@Injectable()
export class MastodonStore {
  constructor(private readonly supabaseService: SupabaseService) {}

  /**
   * 연동 행을 만들거나 갱신한다. 같은 창작자의 Mastodon 행이 있으면 그 행을 그대로 쓴다.
   *
   * @param profileId 연동의 주인
   * @param server 서버 호스트 이름
   * @param account 서버가 알려 준 계정
   * @param secret Vault 에 둘 자격 증명
   * @param maxCharacters 서버의 글자 한도. 모르면 null
   * @returns 연동 행 id
   * @throws {Error} 저장에 실패한 경우. 다른 창작자에게 묶인 계정이면 메시지에 connection_taken 이 있다
   */
  async save(
    profileId: string,
    server: string,
    account: MastodonAccount,
    secret: MastodonSecret,
    maxCharacters: number | null
  ): Promise<string> {
    const config: MastodonConfig = { server, max_characters: maxCharacters };

    const { data, error } = await this.supabaseService
      .getClient()
      .rpc('upsert_social_connection', {
        p_profile_id: profileId,
        p_channel: MASTODON_CHANNEL,
        p_external_id: externalId(server, account.id),
        p_account_name: `${account.username}@${server}`,
        p_secret: JSON.stringify(secret),
        p_config: config as unknown as Json,
      });

    if (error) {
      throw new Error(error.message);
    }

    return data as string;
  }

  /**
   * 창작자의 기존 Mastodon 연동이 있는 서버. 권한이 끊긴 연동을 다시 이을 때 서버를 다시 묻지 않기 위해 쓴다.
   *
   * @param profileId 창작자 id
   * @returns 서버 호스트 이름. 연동이 없으면 null
   * @throws {Error} 조회에 실패한 경우
   */
  async serverOf(profileId: string): Promise<string | null> {
    const { data, error } = await this.supabaseService
      .getClient()
      .from('social_connections')
      .select('config')
      .eq('profile_id', profileId)
      .eq('channel', MASTODON_CHANNEL)
      .maybeSingle();

    if (error) {
      throw new Error(error.message);
    }

    return (data as { config: MastodonConfig } | null)?.config.server ?? null;
  }

  /**
   * 연동을 끊을 때 서버에 토큰 회수를 요청하는 데 필요한 값.
   *
   * @param externalId 연동 행의 external_id
   * @returns 서버와 접근 토큰. 행이 없으면 null
   * @throws {Error} 조회에 실패한 경우
   */
  async credentials(
    externalId: string
  ): Promise<{ server: string; token: string } | null> {
    const client = this.supabaseService.getClient();

    const { data, error } = await client
      .from('social_connections')
      .select('id, config')
      .eq('channel', MASTODON_CHANNEL)
      .eq('external_id', externalId)
      .maybeSingle();

    if (error) {
      throw new Error(error.message);
    }

    const row = data as { id: string; config: MastodonConfig } | null;
    if (!row) {
      return null;
    }

    const { data: secret, error: secretError } = await client.rpc(
      'read_connection_secret',
      { p_connection_id: row.id }
    );

    if (secretError) {
      throw new Error(secretError.message);
    }

    if (typeof secret !== 'string') {
      return null;
    }

    const { access_token } = JSON.parse(secret) as MastodonSecret;
    return { server: row.config.server, token: access_token };
  }
}
