import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { queryReturning } from '../../test/supabase-query';
import { SupabaseService } from '../supabase/supabase.service';
import { ConnectionsService } from './connections.service';
import {
  CHANNEL_CONNECTORS,
  CONNECTION_TAKEN,
  type ChannelConnector,
  ConnectionFailedError,
} from './connector';

const PROFILE = 'profile-1';
const OTHER = 'profile-2';
const CONNECTION_ID = 'conn-1';
const STATE = 'state-1';
const RETURN_TO = '/ko';

/**
 * 거부된 약속의 오류를 꺼낸다. 오류 본문까지 확인하려고 쓴다.
 *
 * @param promise 거부될 것으로 기대하는 약속
 * @returns 거부 사유. 이행되면 실패로 던진다
 */
const rejectionOf = (promise: Promise<unknown>) =>
  promise.then(
    () => {
      throw new Error('expected a rejection');
    },
    (error: unknown) => error
  );

const connectionRow = (overrides: Record<string, unknown> = {}) => ({
  id: CONNECTION_ID,
  channel: 'bluesky',
  external_id: 'did:plc:alice',
  account_name: 'alice.bsky.social',
  expires_at: null,
  invalidated_at: null,
  created_at: '2026-09-30T00:00:00Z',
  ...overrides,
});

describe('ConnectionsService', () => {
  let service: ConnectionsService;
  let from: jest.Mock;
  let connector: jest.Mocked<ChannelConnector>;

  beforeEach(async () => {
    from = jest.fn();
    connector = {
      channel: 'bluesky',
      authorize: jest.fn<ChannelConnector['authorize']>(),
      complete: jest.fn<ChannelConnector['complete']>(),
      revoke: jest.fn<ChannelConnector['revoke']>(),
    };

    const module = await Test.createTestingModule({
      providers: [
        ConnectionsService,
        { provide: SupabaseService, useValue: { getClient: () => ({ from }) } },
        { provide: CHANNEL_CONNECTORS, useValue: [connector] },
      ],
    }).compile();

    service = module.get(ConnectionsService);
  });

  describe('listMine', () => {
    it('응답 컬럼만 담아 돌려준다', async () => {
      from.mockReturnValue(
        queryReturning({ data: [connectionRow()], error: null })
      );

      const list = await service.listMine(PROFILE);

      expect(from).toHaveBeenCalledWith('social_connections');
      expect(list).toEqual([connectionRow()]);
      expect(list[0]).not.toHaveProperty('secret_id');
    });
  });

  describe('authorize', () => {
    it('열린 채널이면 돌아갈 경로를 넘기고 커넥터의 주소를 돌려준다', async () => {
      connector.authorize.mockResolvedValue(
        new URL('https://bsky.social/oauth/authorize?x=1')
      );

      await expect(
        service.authorize(PROFILE, 'bluesky', { return_to: RETURN_TO })
      ).resolves.toEqual({ url: 'https://bsky.social/oauth/authorize?x=1' });
      expect(connector.authorize).toHaveBeenCalledWith(PROFILE, RETURN_TO);
    });

    it('돌아갈 경로가 없으면 null 로 넘긴다', async () => {
      connector.authorize.mockResolvedValue(
        new URL('https://bsky.social/oauth/authorize')
      );

      await service.authorize(PROFILE, 'bluesky', {});

      expect(connector.authorize).toHaveBeenCalledWith(PROFILE, null);
    });

    it('선언되지 않았거나 아직 열리지 않은 채널은 404', async () => {
      await expect(service.authorize(PROFILE, 'mastodon', {})).rejects.toThrow(
        NotFoundException
      );
      await expect(service.authorize(PROFILE, 'nope', {})).rejects.toThrow(
        NotFoundException
      );
      expect(connector.authorize).not.toHaveBeenCalled();
    });
  });

  describe('complete', () => {
    const params = { state: STATE, code: 'code', iss: 'https://bsky.social' };
    const attempt = (profile_id: string, channel = 'bluesky') =>
      queryReturning({ data: { profile_id, channel }, error: null });

    it('시도가 없거나 만료되었으면 400 이고 교환하지 않는다', async () => {
      from.mockReturnValue(queryReturning({ data: null, error: null }));

      await expect(
        service.complete(PROFILE, 'bluesky', params)
      ).rejects.toThrow(BadRequestException);
      expect(connector.complete).not.toHaveBeenCalled();
    });

    it('다른 사용자가 시작한 시도면 403 이고 교환하지 않는다', async () => {
      from.mockReturnValue(attempt(OTHER));

      await expect(
        service.complete(PROFILE, 'bluesky', params)
      ).rejects.toThrow(ForbiddenException);
      expect(connector.complete).not.toHaveBeenCalled();
    });

    it('다른 채널의 시도면 400', async () => {
      from.mockReturnValue(attempt(PROFILE, 'mastodon'));

      await expect(
        service.complete(PROFILE, 'bluesky', params)
      ).rejects.toThrow(BadRequestException);
      expect(connector.complete).not.toHaveBeenCalled();
    });

    it('시작한 사용자면 교환하고 연동과 돌아갈 경로를 돌려준다', async () => {
      from
        .mockReturnValueOnce(attempt(PROFILE))
        .mockReturnValueOnce(
          queryReturning({ data: connectionRow(), error: null })
        );
      connector.complete.mockResolvedValue({
        connectionId: CONNECTION_ID,
        returnTo: RETURN_TO,
      });

      await expect(
        service.complete(PROFILE, 'bluesky', params)
      ).resolves.toEqual({ connection: connectionRow(), return_to: RETURN_TO });
      expect(connector.complete).toHaveBeenCalledWith(PROFILE, params);
    });

    it('계정이 다른 사용자에게 묶여 있으면 409 이고 돌아갈 경로를 싣는다', async () => {
      from.mockReturnValue(attempt(PROFILE));
      connector.complete.mockRejectedValue(
        new ConnectionFailedError('Failed to store session', RETURN_TO, {
          cause: new AggregateError([new Error(CONNECTION_TAKEN)]),
        })
      );

      const error = await rejectionOf(
        service.complete(PROFILE, 'bluesky', params)
      );

      expect(error).toBeInstanceOf(ConflictException);
      expect((error as ConflictException).getResponse()).toEqual({
        message: 'account is linked to another profile',
        return_to: RETURN_TO,
      });
    });

    it('채널이 거부하면 400 이고 돌아갈 경로를 싣는다', async () => {
      from.mockReturnValue(attempt(PROFILE));
      connector.complete.mockRejectedValue(
        new ConnectionFailedError('access denied', RETURN_TO)
      );

      const error = await rejectionOf(
        service.complete(PROFILE, 'bluesky', params)
      );

      expect(error).toBeInstanceOf(BadRequestException);
      expect((error as BadRequestException).getResponse()).toEqual({
        message: 'access denied',
        return_to: RETURN_TO,
      });
    });

    it('커넥터가 정한 실패가 아니면 돌아갈 경로 없이 400', async () => {
      from.mockReturnValue(attempt(PROFILE));
      connector.complete.mockRejectedValue(new Error('unexpected'));

      const error = await rejectionOf(
        service.complete(PROFILE, 'bluesky', params)
      );

      expect(error).toBeInstanceOf(BadRequestException);
      expect((error as BadRequestException).getResponse()).toEqual({
        message: 'unexpected',
        return_to: null,
      });
    });
  });

  describe('remove', () => {
    const owned = () =>
      queryReturning({
        data: {
          profile_id: PROFILE,
          channel: 'bluesky',
          external_id: 'did:plc:alice',
        },
        error: null,
      });

    it('행이 없으면 404', async () => {
      from.mockReturnValue(queryReturning({ data: null, error: null }));

      await expect(service.remove(PROFILE, CONNECTION_ID)).rejects.toThrow(
        NotFoundException
      );
    });

    it('다른 사람의 연동이면 403 이고 취소도 삭제도 하지 않는다', async () => {
      from.mockReturnValue(
        queryReturning({
          data: {
            profile_id: OTHER,
            channel: 'bluesky',
            external_id: 'did:plc:alice',
          },
          error: null,
        })
      );

      await expect(service.remove(PROFILE, CONNECTION_ID)).rejects.toThrow(
        ForbiddenException
      );
      expect(connector.revoke).not.toHaveBeenCalled();
      expect(from).toHaveBeenCalledTimes(1);
    });

    it('채널 쪽 취소 뒤 행을 지운다', async () => {
      const deletion = queryReturning({ data: null, error: null });
      from.mockReturnValueOnce(owned()).mockReturnValueOnce(deletion);
      connector.revoke.mockResolvedValue();

      await service.remove(PROFILE, CONNECTION_ID);

      expect(connector.revoke).toHaveBeenCalledWith('did:plc:alice');
      expect(deletion.delete).toHaveBeenCalled();
      expect(deletion.eq).toHaveBeenCalledWith('profile_id', PROFILE);
    });

    it('채널 쪽 취소가 실패해도 행은 지운다', async () => {
      const deletion = queryReturning({ data: null, error: null });
      from.mockReturnValueOnce(owned()).mockReturnValueOnce(deletion);
      connector.revoke.mockRejectedValue(new Error('network'));

      await expect(
        service.remove(PROFILE, CONNECTION_ID)
      ).resolves.toBeUndefined();
      expect(deletion.delete).toHaveBeenCalled();
    });
  });
});
