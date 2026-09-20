import { type RequestConfig, http } from '@/modules/network/config';

export interface HealthResponse {
  status: string;
  app: string;
  supabase: string;
  timestamp: string;
}

export const healthApi = {
  /** API와 DB의 연결 상태. 공개 경로라 토큰을 따로 다루지 않는다. */
  check: (config?: RequestConfig) =>
    http.get<HealthResponse>('/health', { cache: 'no-store', ...config }),
};
