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
