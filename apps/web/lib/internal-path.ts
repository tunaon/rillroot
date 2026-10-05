import { INTERNAL_PATH_PATTERN } from '@rillroot/shared';

/**
 * 외부 주소로 보내는 공격을 막기 위해 내부 경로만 허용한다.
 * 규칙은 shared 의 INTERNAL_PATH_PATTERN 이 갖고 API 의 연동 시작 요청도 같은 규칙으로 검사한다.
 * 로그인 복귀와 채널 연동 복귀가 함께 쓴다.
 *
 * @param value 검사할 경로
 * @returns 내부 경로면 그대로, 아니면 루트
 */
export function internalPath(value: string | null | undefined): string {
  return value && INTERNAL_PATH_PATTERN.test(value) ? value : '/';
}
