import {
  ConflictException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import type {
  ApiErrorBody,
  CreatePostRequest,
  Post,
  UpdatePostRequest,
} from '@rillroot/shared';
import type { Database } from '@rillroot/supabase';
import { SupabaseService } from '../supabase/supabase.service';

type PostRow = Database['public']['Tables']['posts']['Row'];
type SegmentRow = Database['public']['Tables']['post_segments']['Row'];

/** 게시글과 조각을 한 번에 읽은 행. 조각은 순번 순으로 정렬해 쓴다. */
type PostWithSegmentsRow = PostRow & {
  post_segments: Pick<SegmentRow, 'id' | 'position' | 'body'>[];
};

const SELECT_COLUMNS =
  'id, author_id, language, title, published_at, created_at, updated_at, post_segments (id, position, body)' as const;

@Injectable()
export class PostsService {
  constructor(private readonly supabaseService: SupabaseService) {}

  /**
   * 게시글과 조각을 한 트랜잭션으로 저장한다.
   *
   * @param authorId 검증된 토큰에서 얻은 사용자 id
   * @param request 저장할 글
   * @returns 저장된 글
   * @throws {InternalServerErrorException} 저장이나 조회에 실패한 경우
   */
  async create(authorId: string, request: CreatePostRequest): Promise<Post> {
    const { data, error } = await this.supabaseService
      .getClient()
      .rpc('create_post', {
        p_author_id: authorId,
        p_language: request.language ?? null,
        p_title: request.title ?? null,
        p_segments: request.segments,
        p_publish: request.publish,
      });

    if (error) {
      throw new InternalServerErrorException(error.message);
    }

    return this.findOne(data as string);
  }

  /**
   * 내 글 목록을 최근 순으로 읽는다. 초안과 발행글을 모두 담는다.
   *
   * @param authorId 사용자 id
   * @returns 글 목록
   * @throws {InternalServerErrorException} 조회에 실패한 경우
   */
  async listMine(authorId: string): Promise<Post[]> {
    const { data, error } = await this.supabaseService
      .getClient()
      .from('posts')
      .select(SELECT_COLUMNS)
      .eq('author_id', authorId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new InternalServerErrorException(error.message);
    }

    return (data as PostWithSegmentsRow[]).map(toPost);
  }

  /**
   * 초안을 통째로 바꾼다. 작성자 본인의 초안만 대상이다.
   *
   * @param authorId 사용자 id
   * @param postId 글 id
   * @param request 초안을 대체할 내용
   * @returns 바뀐 글
   * @throws {NotFoundException} 글이 없는 경우
   * @throws {ForbiddenException} 다른 사람의 글인 경우
   * @throws {ConflictException} 이미 발행된 글인 경우
   */
  async update(
    authorId: string,
    postId: string,
    request: UpdatePostRequest
  ): Promise<Post> {
    await this.assertOwnDraft(authorId, postId);

    const { data, error } = await this.supabaseService
      .getClient()
      .rpc('update_post', {
        p_post_id: postId,
        p_author_id: authorId,
        p_language: request.language ?? null,
        p_title: request.title ?? null,
        p_segments: request.segments,
        p_publish: request.publish,
      });

    if (error) {
      throw new InternalServerErrorException(error.message);
    }

    // 확인과 저장 사이에 발행된 경우다. 함수가 초안만 고치므로 여기서 걸린다.
    if (data !== true) {
      throw new ConflictException({
        code: 'post_already_published',
        message: 'post is already published',
      } satisfies ApiErrorBody);
    }

    return this.findOne(postId);
  }

  /**
   * 초안을 지운다. 조각은 함께 지워진다.
   *
   * @param authorId 사용자 id
   * @param postId 글 id
   * @throws {NotFoundException} 글이 없는 경우
   * @throws {ForbiddenException} 다른 사람의 글인 경우
   * @throws {ConflictException} 이미 발행된 글인 경우
   */
  async remove(authorId: string, postId: string): Promise<void> {
    await this.assertOwnDraft(authorId, postId);

    const { error } = await this.supabaseService
      .getClient()
      .from('posts')
      .delete()
      .eq('id', postId)
      .eq('author_id', authorId)
      .is('published_at', null);

    if (error) {
      throw new InternalServerErrorException(error.message);
    }
  }

  /**
   * 글이 있는지, 내 것인지, 아직 초안인지를 순서대로 확인한다.
   * 세 경우를 다른 상태 코드로 돌려주기 위해 저장 전에 한 번 읽는다.
   */
  private async assertOwnDraft(
    authorId: string,
    postId: string
  ): Promise<void> {
    const { data, error } = await this.supabaseService
      .getClient()
      .from('posts')
      .select('author_id, published_at')
      .eq('id', postId)
      .maybeSingle();

    if (error) {
      throw new InternalServerErrorException(error.message);
    }

    const row = data as Pick<PostRow, 'author_id' | 'published_at'> | null;

    if (!row) {
      throw new NotFoundException();
    }

    if (row.author_id !== authorId) {
      throw new ForbiddenException();
    }

    if (row.published_at !== null) {
      throw new ConflictException({
        code: 'post_already_published',
        message: 'post is already published',
      } satisfies ApiErrorBody);
    }
  }

  private async findOne(postId: string): Promise<Post> {
    const { data, error } = await this.supabaseService
      .getClient()
      .from('posts')
      .select(SELECT_COLUMNS)
      .eq('id', postId)
      .single();

    if (error) {
      throw new InternalServerErrorException(error.message);
    }

    return toPost(data as PostWithSegmentsRow);
  }
}

/** 응답에 담을 값만 고르고 조각을 순번 순으로 정렬한다. */
function toPost(row: PostWithSegmentsRow): Post {
  const { id, language, title, published_at, created_at, updated_at } = row;

  const segments = [...row.post_segments]
    .sort((a, b) => a.position - b.position)
    .map(({ id: segmentId, body }) => ({ id: segmentId, body }));

  return {
    id,
    language,
    title,
    published_at,
    created_at,
    updated_at,
    segments,
  };
}
