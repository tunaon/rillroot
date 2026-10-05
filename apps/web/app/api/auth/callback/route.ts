import { internalPath } from '@/lib/internal-path';
import { createClient } from '@/lib/supabase/server';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

/**
 * Google 로그인 복귀 지점. Supabase가 붙여 보낸 인가 코드를 세션으로 교환하고
 * 원래 보던 경로로 돌려보낸다.
 */
export async function GET(request: NextRequest) {
  const { origin, searchParams } = request.nextUrl;
  const next = internalPath(searchParams.get('next'));
  const code = searchParams.get('code');

  if (!code) {
    return NextResponse.redirect(`${origin}${next}`);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    console.error('[auth] code exchange failed', error.message);
    return NextResponse.redirect(`${origin}/`);
  }

  return NextResponse.redirect(`${origin}${next}`);
}
