import { Toaster } from '@rillroot/ui/components/sonner';

import { getCurrentProfile } from '@/lib/auth';
import AuthContextProvider from '@/providers/auth-context';
import NextIntlContext from '@/providers/next-intl-context';
import ThemeContext from '@/providers/theme-context';

// 1. NextIntl (i18n)
// 2. Theme (dark/light mode)
// 3. QueryClient (React Query)
// 4. Landing (optional global UI state)

export default async function RootContext({
  children,
}: React.PropsWithChildren) {
  // 레이아웃에서 한 번만 요청한다. 사이트 안에서 페이지를 옮겨도 다시 렌더되지 않는다.
  const profile = await getCurrentProfile();

  return (
    <NextIntlContext>
      <ThemeContext
        attribute="class"
        defaultTheme="system"
        enableSystem
        disableTransitionOnChange
      >
        <AuthContextProvider profile={profile}>{children}</AuthContextProvider>
        <Toaster />
      </ThemeContext>
    </NextIntlContext>
  );
}
