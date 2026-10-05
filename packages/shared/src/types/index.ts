export type Theme = 'system' | 'light' | 'dark';

/**
 * API가 응답에 담는 사용자 프로필. 접속 기록(국가·로그인 수단)은 통계용이라 담지 않는다.
 *
 * web과 api 양쪽이 이 타입을 쓴다. supabase의 Row에서 파생시키지 않는 이유는
 * shared가 supabase 패키지에 의존하게 되고, dev 스크립트가 shared만 다시 빌드하기 때문이다.
 * 대신 api의 toProfile이 실제 Row를 이 모양으로 옮기며 어긋남을 컴파일 시점에 드러낸다.
 */
export interface Profile {
  id: string;
  handle: string;
  display_name: string;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

/** 조각. 본문은 평문이다. 식별자는 순서를 바꿔도 유지된다. */
export interface PostSegment {
  id: string;
  body: string;
}

/**
 * API가 응답에 담는 게시글. published_at 이 비어 있으면 초안이다.
 * language 는 창작자가 선언했을 때만 값이 있다.
 * Profile 과 같은 이유로 supabase Row 에서 파생시키지 않는다.
 */
export interface Post {
  id: string;
  language: string | null;
  title: string | null;
  published_at: string | null;
  created_at: string;
  updated_at: string;
  segments: PostSegment[];
}

/** 새 글. 기존 조각이 없으므로 본문만 순서대로 보낸다. */
export interface CreatePostRequest {
  language?: string;
  title?: string;
  segments: string[];
  publish: boolean;
}

/** 초안 수정에 보내는 조각. 식별자가 있으면 그 조각을 고치고, 없으면 새 조각이다. */
export interface PostSegmentInput {
  id?: string;
  body: string;
}

/** 초안 수정. 목록에서 빠진 조각은 지워진다. */
export interface UpdatePostRequest {
  language?: string;
  title?: string;
  segments: PostSegmentInput[];
  publish: boolean;
}

/** 배포 채널의 키. DB 의 social_connections.channel 과 같은 값이다. */
export type Channel = 'bluesky' | 'mastodon' | 'linkedin' | 'wordpress';

/**
 * API가 응답에 담는 외부 계정 연동. 자격 증명과 연동 설정은 담지 않는다.
 * invalidated_at 이 있으면 권한이 끊긴 것이라 재연동이 필요하다.
 */
export interface Connection {
  id: string;
  channel: Channel;
  external_id: string;
  account_name: string;
  expires_at: string | null;
  invalidated_at: string | null;
  created_at: string;
}

/**
 * 연동 시작 요청.
 *
 * @property {string} [return_to] 연동이 끝난 뒤 돌아갈 내부 경로. API 가 인가 상태에 함께 보관했다가
 *   완료할 때 돌려준다. 실패해도 돌려준다.
 */
export interface AuthorizeConnectionRequest {
  return_to?: string;
}

/** 연동 시작 응답. 같은 탭을 이 주소로 보낸다. */
export interface AuthorizeConnectionResponse {
  url: string;
}

/** 연동 완료 요청. 채널이 복귀 주소에 붙여 보낸 값을 그대로 넘긴다. */
export interface CompleteConnectionRequest {
  code?: string;
  state: string;
  iss?: string;
  error?: string;
  error_description?: string;
}

/**
 * 연동 완료 응답.
 *
 * @property {Connection} connection 만들어지거나 갱신된 연동
 * @property {string | null} return_to 연동을 시작할 때 준 돌아갈 경로. 주지 않았으면 null
 */
export interface CompleteConnectionResponse {
  connection: Connection;
  return_to: string | null;
}
