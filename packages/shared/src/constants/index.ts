import type { Channel, CompleteConnectionRequest } from '../types';

/** 앱 이름 */
export const APP_NAME = 'rillroot' as const;

/** 기본 페이지네이션 */
export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

/** 접속 국가를 알 수 없을 때 쓰는 기본값. 영어권 국가 중 하나를 정한 값이다. */
export const DEFAULT_COUNTRY = 'US' as const;

/**
 * 게시글 한 건에 담을 수 있는 조각 수와 조각 하나의 길이.
 * 채널 한도가 아니라 남용을 막는 플랫폼 상한이다. 채널 한도는 채널 선언이 따로 갖는다.
 */
export const MAX_POST_SEGMENTS = 25;
export const MAX_SEGMENT_LENGTH = 10_000;

/** 제목 길이 상한. 제목을 요구하는 채널에만 쓰인다. */
export const MAX_TITLE_LENGTH = 300;

/** 작성 언어의 형식. DB 제약과 같은 BCP 47 모양만 검사한다. */
export const LANGUAGE_PATTERN = /^[a-z]{2,3}(-[A-Za-z0-9]{2,8})*$/;

/**
 * 내부 경로의 형식. 슬래시 하나로 시작하고, 브라우저가 다른 호스트로 해석하는 `//`·`/\` 로는 시작하지 않는다.
 * 로그인과 채널 연동이 돌아갈 경로를 받을 때 API 와 웹이 같은 규칙으로 검사해 외부 주소로 보내는 공격을 막는다.
 */
export const INTERNAL_PATH_PATTERN = /^\/(?![/\\])/;

/**
 * 서버 호스트 이름의 형식. 소문자 라벨을 점으로 이은 이름만 받고, 점이 하나는 있어야 하며, 끝 라벨은 글자로 시작한다.
 * 서버마다 계정이 나뉘는 채널의 서버 주소를 받을 때 API 와 웹, DB 제약이 같은 규칙으로 검사한다.
 * API 가 이 주소로 요청을 보내므로 점 없는 내부 이름과 숫자로 끝나는 IP 주소는 여기서 걸러진다.
 */
export const HOSTNAME_PATTERN =
  /^([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]([a-z0-9-]{0,61}[a-z0-9])?$/;

/**
 * 배포 채널 선언. 연동이 구현된 채널만 available 이다.
 * needsServer 는 서버마다 계정이 나뉘어 연동을 시작할 때 서버 주소를 받아야 하는 채널이다.
 * 한도·본문 형식·요구 사항 같은 배포 능력은 배포 단계에서 이 선언에 붙는다.
 */
export const CHANNELS = [
  { key: 'bluesky', name: 'Bluesky', available: true, needsServer: false },
  { key: 'mastodon', name: 'Mastodon', available: true, needsServer: true },
  { key: 'linkedin', name: 'LinkedIn', available: false, needsServer: false },
  {
    key: 'wordpress',
    name: 'WordPress',
    available: false,
    needsServer: false,
  },
] as const satisfies readonly {
  key: Channel;
  name: string;
  available: boolean;
  needsServer: boolean;
}[];

/**
 * API 가 창작자에게 보일 실패에 붙이는 코드. 문구는 웹의 i18n 이 갖고 API 는 코드만 낸다.
 * 코드가 없는 실패는 웹이 일반 문구로 보인다.
 */
export const API_ERROR_CODES = [
  'server_required',
  'server_unreachable',
  'channel_unavailable',
  'post_already_published',
] as const;

export type ApiErrorCode = (typeof API_ERROR_CODES)[number];

/**
 * 채널이 복귀 주소에 붙여 보내는 OAuth 응답 값. 모든 OAuth 채널에 공통이다.
 * code·state·error·error_description 은 RFC 6749, iss 는 RFC 9207 에서 정한다.
 * API 복귀 경로는 이 값만 웹으로 넘기고, 웹 복귀 라우트는 이 값만 읽어 완료를 부른다.
 * 연동 완료 요청의 필드 이름과 같아야 하므로 그 타입의 키로 묶는다.
 */
export const OAUTH_CALLBACK_PARAMS = [
  'code',
  'state',
  'iss',
  'error',
  'error_description',
] as const satisfies readonly (keyof CompleteConnectionRequest)[];
