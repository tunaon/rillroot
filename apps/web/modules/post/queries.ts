import { postApi } from '@/modules/post/api';
import { queryOptions } from '@tanstack/react-query';

export const postKeys = {
  all: ['posts'] as const,
  mine: () => [...postKeys.all, 'mine'] as const,
};

/** 내 글 목록. 저장·발행 뒤에는 postKeys.all 을 무효화해 함께 갱신한다. */
export const myPostsQueryOptions = queryOptions({
  queryKey: postKeys.mine(),
  queryFn: ({ signal }) => postApi.mine({ signal }),
});
