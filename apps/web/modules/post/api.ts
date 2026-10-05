import { type RequestConfig, http } from '@/modules/network/config';
import type {
  CreatePostRequest,
  Post,
  UpdatePostRequest,
} from '@rillroot/shared';

export const postApi = {
  /** 게시글과 조각을 저장한다. publish 가 false 면 초안이다. */
  create: (body: CreatePostRequest, config?: RequestConfig) =>
    http.post<Post>('/posts', body, config),

  /** 내 글 목록. 초안과 발행글을 모두 담는다. */
  mine: (config?: RequestConfig) =>
    http.get<Post[]>('/posts/mine', { cache: 'no-store', ...config }),

  /** 초안을 통째로 바꾼다. 발행된 글은 API가 거부한다. */
  update: (id: string, body: UpdatePostRequest, config?: RequestConfig) =>
    http.put<Post>(`/posts/${id}`, body, config),

  /** 초안을 지운다. */
  remove: (id: string, config?: RequestConfig) =>
    http.delete<void>(`/posts/${id}`, config),
};
