import type { Segment } from '@/components/composer/composer';
import type { Channel } from '@rillroot/shared';

const STORAGE_KEY = 'rillroot:composer-snapshot';

/**
 * 작성 화면이 채널을 연결하러 같은 탭에서 떠나기 전에 보관하는 것.
 * 서버에 초안을 만들지 않고 이 탭의 브라우저 저장소에만 둔다. 돌아갈 경로는 API 가 보관한다.
 *
 * @property {string | null} postId 이어 쓰던 초안의 id. 새 글이면 null
 * @property {Segment[]} segments 조각 목록. 작성 화면의 조각 그대로이며 편집기 상태는 담지 않는다
 * @property {Channel[]} selectedChannels 이 글을 보내기로 켜 둔 채널
 * @property {Channel} connecting 연결하러 간 채널. 돌아온 결과가 이 채널의 것일 때만 받는다
 */
export interface ComposerSnapshot {
  postId: string | null;
  segments: Segment[];
  selectedChannels: Channel[];
  connecting: Channel;
}

/**
 * 떠나기 전에 보관한다. 저장소를 쓸 수 없는 환경이면 조용히 건너뛴다.
 *
 * @param snapshot 보관할 값
 */
export function saveSnapshot(snapshot: ComposerSnapshot): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
  } catch {
    // 저장소가 막힌 환경에서는 복원을 포기한다. 연결 자체는 계속된다.
  }
}

/**
 * 보관한 값을 읽는다.
 *
 * @returns 보관한 값. 없거나 깨졌으면 null
 */
export function loadSnapshot(): ComposerSnapshot | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as ComposerSnapshot) : null;
  } catch {
    return null;
  }
}

/** 보관한 값을 지운다. 복원한 뒤 부른다. */
export function clearSnapshot(): void {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // 지울 것이 없거나 저장소가 막힌 경우다.
  }
}
