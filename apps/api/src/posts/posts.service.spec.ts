import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { queryReturning } from '../../test/supabase-query';
import { SupabaseService } from '../supabase/supabase.service';
import { PostsService } from './posts.service';

const AUTHOR = 'author-1';
const OTHER = 'author-2';
const POST_ID = 'post-1';

const postRow = (overrides: Record<string, unknown> = {}) => ({
  id: POST_ID,
  author_id: AUTHOR,
  language: null,
  title: null,
  published_at: null,
  created_at: '2026-09-27T00:00:00Z',
  updated_at: '2026-09-27T00:00:00Z',
  post_segments: [
    { id: 'seg-b', position: 1, body: '둘째' },
    { id: 'seg-a', position: 0, body: '첫째' },
  ],
  ...overrides,
});

describe('PostsService', () => {
  let service: PostsService;
  let from: jest.Mock;
  let rpc: jest.Mock;

  beforeEach(async () => {
    from = jest.fn();
    rpc = jest.fn();

    const module = await Test.createTestingModule({
      providers: [
        PostsService,
        {
          provide: SupabaseService,
          useValue: { getClient: () => ({ from, rpc }) },
        },
      ],
    }).compile();

    service = module.get(PostsService);
  });

  describe('create', () => {
    it('없는 언어와 제목은 null 로 넘기고 조각을 순번 순으로 돌려준다', async () => {
      rpc.mockReturnValue(Promise.resolve({ data: POST_ID, error: null }));
      from.mockReturnValue(queryReturning({ data: postRow(), error: null }));

      const post = await service.create(AUTHOR, {
        segments: ['첫째', '둘째'],
        publish: true,
      });

      expect(rpc).toHaveBeenCalledWith('create_post', {
        p_author_id: AUTHOR,
        p_language: null,
        p_title: null,
        p_segments: ['첫째', '둘째'],
        p_publish: true,
      });
      expect(post.segments).toEqual([
        { id: 'seg-a', body: '첫째' },
        { id: 'seg-b', body: '둘째' },
      ]);
      expect(post).not.toHaveProperty('author_id');
    });
  });

  describe('update', () => {
    const request = { segments: [{ body: '고침' }], publish: false };

    it('글이 없으면 404', async () => {
      from.mockReturnValue(queryReturning({ data: null, error: null }));

      await expect(service.update(AUTHOR, POST_ID, request)).rejects.toThrow(
        NotFoundException
      );
      expect(rpc).not.toHaveBeenCalled();
    });

    it('남의 글이면 403', async () => {
      from.mockReturnValue(
        queryReturning({
          data: { author_id: OTHER, published_at: null },
          error: null,
        })
      );

      await expect(service.update(AUTHOR, POST_ID, request)).rejects.toThrow(
        ForbiddenException
      );
    });

    it('발행된 글이면 409', async () => {
      from.mockReturnValue(
        queryReturning({
          data: { author_id: AUTHOR, published_at: '2026-09-27T00:00:00Z' },
          error: null,
        })
      );

      await expect(service.update(AUTHOR, POST_ID, request)).rejects.toThrow(
        ConflictException
      );
    });

    it('확인 뒤 발행돼 함수가 false 를 돌려주면 409', async () => {
      from.mockReturnValue(
        queryReturning({
          data: { author_id: AUTHOR, published_at: null },
          error: null,
        })
      );
      rpc.mockReturnValue(Promise.resolve({ data: false, error: null }));

      await expect(service.update(AUTHOR, POST_ID, request)).rejects.toThrow(
        ConflictException
      );
    });

    it('내 초안이면 함수를 부르고 바뀐 글을 돌려준다', async () => {
      from
        .mockReturnValueOnce(
          queryReturning({
            data: { author_id: AUTHOR, published_at: null },
            error: null,
          })
        )
        .mockReturnValueOnce(
          queryReturning({ data: postRow({ title: '제목' }), error: null })
        );
      rpc.mockReturnValue(Promise.resolve({ data: true, error: null }));

      const post = await service.update(AUTHOR, POST_ID, {
        ...request,
        title: '제목',
      });

      expect(rpc).toHaveBeenCalledWith('update_post', {
        p_post_id: POST_ID,
        p_author_id: AUTHOR,
        p_language: null,
        p_title: '제목',
        p_segments: request.segments,
        p_publish: false,
      });
      expect(post.title).toBe('제목');
    });
  });

  describe('remove', () => {
    it('발행된 글은 지우지 않는다', async () => {
      const query = queryReturning({
        data: { author_id: AUTHOR, published_at: '2026-09-27T00:00:00Z' },
        error: null,
      });
      from.mockReturnValue(query);

      await expect(service.remove(AUTHOR, POST_ID)).rejects.toThrow(
        ConflictException
      );
      expect(query.delete).not.toHaveBeenCalled();
    });

    it('내 초안이면 지운다', async () => {
      const ownership = queryReturning({
        data: { author_id: AUTHOR, published_at: null },
        error: null,
      });
      const deletion = queryReturning({ data: null, error: null });
      from.mockReturnValueOnce(ownership).mockReturnValueOnce(deletion);

      await service.remove(AUTHOR, POST_ID);

      expect(deletion.delete).toHaveBeenCalled();
      expect(deletion.is).toHaveBeenCalledWith('published_at', null);
    });
  });

  describe('listMine', () => {
    it('내 글만 최근 순으로 읽고 조각을 정렬한다', async () => {
      const query = queryReturning({ data: [postRow()], error: null });
      from.mockReturnValue(query);

      const posts = await service.listMine(AUTHOR);

      expect(query.eq).toHaveBeenCalledWith('author_id', AUTHOR);
      expect(query.order).toHaveBeenCalledWith('created_at', {
        ascending: false,
      });
      expect(posts[0]?.segments.map((segment) => segment.body)).toEqual([
        '첫째',
        '둘째',
      ]);
    });
  });
});
