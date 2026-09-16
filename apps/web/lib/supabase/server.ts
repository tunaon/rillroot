import type { Database } from '@rillroot/supabase';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

/**
 * 서버 컴포넌트와 라우트 핸들러에서 쓰는 클라이언트.
 * 서버 컴포넌트는 쿠키를 쓸 수 없어 setAll이 실패하는데,
 * 토큰 갱신은 proxy가 담당하므로 그 실패는 무시해도 된다.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet) => {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // 서버 컴포넌트에서 호출된 경우. proxy가 이미 갱신했다.
          }
        },
      },
    }
  );
}
