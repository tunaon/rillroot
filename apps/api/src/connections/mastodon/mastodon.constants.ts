import type { Channel } from '@rillroot/shared';

/** 이 채널의 키. social_connections.channel, channel_app_credentials.channel, 커넥터 선택에 같이 쓰인다. */
export const MASTODON_CHANNEL = 'mastodon' satisfies Channel;

/**
 * 앱 등록과 동의 요청에 같은 값을 쓴다. 등록 때 적은 범위가 그 서버에서의 상한이고 바꿀 수 없어,
 * 계정 조회와 게시물 수명주기(쓰기·수정·삭제)와 미디어를 처음부터 넣는다.
 * 계정 조회는 모든 서버 버전이 받는 이름을 쓴다. 새 버전에만 있는 이름은 구버전 서버가 등록을 거부한다.
 */
export const MASTODON_SCOPES = 'read:accounts write:statuses write:media';

/** 서버에 등록하는 앱 이름. 창작자의 동의 화면과 게시물의 출처에 표시된다. */
export const MASTODON_APP_NAME = 'Rillroot';
