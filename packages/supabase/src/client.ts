import { createBrowserClient as createSsrBrowserClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';

import type { Database } from './database.types';

/**
 * 브라우저용 클라이언트. publishable key를 사용하며, 세션을 쿠키에 저장해
 * 서버 컴포넌트에서도 같은 세션을 읽을 수 있다.
 */
export function createBrowserClient(
  supabaseUrl: string,
  publishableKey: string
) {
  return createSsrBrowserClient<Database>(supabaseUrl, publishableKey);
}

/**
 * 서버 전용 관리자 클라이언트. secret key는 RLS를 우회하므로
 * 브라우저로 전달되는 경로에 두지 않는다.
 */
export function createAdminClient(supabaseUrl: string, secretKey: string) {
  return createClient<Database>(supabaseUrl, secretKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
