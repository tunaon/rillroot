import { type RequestConfig, http } from '@/modules/network/config';
import type {
  AuthorizeConnectionRequest,
  AuthorizeConnectionResponse,
  Channel,
  CompleteConnectionRequest,
  CompleteConnectionResponse,
  Connection,
} from '@rillroot/shared';

export const connectionApi = {
  /** 내 연동 목록. 재연동이 필요한 것도 담긴다. 토큰은 오지 않는다. */
  mine: (config?: RequestConfig) =>
    http.get<Connection[]>('/connections', { cache: 'no-store', ...config }),

  /** 연동을 시작한다. 돌려받은 주소로 같은 탭을 보낸다. 돌아갈 경로는 API 가 보관한다. */
  authorize: (
    channel: Channel,
    body: AuthorizeConnectionRequest,
    config?: RequestConfig
  ) =>
    http.post<AuthorizeConnectionResponse>(
      `/connections/${channel}/authorize`,
      body,
      config
    ),

  /**
   * 채널이 복귀 주소에 붙인 값을 그대로 넘겨 연동을 끝낸다. 웹 복귀 라우트가 서버에서 부른다.
   * 실패 응답의 본문에도 돌아갈 경로(return_to)가 실린다.
   */
  complete: (
    channel: Channel,
    body: CompleteConnectionRequest,
    config?: RequestConfig
  ) =>
    http.post<CompleteConnectionResponse>(
      `/connections/${channel}/complete`,
      body,
      config
    ),

  /** 연동을 끊는다. 화면은 마이페이지가 생길 때 붙는다. */
  remove: (id: string, config?: RequestConfig) =>
    http.delete<void>(`/connections/${id}`, config),
};
