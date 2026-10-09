import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from '@jest/globals';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { queryReturning } from '../../../test/supabase-query';
import { SupabaseService } from '../../supabase/supabase.service';
import { MastodonApps } from './mastodon.apps';

const SERVER = 'mastodon.example';
const ENV: Record<string, string> = {
  API_PUBLIC_URL: 'http://127.0.0.1:4000',
  CORS_ORIGIN: 'http://localhost:3000',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });

/** 요청 주소의 경로별로 응답을 정한다. 순서대로 소비되는 응답은 배열로 준다. */
function fetchByPath(routes: Record<string, Response | Response[]>) {
  return jest.fn<typeof fetch>((input) => {
    const { pathname } = new URL(String(input));
    const route = routes[pathname];
    const response = Array.isArray(route) ? route.shift() : route;
    if (!response) {
      throw new Error(`unexpected request to ${pathname}`);
    }
    return Promise.resolve(response);
  });
}

describe('MastodonApps', () => {
  let apps: MastodonApps;
  let from: jest.Mock;
  let rpc: jest.Mock;
  const originalFetch = globalThis.fetch;

  beforeEach(async () => {
    from = jest.fn();
    rpc = jest.fn();

    const module = await Test.createTestingModule({
      providers: [
        MastodonApps,
        {
          provide: SupabaseService,
          useValue: { getClient: () => ({ from, rpc }) },
        },
        {
          provide: ConfigService,
          useValue: { getOrThrow: (key: string) => ENV[key] },
        },
      ],
    }).compile();

    apps = module.get(MastodonApps);
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('보관한 앱이 살아 있으면 그대로 쓰고 등록하지 않는다', async () => {
    from.mockReturnValue(
      queryReturning({ data: { id: 'app-1', client_id: 'cid' }, error: null })
    );
    rpc.mockReturnValue(Promise.resolve({ data: 'secret', error: null }));
    const fetchMock = fetchByPath({
      '/oauth/token': json({ access_token: 'app-token' }),
    });
    globalThis.fetch = fetchMock;

    await expect(apps.ensure(SERVER)).resolves.toEqual({
      id: 'app-1',
      clientId: 'cid',
      clientSecret: 'secret',
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(rpc).not.toHaveBeenCalledWith(
      'upsert_channel_app_credential',
      expect.anything()
    );
  });

  it('보관한 앱을 서버가 모르면 지우고 다시 등록한다', async () => {
    const stored = queryReturning({
      data: { id: 'app-1', client_id: 'old' },
      error: null,
    });
    const removal = queryReturning({ data: null, error: null });
    from.mockReturnValueOnce(stored).mockReturnValueOnce(removal);
    rpc
      .mockReturnValueOnce(Promise.resolve({ data: 'old-secret', error: null }))
      .mockReturnValueOnce(Promise.resolve({ data: 'app-2', error: null }));
    globalThis.fetch = fetchByPath({
      '/oauth/token': [
        json({ error: 'invalid_client' }, 401),
        json({ access_token: 'app-token' }),
      ],
      '/api/v1/apps': json({ client_id: 'new', client_secret: 'new-secret' }),
    });

    await expect(apps.ensure(SERVER)).resolves.toEqual({
      id: 'app-2',
      clientId: 'new',
      clientSecret: 'new-secret',
    });

    expect(removal.delete).toHaveBeenCalled();
    expect(removal.eq).toHaveBeenCalledWith('id', 'app-1');
    expect(rpc).toHaveBeenCalledWith(
      'upsert_channel_app_credential',
      expect.objectContaining({
        p_server: SERVER,
        p_client_id: 'new',
        p_secret: 'new-secret',
      })
    );
  });

  it('보관한 앱이 없으면 복귀 주소와 범위로 등록하고 앱 토큰을 받아 둔다', async () => {
    from.mockReturnValue(queryReturning({ data: null, error: null }));
    rpc.mockReturnValue(Promise.resolve({ data: 'app-1', error: null }));
    const fetchMock = fetchByPath({
      '/api/v1/apps': json({ client_id: 'cid', client_secret: 'secret' }),
      '/oauth/token': json({ access_token: 'app-token' }),
    });
    globalThis.fetch = fetchMock;

    await apps.ensure(SERVER);

    const [registerUrl, registerInit] = fetchMock.mock.calls[0]!;
    const body = registerInit?.body as URLSearchParams;
    expect(String(registerUrl)).toBe(`https://${SERVER}/api/v1/apps`);
    expect(body.get('redirect_uris')).toBe(
      'http://127.0.0.1:4000/connections/mastodon/callback'
    );
    expect(body.get('scopes')).toBe('read:accounts write:statuses write:media');
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('서버에 닿지 못하면 상태 없는 오류로 실패한다', async () => {
    from.mockReturnValue(queryReturning({ data: null, error: null }));
    globalThis.fetch = jest
      .fn<typeof fetch>()
      .mockRejectedValue(new TypeError('fetch failed'));

    await expect(apps.ensure(SERVER)).rejects.toMatchObject({
      name: 'OAuthHttpError',
      status: null,
    });
    expect(rpc).not.toHaveBeenCalled();
  });

  it('서버가 등록 자체를 거부하면 저장 없이 실패한다', async () => {
    from.mockReturnValue(queryReturning({ data: null, error: null }));
    globalThis.fetch = fetchByPath({
      '/api/v1/apps': json({ error: 'Too many requests' }, 429),
    });

    await expect(apps.ensure(SERVER)).rejects.toThrow(/429/);
    expect(rpc).not.toHaveBeenCalled();
  });
});
