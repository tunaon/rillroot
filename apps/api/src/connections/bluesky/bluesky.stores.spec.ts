import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from '@jest/globals';
import { Test } from '@nestjs/testing';
import type {
  NodeSavedSession,
  NodeSavedState,
} from '@atproto/oauth-client-node';
import { queryReturning } from '../../../test/supabase-query';
import { SupabaseService } from '../../supabase/supabase.service';
import { ConnectionAttempts } from '../attempts';
import { ConnectionContext } from '../connection-context';
import { BlueskyStores } from './bluesky.stores';

const PROFILE = 'profile-1';
const DID = 'did:plc:alice';
const CONNECTION_ID = 'conn-1';

const state: NodeSavedState = {
  iss: 'https://bsky.social',
  authMethod: { method: 'none' },
  verifier: 'verifier',
  dpopJwk: { kty: 'EC', crv: 'P-256', x: 'x', y: 'y', d: 'd' },
};

const session: NodeSavedSession = {
  authMethod: { method: 'none' },
  tokenSet: {
    iss: 'https://bsky.social',
    sub: DID,
    aud: 'https://pds.example',
    scope: 'atproto',
    access_token: 'access',
    refresh_token: 'refresh',
    token_type: 'DPoP',
  },
  dpopJwk: { kty: 'EC', crv: 'P-256', x: 'x', y: 'y', d: 'd' },
};

describe('BlueskyStores', () => {
  let stores: BlueskyStores;
  let context: ConnectionContext;
  let from: jest.Mock;
  let rpc: jest.Mock;
  const originalFetch = globalThis.fetch;

  beforeEach(async () => {
    from = jest.fn();
    rpc = jest.fn();

    const module = await Test.createTestingModule({
      providers: [
        BlueskyStores,
        ConnectionAttempts,
        ConnectionContext,
        {
          provide: SupabaseService,
          useValue: { getClient: () => ({ from, rpc }) },
        },
      ],
    }).compile();

    stores = module.get(BlueskyStores);
    context = module.get(ConnectionContext);
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  describe('stateStore', () => {
    it('컨텍스트의 사용자로 시도를 남기고 만료된 시도를 먼저 지운다', async () => {
      const cleanup = queryReturning({ data: null, error: null });
      const insert = queryReturning({ data: null, error: null });
      from.mockReturnValueOnce(cleanup).mockReturnValueOnce(insert);

      await context.run(PROFILE, async () =>
        stores.stateStore.set('s1', state)
      );

      expect(cleanup.delete).toHaveBeenCalled();
      expect(cleanup.lt).toHaveBeenCalledWith('expires_at', expect.any(String));
      expect(insert.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          state: 's1',
          profile_id: PROFILE,
          channel: 'bluesky',
          payload: state,
        })
      );
    });

    it('컨텍스트가 없으면 시도를 남기지 않는다', async () => {
      await expect(stores.stateStore.set('s1', state)).rejects.toThrow(
        /context/
      );
      expect(from).not.toHaveBeenCalled();
    });

    it('만료되지 않은 시도의 값을 읽고, 없으면 undefined', async () => {
      const query = queryReturning({ data: { payload: state }, error: null });
      from.mockReturnValue(query);

      await expect(stores.stateStore.get('s1')).resolves.toEqual(state);
      expect(query.gt).toHaveBeenCalledWith('expires_at', expect.any(String));

      from.mockReturnValue(queryReturning({ data: null, error: null }));
      await expect(stores.stateStore.get('s2')).resolves.toBeUndefined();
    });
  });

  describe('sessionStore', () => {
    it('컨텍스트가 있으면 행을 만들거나 갱신하고 그 id 를 컨텍스트에 남긴다', async () => {
      globalThis.fetch = jest
        .fn<typeof fetch>()
        .mockResolvedValue(
          new Response(JSON.stringify({ handle: 'alice.bsky.social' }))
        );
      rpc.mockReturnValue(
        Promise.resolve({ data: CONNECTION_ID, error: null })
      );

      const id = await context.run(PROFILE, async () => {
        await stores.sessionStore.set(DID, session);
        return context.current()?.connectionId;
      });

      expect(id).toBe(CONNECTION_ID);
      expect(rpc).toHaveBeenCalledWith('upsert_social_connection', {
        p_profile_id: PROFILE,
        p_channel: 'bluesky',
        p_external_id: DID,
        p_account_name: 'alice.bsky.social',
        p_secret: JSON.stringify(session),
      });
    });

    it('핸들 조회가 실패하면 DID 를 표시 이름으로 쓴다', async () => {
      globalThis.fetch = jest
        .fn<typeof fetch>()
        .mockRejectedValue(new Error('down'));
      rpc.mockReturnValue(
        Promise.resolve({ data: CONNECTION_ID, error: null })
      );

      await context.run(PROFILE, async () =>
        stores.sessionStore.set(DID, session)
      );

      expect(rpc).toHaveBeenCalledWith(
        'upsert_social_connection',
        expect.objectContaining({ p_account_name: DID })
      );
    });

    it('컨텍스트가 없으면 갱신이라 비밀만 바꾼다', async () => {
      from.mockReturnValue(
        queryReturning({ data: { id: CONNECTION_ID }, error: null })
      );
      rpc.mockReturnValue(Promise.resolve({ data: true, error: null }));

      await stores.sessionStore.set(DID, session);

      expect(rpc).toHaveBeenCalledWith('update_connection_secret', {
        p_connection_id: CONNECTION_ID,
        p_secret: JSON.stringify(session),
      });
    });

    it('갱신인데 행이 없으면 던진다', async () => {
      from.mockReturnValue(queryReturning({ data: null, error: null }));

      await expect(stores.sessionStore.set(DID, session)).rejects.toThrow(
        /no connection/
      );
      expect(rpc).not.toHaveBeenCalled();
    });

    it('정상 행이면 비밀을 풀어 돌려준다', async () => {
      from.mockReturnValue(
        queryReturning({
          data: { id: CONNECTION_ID, invalidated_at: null },
          error: null,
        })
      );
      rpc.mockReturnValue(
        Promise.resolve({ data: JSON.stringify(session), error: null })
      );

      await expect(stores.sessionStore.get(DID)).resolves.toEqual(session);
      expect(rpc).toHaveBeenCalledWith('read_connection_secret', {
        p_connection_id: CONNECTION_ID,
      });
    });

    it('권한이 끊긴 행은 없는 것으로 다룬다', async () => {
      from.mockReturnValue(
        queryReturning({
          data: { id: CONNECTION_ID, invalidated_at: '2026-09-30T00:00:00Z' },
          error: null,
        })
      );

      await expect(stores.sessionStore.get(DID)).resolves.toBeUndefined();
      expect(rpc).not.toHaveBeenCalled();
    });

    it('컨텍스트가 있으면 그 사용자의 행만 읽는다', async () => {
      const query = queryReturning({ data: null, error: null });
      from.mockReturnValue(query);

      await context.run(PROFILE, async () => stores.sessionStore.get(DID));

      expect(query.eq).toHaveBeenCalledWith('profile_id', PROFILE);
    });

    it('버릴 때는 행을 지우지 않고 권한이 끊긴 것으로 표시한다', async () => {
      from.mockReturnValue(
        queryReturning({ data: { id: CONNECTION_ID }, error: null })
      );
      rpc.mockReturnValue(Promise.resolve({ data: true, error: null }));

      await stores.sessionStore.del(DID);

      expect(rpc).toHaveBeenCalledWith('mark_connection_invalid', {
        p_connection_id: CONNECTION_ID,
      });
    });

    it('컨텍스트가 있으면 그 사용자의 행만 표시한다', async () => {
      const query = queryReturning({
        data: { id: CONNECTION_ID },
        error: null,
      });
      from.mockReturnValue(query);
      rpc.mockReturnValue(Promise.resolve({ data: true, error: null }));

      await context.run(PROFILE, async () => stores.sessionStore.del(DID));

      expect(query.eq).toHaveBeenCalledWith('profile_id', PROFILE);
      expect(rpc).toHaveBeenCalledWith('mark_connection_invalid', {
        p_connection_id: CONNECTION_ID,
        p_profile_id: PROFILE,
      });
    });
  });
});
