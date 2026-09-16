import { createBrowserClient } from '@rillroot/supabase';

/** 브라우저에서 쓰는 클라이언트. 세션을 쿠키에 저장한다. */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
  );
}
