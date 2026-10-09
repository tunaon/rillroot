import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from '@jest/globals';
import { BadRequestException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { createHash } from 'node:crypto';
import { ConnectionAttempts } from '../attempts';
import { OAuthHttpError } from '../oauth2';
import { MastodonApps } from './mastodon.apps';
import { MastodonConnector } from './mastodon.connector';
import { MastodonStore } from './mastodon.store';

const PROFILE = 'profile-1';
const SERVER = 'mastodon.example';
const RETURN_TO = '/ko?tab=drafts';
const APP = { id: 'app-1', clientId: 'cid', clientSecret: 'secret' };
const REDIRECT_URI = 'http://127.0.0.1:4000/connections/mastodon/callback';
const ATTEMPT = { server: SERVER, verifier: 'verifier', return_to: RETURN_TO };

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });

function fetchByPath(routes: Record<string, Response>) {
  return jest.fn<typeof fetch>((input) => {
    const { pathname } = new URL(String(input));
    const response = routes[pathname];
    if (!response) {
      throw new Error(`unexpected request to ${pathname}`);
    }
    return Promise.resolve(response);
  });
}

describe('MastodonConnector', () => {
  let connector: MastodonConnector;
  let apps: { ensure: jest.Mock; find: jest.Mock; redirectUri: string };
  let store: { save: jest.Mock; credentials: jest.Mock; serverOf: jest.Mock };
  let attempts: { create: jest.Mock; read: jest.Mock; delete: jest.Mock };
  const originalFetch = globalThis.fetch;

  beforeEach(async () => {
    apps = { ensure: jest.fn(), find: jest.fn(), redirectUri: REDIRECT_URI };
    store = { save: jest.fn(), credentials: jest.fn(), serverOf: jest.fn() };
    attempts = { create: jest.fn(), read: jest.fn(), delete: jest.fn() };

    const module = await Test.createTestingModule({
      providers: [
        MastodonConnector,
        { provide: MastodonApps, useValue: apps },
        { provide: MastodonStore, useValue: store },
        { provide: ConnectionAttempts, useValue: attempts },
      ],
    }).compile();

    connector = module.get(MastodonConnector);
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  describe('authorize', () => {
    it('서버를 받지 않았고 기존 연동도 없으면 시작하지 않는다', async () => {
      store.serverOf.mockReturnValue(Promise.resolve(null));

      await expect(
        connector.authorize(PROFILE, { return_to: RETURN_TO })
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(apps.ensure).not.toHaveBeenCalled();
    });

    it('서버에 닿지 못하거나 Mastodon 이 아니면 400 으로 알린다', async () => {
      apps.ensure.mockReturnValue(
        Promise.reject(
          new OAuthHttpError(
            null,
            null,
            new URL(`https://${SERVER}/api/v1/apps`)
          )
        )
      );

      await expect(
        connector.authorize(PROFILE, { server: SERVER })
      ).rejects.toMatchObject({
        status: 400,
        response: { code: 'server_unreachable' },
      });
      expect(attempts.create).not.toHaveBeenCalled();
    });

    it('서버를 받지 않았으면 기존 연동의 서버로 다시 잇는다', async () => {
      store.serverOf.mockReturnValue(Promise.resolve(SERVER));
      apps.ensure.mockReturnValue(Promise.resolve(APP));
      attempts.create.mockReturnValue(Promise.resolve());

      const url = await connector.authorize(PROFILE, { return_to: RETURN_TO });

      expect(store.serverOf).toHaveBeenCalledWith(PROFILE);
      expect(apps.ensure).toHaveBeenCalledWith(SERVER);
      expect(url.origin).toBe(`https://${SERVER}`);
    });

    it('앱을 확보하고 시도를 남긴 뒤 PKCE 가 실린 동의 화면 주소를 만든다', async () => {
      apps.ensure.mockReturnValue(Promise.resolve(APP));
      attempts.create.mockReturnValue(Promise.resolve());

      const url = await connector.authorize(PROFILE, {
        return_to: RETURN_TO,
        server: SERVER,
      });

      expect(apps.ensure).toHaveBeenCalledWith(SERVER);
      const [state, profileId, channel, payload] = attempts.create.mock
        .calls[0] as [
        string,
        string,
        string,
        { server: string; verifier: string; return_to: string | null },
      ];
      expect(profileId).toBe(PROFILE);
      expect(channel).toBe('mastodon');
      expect(payload).toEqual({
        server: SERVER,
        verifier: expect.any(String),
        return_to: RETURN_TO,
      });

      expect(url.origin).toBe(`https://${SERVER}`);
      expect(url.pathname).toBe('/oauth/authorize');
      expect(url.searchParams.get('response_type')).toBe('code');
      expect(url.searchParams.get('client_id')).toBe(APP.clientId);
      expect(url.searchParams.get('redirect_uri')).toBe(REDIRECT_URI);
      expect(url.searchParams.get('scope')).toBe(
        'read:accounts write:statuses write:media'
      );
      expect(url.searchParams.get('state')).toBe(state);
      expect(url.searchParams.get('code_challenge_method')).toBe('S256');
      expect(url.searchParams.get('code_challenge')).toBe(
        createHash('sha256').update(payload.verifier).digest('base64url')
      );
    });
  });

  describe('complete', () => {
    it('시도를 모르면 돌아갈 경로 없이 실패한다', async () => {
      attempts.read.mockReturnValue(Promise.resolve(undefined));

      await expect(
        connector.complete(PROFILE, { state: 'nope', code: 'c' })
      ).rejects.toMatchObject({
        name: 'ConnectionFailedError',
        returnTo: null,
      });
      expect(attempts.delete).not.toHaveBeenCalled();
    });

    it('창작자가 거부했으면 시도를 버리고 돌아갈 경로를 실어 실패한다', async () => {
      attempts.read.mockReturnValue(Promise.resolve(ATTEMPT));
      attempts.delete.mockReturnValue(Promise.resolve());
      const fetchMock = fetchByPath({});
      globalThis.fetch = fetchMock;

      await expect(
        connector.complete(PROFILE, {
          state: 's1',
          error: 'access_denied',
          error_description: 'denied',
        })
      ).rejects.toMatchObject({
        name: 'ConnectionFailedError',
        message: 'denied',
        returnTo: RETURN_TO,
      });

      expect(attempts.delete).toHaveBeenCalledWith('s1');
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('코드를 토큰으로 바꾸고 계정과 한도를 읽어 행을 저장한다', async () => {
      attempts.read.mockReturnValue(Promise.resolve(ATTEMPT));
      attempts.delete.mockReturnValue(Promise.resolve());
      apps.find.mockReturnValue(Promise.resolve(APP));
      store.save.mockReturnValue(Promise.resolve('conn-1'));
      const fetchMock = fetchByPath({
        '/oauth/token': json({
          access_token: 'user-token',
          scope: 'read:accounts write:statuses write:media',
        }),
        '/api/v1/accounts/verify_credentials': json({
          id: '42',
          username: 'alice',
        }),
        '/api/v2/instance': json({
          configuration: { statuses: { max_characters: 500 } },
        }),
      });
      globalThis.fetch = fetchMock;

      await expect(
        connector.complete(PROFILE, { state: 's1', code: 'code-1' })
      ).resolves.toEqual({ connectionId: 'conn-1', returnTo: RETURN_TO });

      const [, tokenInit] = fetchMock.mock.calls[0]!;
      const body = tokenInit?.body as URLSearchParams;
      expect(body.get('grant_type')).toBe('authorization_code');
      expect(body.get('code')).toBe('code-1');
      expect(body.get('code_verifier')).toBe(ATTEMPT.verifier);
      expect(body.get('redirect_uri')).toBe(REDIRECT_URI);

      expect(store.save).toHaveBeenCalledWith(
        PROFILE,
        SERVER,
        { id: '42', username: 'alice' },
        {
          access_token: 'user-token',
          scope: 'read:accounts write:statuses write:media',
        },
        500
      );
    });

    it('한도를 읽지 못해도 연동은 끝낸다', async () => {
      attempts.read.mockReturnValue(Promise.resolve(ATTEMPT));
      attempts.delete.mockReturnValue(Promise.resolve());
      apps.find.mockReturnValue(Promise.resolve(APP));
      store.save.mockReturnValue(Promise.resolve('conn-1'));
      globalThis.fetch = fetchByPath({
        '/oauth/token': json({ access_token: 't', scope: 's' }),
        '/api/v1/accounts/verify_credentials': json({
          id: '42',
          username: 'alice',
        }),
        '/api/v2/instance': json({ error: 'gone' }, 404),
      });

      await connector.complete(PROFILE, { state: 's1', code: 'code-1' });

      expect(store.save).toHaveBeenLastCalledWith(
        PROFILE,
        SERVER,
        expect.anything(),
        expect.anything(),
        null
      );
    });

    it('저장이 실패하면 받은 토큰을 서버에서 회수하고 사유를 그대로 올린다', async () => {
      attempts.read.mockReturnValue(Promise.resolve(ATTEMPT));
      attempts.delete.mockReturnValue(Promise.resolve());
      apps.find.mockReturnValue(Promise.resolve(APP));
      store.save.mockReturnValue(Promise.reject(new Error('connection_taken')));
      const fetchMock = fetchByPath({
        '/oauth/token': json({ access_token: 'user-token', scope: 's' }),
        '/api/v1/accounts/verify_credentials': json({
          id: '42',
          username: 'alice',
        }),
        '/api/v2/instance': json({}),
        '/oauth/revoke': json({}),
      });
      globalThis.fetch = fetchMock;

      await expect(
        connector.complete(PROFILE, { state: 's1', code: 'code-1' })
      ).rejects.toMatchObject({
        name: 'ConnectionFailedError',
        message: 'connection_taken',
        returnTo: RETURN_TO,
      });

      const revoke = fetchMock.mock.calls.find(([input]) =>
        String(input).endsWith('/oauth/revoke')
      );
      expect((revoke?.[1]?.body as URLSearchParams).get('token')).toBe(
        'user-token'
      );
    });
  });

  describe('revoke', () => {
    it('행과 앱이 있으면 서버에 토큰 회수를 요청한다', async () => {
      store.credentials.mockReturnValue(
        Promise.resolve({ server: SERVER, token: 'user-token' })
      );
      apps.find.mockReturnValue(Promise.resolve(APP));
      const fetchMock = fetchByPath({ '/oauth/revoke': json({}) });
      globalThis.fetch = fetchMock;

      await connector.revoke(`${SERVER}:42`);

      const body = fetchMock.mock.calls[0]![1]?.body as URLSearchParams;
      expect(body.get('client_id')).toBe(APP.clientId);
      expect(body.get('client_secret')).toBe(APP.clientSecret);
      expect(body.get('token')).toBe('user-token');
    });

    it('행이 없으면 아무것도 하지 않는다', async () => {
      store.credentials.mockReturnValue(Promise.resolve(null));
      const fetchMock = fetchByPath({});
      globalThis.fetch = fetchMock;

      await connector.revoke(`${SERVER}:42`);

      expect(apps.find).not.toHaveBeenCalled();
      expect(fetchMock).not.toHaveBeenCalled();
    });
  });
});
