import type { Channel } from '@rillroot/shared';

/** 이 채널의 키. social_connections.channel 과 커넥터 선택에 같이 쓰인다. */
export const BLUESKY_CHANNEL = 'bluesky' satisfies Channel;

/**
 * 요청하는 권한. 게시글 생성만이다.
 * 미디어가 생기면 blob 권한을 더하는데, 그때는 창작자가 다시 동의해야 한다.
 */
export const BLUESKY_SCOPE = 'atproto repo:app.bsky.feed.post?action=create';
