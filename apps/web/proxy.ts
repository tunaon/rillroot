import { routing } from '@/i18n/routing';
import { DEFAULT_COUNTRY, localeToCountryCode } from '@rillroot/shared';
import type { Database } from '@rillroot/supabase';
import { createServerClient } from '@supabase/ssr';
import createMiddleware from 'next-intl/middleware';
import { NextRequest, NextResponse } from 'next/server';
import { DEFAULT_LOCALE } from './i18n/locales';

const intlMiddleware = createMiddleware(routing);

export const config = {
  // Match all pathnames except for
  // - … if they start with `/api`, `/trpc`, `/_next` or `/_vercel`
  // - … the ones containing a dot (e.g. `favicon.ico`)
  matcher: '/((?!api|trpc|_next|_vercel|.*\\..*).*)',
};

async function proxy(request: NextRequest) {
  const response = intlMiddleware(request);

  await refreshSession(request, response);

  response.headers.set('x-current-path', request.nextUrl.pathname);
  response.headers.set('user-agent', request.headers.get('user-agent') || '');
  response.headers.set(
    'x-forwarded-for',
    request.headers.get('x-forwarded-for') || ''
  );

  // Country code from Vercel geo headers
  const country =
    request.headers.get('x-vercel-ip-country') ||
    localeToCountryCode(DEFAULT_LOCALE) ||
    DEFAULT_COUNTRY;
  console.info('[LOG] Country Info 🎿', country);
  response.cookies.set('user-country', country, {
    httpOnly: false, // Client-side JavaScript needs to read this cookie
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24, // 24 hours
  });

  return response;
}

/**
 * 만료된 access token을 갱신한다. 서버 컴포넌트는 쿠키를 쓸 수 없으므로
 * 갱신은 이 지점에서만 일어난다. 갱신된 쿠키를 요청에 반영해야 이번 렌더가
 * 새 토큰을 읽고, 응답에 반영해야 브라우저가 옛 토큰을 버린다.
 */
async function refreshSession(request: NextRequest, response: NextResponse) {
  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value);
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  // 만료됐으면 이 호출이 갱신을 일으킨다.
  // getSession은 서명을 검증하지 않으므로 서버에서 쓰지 않는다.
  const auth = await supabase.auth.getClaims();

  return auth;
}

export default proxy;
