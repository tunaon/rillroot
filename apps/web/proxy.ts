import { DEFAULT_LOCALE } from '@/i18n/locales';
import { routing } from '@/i18n/routing';
import createMiddleware from 'next-intl/middleware';
import { NextRequest } from 'next/server';

const intlMiddleware = createMiddleware(routing);

export const config = {
  // Match all pathnames except for
  // - … if they start with `/api`, `/trpc`, `/_next` or `/_vercel`
  // - … the ones containing a dot (e.g. `favicon.ico`)
  matcher: '/((?!api|trpc|_next|_vercel|.*\\..*).*)',
};

function proxy(request: NextRequest) {
  const response = intlMiddleware(request);

  response.headers.set('x-current-path', request.nextUrl.pathname);
  response.headers.set('user-agent', request.headers.get('user-agent') || '');
  response.headers.set(
    'x-forwarded-for',
    request.headers.get('x-forwarded-for') || ''
  );

  // Country code from Vercel geo headers
  const country = request.headers.get('x-vercel-ip-country') || DEFAULT_LOCALE;
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

export default proxy;
