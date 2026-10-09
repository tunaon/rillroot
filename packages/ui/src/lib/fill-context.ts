import { createContext, useContext } from 'react';

/**
 * 지금 영역의 높이를 컨테이너가 정하는지. 화면 높이로 열린 시트처럼 안쪽이 그 높이를 채워야 하는
 * 모달이 true 로 제공하고, 안쪽 레이아웃(드릴다운)이 읽어 채울지 내용 높이로 둘지를 정한다.
 * 제공하는 곳이 없으면 내용 높이다.
 */
export const FillContext = createContext(false);

/**
 * @returns 지금 영역의 높이를 컨테이너가 정하는지
 */
export function useFill(): boolean {
  return useContext(FillContext);
}
